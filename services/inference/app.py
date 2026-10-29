"""Angelite inference service (spike).

Three Modal pieces:
  - Kokoro:  preset-voice TTS on CPU (tests whether a free CPU host is viable)
  - Cloner:  zero-shot voice cloning with Chatterbox on GPU ("turbo" = English, "multilingual" = 23 languages)
  - api:     small FastAPI router. Checks the bearer token, converts audio formats with ffmpeg,
             and reports timing headers so bench.py can measure speed and cost.

Deploy:  uvx modal deploy app.py
"""

import hmac
import io
import os
import re
import subprocess
import tempfile
import time
import wave

import modal

APP_NAME = "angelite-inference"
SECRET_NAME = "angelite-spike"  # holds SPIKE_TOKEN (required) and HF_TOKEN (optional)

# Voice cloning needs a GPU, and Modal only runs GPU functions once the account has a payment method.
# Default "none" deploys preset voices only (CPU). Enable cloning with e.g.  ANGELITE_GPU=T4 uvx modal deploy app.py
GPU = os.environ.get("ANGELITE_GPU", "none")
CLONING_ENABLED = GPU.lower() != "none"
SCALEDOWN_SECONDS = 30  # keep containers warm briefly; idle time is billed (a cold start takes ~15 s)

MAX_TEXT_CHARS = 5000  # spoken characters per request; the web app enforces its own per-plan limits (1,000 Free, 3,000 Pro)
MAX_SCRIPT_CHARS = 10000  # including [pause …] markup
MAX_REFERENCE_SECONDS = 20
MIN_REFERENCE_SECONDS = 3
SAMPLE_RATE = 24000  # Kokoro and Chatterbox both output 24 kHz

# Script markup: "Hello [pause 1.5s] world". Mirrors apps/web/src/lib/script.ts.
MAX_PAUSE_SECONDS = 5.0
PAUSE_RE = re.compile(r"\[pause\s+(\d+(?:\.\d+)?)\s*(ms|s)?\]", re.IGNORECASE)

# Post-processing presets (ffmpeg -af). Mirrors EFFECTS in apps/web/src/lib/script.ts.
EFFECTS = {
    "none": None,
    "room": "aecho=0.8:0.7:20|37:0.25|0.18",
    "hall": "aecho=0.8:0.88:60|110|170|240:0.35|0.28|0.2|0.12",
    "echo": "aecho=0.8:0.8:300:0.4",
    "telephone": "highpass=f=300,lowpass=f=3400,acompressor=threshold=0.1:ratio=4:makeup=2",
    "radio": "highpass=f=180,lowpass=f=6000,acompressor=threshold=0.1:ratio=6:makeup=3,acrusher=bits=12:mix=0.3",
}

KOKORO_VOICES = [
    "af_heart", "af_bella", "af_nicole", "af_sky",
    "am_adam", "am_michael",
    "bf_emma", "bf_isabella",
    "bm_george", "bm_lewis",
]

app = modal.App(APP_NAME)
secret = modal.Secret.from_name(SECRET_NAME)


# ---------------------------------------------------------------------------
# Images. Model weights are baked in at build time so cold starts skip downloads.
# ANGELITE_GPU is baked into every image so containers define the same functions as the deploy.
# ---------------------------------------------------------------------------

def _download_kokoro():
    from kokoro import KPipeline

    for lang in ("a", "b"):
        pipeline = KPipeline(lang_code=lang)
        for voice in KOKORO_VOICES:
            if voice[0] == lang:
                pipeline.load_voice(voice)


def _download_chatterbox():
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    from chatterbox.tts_turbo import ChatterboxTurboTTS

    ChatterboxTurboTTS.from_pretrained(device="cpu")
    ChatterboxMultilingualTTS.from_pretrained(device="cpu", t3_model="v3")


kokoro_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("espeak-ng")
    .pip_install("torch", index_url="https://download.pytorch.org/whl/cpu")
    .pip_install("kokoro>=0.9.4", "soundfile", "numpy")
    .run_commands("python -m spacy download en_core_web_sm")
    .run_function(_download_kokoro)
    .env({"ANGELITE_GPU": GPU})
)

clone_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg")
    # Multilingual V3 (t3_model="v3") isn't in the PyPI release (0.1.7) yet, so pin a GitHub commit.
    .pip_install(
        "chatterbox-tts @ git+https://github.com/resemble-ai/chatterbox@5de7a54aa4e5e2baadb0182dde554908b48b85c2",
        "numpy",
    )
    .run_function(_download_chatterbox, secrets=[secret])
    .env({"ANGELITE_GPU": GPU})
)

api_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("fastapi[standard]", "python-multipart", "numpy")
    .env({"ANGELITE_GPU": GPU})
)


def _segments(text: str) -> list[tuple[str, str | float]]:
    """Splits "Hello [pause 1s] world" into [("text", "Hello"), ("pause", 1.0), ("text", "world")]."""
    parts: list[tuple[str, str | float]] = []
    last = 0
    for match in PAUSE_RE.finditer(text):
        if chunk := text[last:match.start()].strip():
            parts.append(("text", chunk))
        seconds = float(match.group(1)) / (1000 if (match.group(2) or "s").lower() == "ms" else 1)
        parts.append(("pause", min(seconds, MAX_PAUSE_SECONDS)))
        last = match.end()
    if chunk := text[last:].strip():
        parts.append(("text", chunk))
    return parts


