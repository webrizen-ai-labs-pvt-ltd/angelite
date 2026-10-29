# Angelite inference service (spike)

Goal: measure real quality, speed, cold starts and cost **before** building the web app.

| Endpoint | Model | Runs on |
|---|---|---|
| `POST /v1/tts` | Kokoro-82M (Apache-2.0), preset voices | Modal CPU (2 vCPU) |
| `POST /v1/clone` | Chatterbox Turbo (English) or Multilingual V3 (23 languages), MIT | Modal GPU (T4 default) |
| `GET /v1/voices`, `GET /health` | – | – |

Every response carries timing headers: `X-Gen-Ms`, `X-Total-Ms`, `X-Audio-Seconds`, `X-RTF`.
Chatterbox adds an inaudible Perth watermark to every clip.

## 1. One-time setup

1. Create a free account at [modal.com](https://modal.com) (Starter plan, $30/month credits).
2. Log in from this folder:
   ```bash
   uvx modal setup
   ```
3. Create the secret. Pick any long random string for `SPIKE_TOKEN`; it protects your endpoint.
   `HF_TOKEN` is optional (a free Hugging Face read token, only needed if a model download asks for it).
   ```bash
   uvx modal secret create angelite-spike SPIKE_TOKEN=change-me-to-something-long HF_TOKEN=hf_xxx
   ```

## 2. Deploy

```bash
uvx modal deploy app.py
```

This deploys **preset voices only** (CPU). Modal runs GPU functions only once the account has a payment method,
so cloning is off by default and `/v1/clone` returns 503.
It prints the API URL, something like `https://<you>--angelite-inference-api.us-east.modal.run`.

To turn cloning on (after adding a card in Modal → Settings → Billing, ideally with a spending limit), deploy with a GPU,
then set `VOICE_CLONING_ENABLED=true` in the web app:
```bash
ANGELITE_GPU=T4 uvx modal deploy app.py
```
(PowerShell: `$env:ANGELITE_GPU="T4"; uvx modal deploy app.py`). The first GPU deploy also builds the Chatterbox image (about 5 minutes).

## 3. Benchmark

Record **your own voice** reading anything for 10–20 seconds (a phone voice memo is fine; any format works).

```bash
uv run bench.py --url https://<you>--angelite-inference-api.modal.run --token change-me-to-something-long --ref my_voice.m4a
```

Run 1 of each case usually includes a cold start. The summary averages runs 2+.
Listen to the clips in `out/`. Quality is the real test.

## 4. Quick manual test

```bash
curl -X POST "$URL/v1/tts" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"text":"Hello from Angelite","voice":"af_heart","format":"mp3"}' -o hello.mp3
```

## What to report back

- Warm RTF and cost per audio-minute for Kokoro (CPU) and each Chatterbox variant
- Cold start time (run 1 wall time minus gen time)
- Your honest take on clone quality, English and Spanish

## Cost note

Idle containers stay warm for 120 s after the last request (`SCALEDOWN_SECONDS`), and that time is billed.
Run `uvx modal app stop angelite-inference` when you're done testing.
