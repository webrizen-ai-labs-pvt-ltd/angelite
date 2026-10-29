# In-browser voice engine: third-party notices

- **Pocket TTS** model by Kyutai: CC BY 4.0. https://huggingface.co/kyutai/pocket-tts
  ONNX export by KevinAHM (CC BY 4.0), downloaded at runtime from https://huggingface.co/KevinAHM/pocket-tts-onnx (pinned commit in `worker.js`).
- **worker.js** is adapted from KevinAHM/pocket-tts-web (Apache-2.0). https://huggingface.co/spaces/KevinAHM/pocket-tts-web
- **sentencepiece.js** is @sctg/sentencepiece-js (Apache-2.0), with the web-worker patches from the same demo.
- **ONNX Runtime Web** (MIT) is loaded from jsDelivr at runtime.