def _render(text: str, sample_rate: int, speak):
    """Runs `speak(chunk) -> float array` on each text segment and joins them with the requested silences."""
    import numpy as np

    pieces = []
    for kind, value in _segments(text):
        if kind == "pause":
            pieces.append(np.zeros(int(value * sample_rate), dtype=np.float32))
        else:
            pieces.append(np.asarray(speak(value), dtype=np.float32).reshape(-1))
    return np.concatenate(pieces) if pieces else np.zeros(0, dtype=np.float32)


def _to_int16(audio) -> bytes:
    import numpy as np

    audio = np.clip(np.asarray(audio, dtype=np.float32), -1.0, 1.0)
    return (audio * 32767).astype(np.int16).tobytes()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

@app.cls(image=kokoro_image, cpu=2.0, memory=2048, scaledown_window=SCALEDOWN_SECONDS, timeout=300)
class Kokoro:
    @modal.enter()
    def load(self):
        import torch
        from kokoro import KPipeline

        torch.set_num_threads(2)
        self.pipelines = {lang: KPipeline(lang_code=lang) for lang in ("a", "b")}

    @modal.method()
    def synthesize(self, text: str, voice: str, speed: float) -> dict:
        import numpy as np

        start = time.perf_counter()
        pipeline = self.pipelines[voice[0]]  # voice prefix "a…"/"b…" picks US/UK English

        def speak(chunk: str):
            pieces = [
                audio.numpy() if hasattr(audio, "numpy") else audio
                for _, _, audio in pipeline(chunk, voice=voice, speed=speed, split_pattern=r"\n+")
                if audio is not None
            ]
            return np.concatenate(pieces) if pieces else np.zeros(0, dtype=np.float32)

        pcm = _render(text, SAMPLE_RATE, speak)
        return {
            "pcm": _to_int16(pcm),
            "sr": SAMPLE_RATE,
            "gen_ms": round((time.perf_counter() - start) * 1000),
        }


class Cloner:
    variant: str = modal.parameter(default="turbo")

    @modal.enter()
    def load(self):
        if self.variant == "multilingual":
            from chatterbox.mtl_tts import ChatterboxMultilingualTTS

            self.model = ChatterboxMultilingualTTS.from_pretrained(device="cuda", t3_model="v3")
        else:
            from chatterbox.tts_turbo import ChatterboxTurboTTS

            self.model = ChatterboxTurboTTS.from_pretrained(device="cuda")

    @modal.method()
    def synthesize(self, text: str, reference_wav: bytes, language: str) -> dict:
        start = time.perf_counter()
        with tempfile.NamedTemporaryFile(suffix=".wav") as ref:
            ref.write(reference_wav)
            ref.flush()

            def speak(chunk: str):
                if self.variant == "multilingual":
                    wav = self.model.generate(chunk, language_id=language, audio_prompt_path=ref.name)
                else:
                    wav = self.model.generate(chunk, audio_prompt_path=ref.name)
                return wav.squeeze(0).cpu().numpy()

            pcm = _render(text, self.model.sr, speak)
        return {
            "pcm": _to_int16(pcm),
            "sr": self.model.sr,
            "gen_ms": round((time.perf_counter() - start) * 1000),
        }


# Only registered (and its image only built) when a GPU is configured.
if CLONING_ENABLED:
    Cloner = app.cls(image=clone_image, gpu=GPU, scaledown_window=SCALEDOWN_SECONDS, timeout=600, secrets=[secret])(Cloner)


# ---------------------------------------------------------------------------
# Audio helpers (run in the API container, so the GPU never waits on encoding)
# ---------------------------------------------------------------------------

def _ffmpeg(args: list[str], data: bytes) -> bytes:
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", *args],
        input=data,
        capture_output=True,
    )
    if result.returncode != 0:
        raise ValueError(result.stderr.decode(errors="replace").strip() or "ffmpeg failed")
    return result.stdout


def _wav_bytes(pcm: bytes, sr: int) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)
    return buf.getvalue()


AUDIO_FORMATS = {
    "mp3": ("audio/mpeg", ["-c:a", "libmp3lame", "-b:a", "128k", "-f", "mp3"]),
    "opus": ("audio/ogg", ["-c:a", "libopus", "-b:a", "64k", "-f", "ogg"]),
    "wav": ("audio/wav", None),
}


def _encode(pcm: bytes, sr: int, fmt: str, effect: str = "none") -> tuple[bytes, str]:
    media_type, codec_args = AUDIO_FORMATS[fmt]
    audio_filter = EFFECTS.get(effect)
    if codec_args is None and audio_filter is None:
        return _wav_bytes(pcm, sr), media_type
    raw_input = ["-f", "s16le", "-ar", str(sr), "-ac", "1", "-i", "pipe:0"]
    filter_args = ["-af", audio_filter] if audio_filter else []
    output_args = codec_args or ["-c:a", "pcm_s16le", "-f", "wav"]
    return _ffmpeg([*raw_input, *filter_args, *output_args, "pipe:1"], pcm), media_type


