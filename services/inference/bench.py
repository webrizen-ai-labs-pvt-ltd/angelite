# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx>=0.27"]
# ///
"""Benchmark the deployed inference service: speed, cold starts and cost per minute of audio.

Usage:
  uv run bench.py --url https://<you>--angelite-inference-api.modal.run --ref my_voice.wav

Reads the token from --token or the ANGELITE_TOKEN environment variable.
Writes every generated clip to ./out so you can listen and judge quality.
"""

import argparse
import os
import time
from pathlib import Path

import httpx

SHORT = "Hello! This is Angelite, an open source voice generator."
MEDIUM = (
    "Angelite turns text into natural speech in seconds. "
    "You can pick a preset voice, or clone your own from a short recording. "
    "Everything runs on open source models, and the audio downloads as MP3, Opus or WAV. "
    "This paragraph is long enough to measure how speed holds up on real-world input."
)
SPANISH = "Hola, esta es una prueba de clonación de voz en español con Angelite."

# Rough Modal list prices in USD per hour; check modal.com/pricing and override with flags.
DEFAULT_GPU_RATE = {"T4": 0.59, "L4": 0.80, "A10G": 1.10, "L40S": 1.95, "A100": 2.10}
DEFAULT_CPU_RATE = 0.12  # 2 vCPU + 2 GiB container, approximate


def run_case(client, name, method, path, rate, out_dir, **kwargs):
    started = time.perf_counter()
    resp = client.request(method, path, **kwargs)
    wall_ms = (time.perf_counter() - started) * 1000
    if resp.status_code != 200:
        print(f"{name:<28} FAILED {resp.status_code}: {resp.text[:200]}")
        return None

    ext = {"audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav"}.get(
        resp.headers.get("content-type", "").split(";")[0], "bin"
    )
    (out_dir / f"{name}.{ext}").write_bytes(resp.content)

    gen_s = int(resp.headers["X-Gen-Ms"]) / 1000
    audio_s = float(resp.headers["X-Audio-Seconds"])
    rtf = gen_s / audio_s if audio_s else 0
    # Only counts generation time; idle warm time and cold starts are extra.
    cost_per_min = rtf * 60 * rate / 3600
    row = {
        "name": name,
        "wall_s": wall_ms / 1000,
        "gen_s": gen_s,
        "audio_s": audio_s,
        "rtf": rtf,
        "cost_per_min": cost_per_min,
        "kb": len(resp.content) / 1024,
    }
    print(
        f"{name:<28} wall {row['wall_s']:6.2f}s  gen {gen_s:6.2f}s  audio {audio_s:6.2f}s  "
        f"RTF {rtf:5.3f}  ~${cost_per_min:.5f}/audio-min  {row['kb']:7.1f} KB"
    )
    return row


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True, help="Modal URL of the api function")
    parser.add_argument("--token", default=os.environ.get("ANGELITE_TOKEN"))
    parser.add_argument("--ref", type=Path, help="10-20s recording of YOUR voice, for cloning tests")
    parser.add_argument("--runs", type=int, default=3, help="Runs per case; run 1 usually includes a cold start")
    parser.add_argument("--gpu", default="T4", help="GPU the service was deployed with")
    parser.add_argument("--gpu-rate", type=float, help="USD/hour for the GPU (overrides the default table)")
    parser.add_argument("--cpu-rate", type=float, default=DEFAULT_CPU_RATE)
    parser.add_argument("--skip-multilingual", action="store_true")
    args = parser.parse_args()

    if not args.token:
        parser.error("Pass --token or set ANGELITE_TOKEN")
    gpu_rate = args.gpu_rate or DEFAULT_GPU_RATE.get(args.gpu.upper(), 0.80)

    out_dir = Path(__file__).parent / "out"
    out_dir.mkdir(exist_ok=True)
    client = httpx.Client(
        base_url=args.url.rstrip("/"),
        headers={"Authorization": f"Bearer {args.token}"},
        timeout=httpx.Timeout(600),
    )

    print(f"Health: {client.get('/health').json()}\n")
    rows = []

    print("== Kokoro (preset voices, CPU) ==")
    for i in range(1, args.runs + 1):
        for label, text in (("short", SHORT), ("medium", MEDIUM)):
            rows.append(run_case(
                client, f"kokoro-{label}-run{i}", "POST", "/v1/tts", args.cpu_rate, out_dir,
                json={"text": text, "voice": "af_heart", "format": "mp3"},
            ))

    if args.ref:
        reference = args.ref.read_bytes()
        cases = [("turbo", "en", SHORT, "short"), ("turbo", "en", MEDIUM, "medium")]
        if not args.skip_multilingual:
            cases += [("multilingual", "en", MEDIUM, "medium"), ("multilingual", "es", SPANISH, "es")]
        print(f"\n== Chatterbox cloning ({args.gpu}) ==")
        for i in range(1, args.runs + 1):
            for model, lang, text, label in cases:
                rows.append(run_case(
                    client, f"clone-{model}-{label}-run{i}", "POST", "/v1/clone", gpu_rate, out_dir,
                    data={"text": text, "model": model, "language": lang, "format": "mp3"},
                    files={"reference": (args.ref.name, reference)},
                ))
    else:
        print("\n(No --ref given, skipping cloning tests.)")

    warm = [r for r in rows if r and not r["name"].endswith("run1")]
    if warm:
        print("\n== Warm averages (excluding run 1) ==")
        for prefix in sorted({r["name"].rsplit("-run", 1)[0] for r in warm}):
            group = [r for r in warm if r["name"].startswith(prefix + "-run")]
            avg = lambda key: sum(r[key] for r in group) / len(group)
            print(
                f"{prefix:<28} RTF {avg('rtf'):5.3f}  wall {avg('wall_s'):6.2f}s  "
                f"~${avg('cost_per_min'):.5f}/audio-min"
            )
        print("\nRTF below 1.0 means faster than real time. Lower is better.")
    print(f"Clips saved to {out_dir}")


if __name__ == "__main__":
    main()