def _normalize_reference(data: bytes) -> tuple[bytes, float]:
    """Any browser/phone recording (webm, m4a, mp3, wav) -> mono 24 kHz WAV, trimmed."""
    pcm = _ffmpeg(
        ["-i", "pipe:0", "-t", str(MAX_REFERENCE_SECONDS), "-ac", "1", "-ar", str(SAMPLE_RATE),
         "-f", "s16le", "pipe:1"],
        data,
    )
    return _wav_bytes(pcm, SAMPLE_RATE), len(pcm) / 2 / SAMPLE_RATE


# ---------------------------------------------------------------------------
# HTTP API
# ---------------------------------------------------------------------------

@app.function(image=api_image, secrets=[secret], scaledown_window=SCALEDOWN_SECONDS)
@modal.concurrent(max_inputs=20)
@modal.asgi_app()
def api():
    from typing import Literal

    from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
    from fastapi.responses import Response
    from pydantic import BaseModel, Field

    web = FastAPI(title="Angelite inference (spike)")
    expected_token = os.environ["SPIKE_TOKEN"]

    def require_token(authorization: str = Header(default="")):
        supplied = authorization.removeprefix("Bearer ").strip()
        if not hmac.compare_digest(supplied, expected_token):
            raise HTTPException(status_code=401, detail="Invalid or missing token")

    def audio_response(result: dict, fmt: str, model: str, started: float, effect: str = "none") -> Response:
        body, media_type = _encode(result["pcm"], result["sr"], fmt, effect)
        audio_seconds = len(result["pcm"]) / 2 / result["sr"]
        return Response(
            content=body,
            media_type=media_type,
            headers={
                "X-Model": model,
                "X-Gen-Ms": str(result["gen_ms"]),
                "X-Total-Ms": str(round((time.perf_counter() - started) * 1000)),
                "X-Audio-Seconds": f"{audio_seconds:.2f}",
                "X-RTF": f"{result['gen_ms'] / 1000 / audio_seconds:.3f}" if audio_seconds else "0",
            },
        )

    EffectName = Literal["none", "room", "hall", "echo", "telephone", "radio"]

    def check_script(text: str) -> str:
        spoken = PAUSE_RE.sub("", text).strip()
        if not spoken:
            raise HTTPException(status_code=400, detail="Text has nothing to say")
        if len(spoken) > MAX_TEXT_CHARS:
            raise HTTPException(status_code=400, detail=f"Text is limited to {MAX_TEXT_CHARS} characters")
        return text

    class TTSRequest(BaseModel):
        text: str = Field(min_length=1, max_length=MAX_SCRIPT_CHARS)
        voice: str = "af_heart"
        speed: float = Field(default=1.0, ge=0.5, le=2.0)
        format: Literal["mp3", "opus", "wav"] = "mp3"
        effect: EffectName = "none"

    @web.get("/health")
    def health():
        return {"ok": True, "gpu": GPU, "cloning": CLONING_ENABLED}

    @web.get("/v1/voices", dependencies=[Depends(require_token)])
    def voices():
        return {
            "preset": KOKORO_VOICES,
            "clone_models": ["turbo", "multilingual"] if CLONING_ENABLED else [],
            "effects": list(EFFECTS),
        }

    @web.post("/v1/tts", dependencies=[Depends(require_token)])
    async def tts(req: TTSRequest):
        if req.voice not in KOKORO_VOICES:
            raise HTTPException(status_code=400, detail=f"Unknown voice '{req.voice}'")
        check_script(req.text)
        started = time.perf_counter()
        result = await Kokoro().synthesize.remote.aio(req.text, req.voice, req.speed)
        return audio_response(result, req.format, "kokoro-82m", started, req.effect)

    @web.post("/v1/clone", dependencies=[Depends(require_token)])
    async def clone(
        text: str = Form(min_length=1, max_length=MAX_SCRIPT_CHARS),
        reference: UploadFile = File(...),
        model: Literal["turbo", "multilingual"] = Form("turbo"),
        language: str = Form("en"),
        format: Literal["mp3", "opus", "wav"] = Form("mp3"),
        effect: EffectName = Form("none"),
    ):
        if not CLONING_ENABLED:
            raise HTTPException(status_code=503, detail="Voice cloning is not enabled on this server")
        check_script(text)
        try:
            reference_wav, seconds = _normalize_reference(await reference.read())
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Could not read reference audio: {exc}")
        if seconds < MIN_REFERENCE_SECONDS:
            raise HTTPException(
                status_code=400,
                detail=f"Reference audio is {seconds:.1f}s; need at least {MIN_REFERENCE_SECONDS}s",
            )
        started = time.perf_counter()
        result = await Cloner(variant=model).synthesize.remote.aio(text, reference_wav, language)
        return audio_response(result, format, f"chatterbox-{model}", started, effect)

    return web
