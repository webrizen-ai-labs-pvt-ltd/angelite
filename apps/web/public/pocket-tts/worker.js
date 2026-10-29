// Angelite in-browser voice engine: Kyutai Pocket TTS (CC-BY-4.0) as INT8 ONNX, run with ONNX Runtime Web.
// Adapted from KevinAHM/pocket-tts-web (Apache-2.0): https://huggingface.co/spaces/KevinAHM/pocket-tts-web
// Changes: weights download from a pinned Hugging Face commit with byte-level progress and are kept in Cache Storage,
// built-in voices are dropped (Angelite only clones), and the message protocol is simplified.
//
// Messages in:  { type: "load" } | { type: "clone", audio: Float32Array (24 kHz mono) } | { type: "generate", text, temperature? } | { type: "stop" }
// Messages out: progress, ready, cloned, chunk, done, error (see pocket-tts-client.ts)

const ORT_VERSION = "1.20.0";
const MODEL_REPO = "KevinAHM/pocket-tts-onnx";
const MODEL_REVISION = "58a6d00cf13d239b6748cb0769f35c580a8f606c";
const BUNDLE = "english_2026-04";
const CACHE_NAME = `angelite-pocket-tts-${MODEL_REVISION.slice(0, 12)}`;

// Sizes are fallbacks for progress when a response has no Content-Length.
const MODEL_FILES = {
    mimi_encoder: { file: "mimi_encoder_int8.onnx", size: 20_800_000 },
    text_conditioner: { file: "text_conditioner_int8.onnx", size: 16_400_000 },
    flow_lm_main: { file: "flow_lm_main_int8.onnx", size: 76_300_000 },
    flow_lm_flow: { file: "flow_lm_flow_int8.onnx", size: 10_000_000 },
    mimi_decoder: { file: "mimi_decoder_int8.onnx", size: 22_700_000 },
};
const MAX_FRAMES = 500;
const LSD_STEPS = 1;
const CHUNK_GAP_SEC = 0.25;
const DEFAULT_TEMPERATURE = 0.7; // higher = more varied, expressive delivery; lower = steadier

let ort = null;
let meta = null;
let tokenizer = null;
let bosBeforeVoice = null;
let sessions = {};
let voiceState = null;
let stTensors = [];
let isReady = false;
let isGenerating = false;

const fileUrl = (name) => `https://huggingface.co/${MODEL_REPO}/resolve/${MODEL_REVISION}/onnx/${BUNDLE}/${name}`;

// ---------------------------------------------------------------------------
// Download with progress + Cache Storage
// ---------------------------------------------------------------------------

async function openCache() {
    try {
        return await caches.open(CACHE_NAME);
    } catch {
        return null; // private mode or storage blocked: download every time
    }
}

async function fetchWithProgress(url, cache, onBytes, onTotal) {
    const cached = cache ? await cache.match(url) : null;
    if (cached) {
        const buffer = await cached.arrayBuffer();
        onTotal(buffer.byteLength);
        onBytes(buffer.byteLength);
        return { buffer, fromCache: true };
    }

    const response = await fetch(url);
    if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}) for ${url.split("/").pop()}`);
    const length = Number(response.headers.get("content-length"));
    if (length > 0) onTotal(length);

    const reader = response.body.getReader();
    const parts = [];
    let received = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        received += value.byteLength;
        onBytes(value.byteLength);
    }
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const part of parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
    }

    if (cache) {
        await cache.put(url, new Response(bytes, { headers: { "content-type": "application/octet-stream" } })).catch(() => {});
    }
    return { buffer: bytes.buffer, fromCache: false };
}

async function downloadAll(names) {
    const cache = await openCache();
    const totals = Object.fromEntries(names.map((n) => [n.file, n.size]));
    let loaded = 0;
    let lastPost = 0;
    let allCached = true;

    const report = (force = false) => {
        const now = performance.now();
        if (!force && now - lastPost < 100) return;
        lastPost = now;
        const total = Object.values(totals).reduce((a, b) => a + b, 0);
        postMessage({ type: "progress", stage: "download", loaded, total: Math.max(total, loaded) });
    };

    const results = await Promise.all(
        names.map(async ({ file }) => {
            const { buffer, fromCache } = await fetchWithProgress(
                fileUrl(file),
                cache,
                (n) => {
                    loaded += n;
                    report();
                },
                (n) => {
                    totals[file] = n;
                },
            );
            if (!fromCache) allCached = false;
            return [file, buffer];
        }),
    );
    report(true);
    return { files: Object.fromEntries(results), allCached };
}

// ---------------------------------------------------------------------------
// Tensor helpers (from the upstream demo)
// ---------------------------------------------------------------------------

function makeFilledArray(shape, dtype, fill) {
    const size = shape.reduce((a, b) => a * b, 1);
    if (dtype === "int64") return new BigInt64Array(size);
    if (dtype === "bool") return new Uint8Array(size);
    const data = new Float32Array(size);
    if (fill === "nan") data.fill(NaN);
    else if (fill === "ones") data.fill(1);
    return data;
}

const tensor = (dtype, data, dims) => new ort.Tensor(dtype, data, dims);

function initState(manifest) {
    const state = {};
    for (const entry of manifest) {
        state[entry.input_name] = tensor(entry.dtype, makeFilledArray(entry.shape, entry.dtype, entry.fill), entry.shape);
    }
    return state;
}

function updateState(state, result, manifest) {
    for (const entry of manifest) state[entry.input_name] = result[entry.output_name];
}

function parseNpyFloat32(buffer) {
    const view = new DataView(buffer);
    const major = view.getUint8(6);
    const headerLen = major === 1 ? view.getUint16(8, true) : view.getUint32(8, true);
    const headerOffset = major === 1 ? 10 : 12;
    const header = new TextDecoder().decode(new Uint8Array(buffer, headerOffset, headerLen));
    const match = header.match(/\(\s*([0-9,\s]+)\)/);
    if (!match) throw new Error("Could not parse NPY shape");
    const shape = match[1]
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => Number.parseInt(p, 10));
    return { data: new Float32Array(buffer.slice(headerOffset + headerLen)), shape };
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

async function load() {
    if (isReady) {
        postMessage({ type: "ready", threads: ort.env.wasm.numThreads, cached: true });
        return;
    }

    postMessage({ type: "progress", stage: "runtime", loaded: 0, total: 0 });
    const ortModule = await import(`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort.min.mjs`);
    ort = ortModule.default || ortModule;
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
    ort.env.wasm.simd = true;
    // Threads need a cross-origin isolated page; the small sequential matmuls stop scaling past 4.
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(navigator.hardwareConcurrency || 4, 4) : 1;

    const metaResponse = await fetch(fileUrl("bundle.json"));
    if (!metaResponse.ok) throw new Error("Could not load the voice model manifest");
    meta = await metaResponse.json();

    const { files, allCached } = await downloadAll([
        ...Object.values(MODEL_FILES),
        { file: meta.tokenizer_file, size: 500_000 },
        ...(meta.bos_before_voice_file ? [{ file: meta.bos_before_voice_file, size: 10_000 }] : []),
    ]);

    postMessage({ type: "progress", stage: "init", loaded: 0, total: 0 });
    const options = { executionProviders: ["wasm"], graphOptimizationLevel: "all" };
    const entries = await Promise.all(
        Object.entries(MODEL_FILES).map(async ([key, { file }]) => [key, await ort.InferenceSession.create(new Uint8Array(files[file]), options)]),
    );
    sessions = Object.fromEntries(entries);

    const sp = await import("./sentencepiece.js");
    tokenizer = new sp.SentencePieceProcessor();
    const tokenizerBytes = new Uint8Array(files[meta.tokenizer_file]);
    let binary = "";
    for (let i = 0; i < tokenizerBytes.length; i += 0x8000) binary += String.fromCharCode(...tokenizerBytes.subarray(i, i + 0x8000));
    await tokenizer.loadFromB64StringModel(btoa(binary));

    bosBeforeVoice = meta.bos_before_voice_file ? parseNpyFloat32(files[meta.bos_before_voice_file]) : null;

    const dt = 1 / LSD_STEPS;
    stTensors = Array.from({ length: LSD_STEPS }, (_, step) => ({
        s: tensor("float32", new Float32Array([step * dt]), [1, 1]),
        t: tensor("float32", new Float32Array([step * dt + dt]), [1, 1]),
    }));

    isReady = true;
    postMessage({ type: "ready", threads: ort.env.wasm.numThreads, cached: allCached });
}

// ---------------------------------------------------------------------------
// Voice cloning: reference audio -> conditioned transformer state
// ---------------------------------------------------------------------------

async function clone(audio) {
    const started = performance.now();
    const outputs = await sessions.mimi_encoder.run({ audio: tensor("float32", audio, [1, 1, audio.length]) });
    const embeddings = outputs[sessions.mimi_encoder.outputNames[0]];

    let dims = embeddings.dims.slice();
    let data = new Float32Array(embeddings.data);
    while (dims.length > 3 && dims[0] === 1) dims = dims.slice(1);
    if (dims.length < 3) dims = [1, dims[0], dims[1]];

    if (meta.insert_bos_before_voice && bosBeforeVoice) {
        const combined = new Float32Array(bosBeforeVoice.data.length + data.length);
        combined.set(bosBeforeVoice.data, 0);
        combined.set(data, bosBeforeVoice.data.length);
        data = combined;
        dims = [1, dims[1] + bosBeforeVoice.shape[1], dims[2]];
    }

    const state = initState(meta.flow_lm_state_manifest);
    const result = await sessions.flow_lm_main.run({
        sequence: tensor("float32", new Float32Array(0), [1, 0, meta.latent_dim]),
        text_embeddings: tensor("float32", data, dims),
        ...state,
    });
    updateState(state, result, meta.flow_lm_state_manifest);
    voiceState = state;
    postMessage({ type: "cloned", ms: Math.round(performance.now() - started) });
}

// ---------------------------------------------------------------------------
// Text handling (from the upstream demo)
// ---------------------------------------------------------------------------

function prepareText(text) {
    let prompt = text.trim().replace(/\s+/g, " ");
    if (!prompt) return { text: "", framesAfterEos: 1 };
    if (meta.remove_semicolons) prompt = prompt.replace(/;/g, ",");

    const wordCount = prompt.split(" ").length;
    let framesAfterEos = wordCount <= 4 ? 3 : 1;
    if (meta.model_recommended_frames_after_eos != null) framesAfterEos = Number(meta.model_recommended_frames_after_eos);

    if (!/[A-ZÀ-Þ]/.test(prompt[0])) prompt = prompt[0].toUpperCase() + prompt.slice(1);
    if (/[0-9A-Za-zÀ-ÿ]/.test(prompt[prompt.length - 1])) prompt += ".";
    if (meta.pad_with_spaces_for_short_inputs && wordCount < 5) prompt = "        " + prompt;
    return { text: prompt, framesAfterEos };
}

function splitIntoChunks(text) {
    const prepared = prepareText(text);
    if (!prepared.text) return { chunks: [], framesAfterEos: prepared.framesAfterEos };

    const maxTokens = Number(meta.max_token_per_chunk || 50);
    const sentences = (prepared.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [prepared.text]).map((s) => s.trim()).filter(Boolean);
    const chunks = [];
    let current = "";

    for (const sentence of sentences) {
        const ids = tokenizer.encodeIds(sentence);
        if (ids.length > maxTokens) {
            if (current) chunks.push(current);
            current = "";
            for (let i = 0; i < ids.length; i += maxTokens) {
                const piece = tokenizer.decodeIds(ids.slice(i, i + maxTokens)).trim();
                if (piece) chunks.push(piece);
            }
            continue;
        }
        const combined = current ? `${current} ${sentence}` : sentence;
        if (current && tokenizer.encodeIds(combined).length > maxTokens) {
            chunks.push(current);
            current = sentence;
        } else {
            current = combined;
        }
    }
    if (current) chunks.push(current);
    return { chunks, framesAfterEos: prepared.framesAfterEos };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

async function generate(text, temperature = DEFAULT_TEMPERATURE) {
    if (!voiceState) throw new Error("Clone a voice first");
    const { chunks, framesAfterEos } = splitIntoChunks(text);
    if (!chunks.length) throw new Error("Enter some text to generate");

    isGenerating = true;
    const started = performance.now();
    const latentDim = meta.latent_dim;
    const emptySeq = tensor("float32", new Float32Array(0), [1, 0, latentDim]);
    const emptyText = tensor("float32", new Float32Array(0), [1, 0, meta.conditioning_dim]);
    let audioSeconds = 0;

    const send = (audio) => {
        audioSeconds += audio.length / meta.sample_rate;
        postMessage({ type: "chunk", audio, audioSeconds, elapsedMs: Math.round(performance.now() - started) }, [audio.buffer]);
    };

    try {
        for (let chunkIndex = 0; chunkIndex < chunks.length && isGenerating; chunkIndex++) {
            postMessage({ type: "progress", stage: "generate", loaded: chunkIndex, total: chunks.length });
            const flowState = { ...voiceState };
            const mimiState = initState(meta.mimi_state_manifest);

            const ids = tokenizer.encodeIds(chunks[chunkIndex]);
            let textEmb = (await sessions.text_conditioner.run({ token_ids: tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]) }))[
                sessions.text_conditioner.outputNames[0]
            ];
            if (textEmb.dims.length === 2) textEmb = tensor("float32", new Float32Array(textEmb.data), [1, textEmb.dims[0], textEmb.dims[1]]);

            updateState(flowState, await sessions.flow_lm_main.run({ sequence: emptySeq, text_embeddings: textEmb, ...flowState }), meta.flow_lm_state_manifest);

            const latents = [];
            let decoded = 0;
            let eosStep = null;
            let current = tensor("float32", new Float32Array(latentDim).fill(NaN), [1, 1, latentDim]);

            for (let step = 0; step < MAX_FRAMES && isGenerating; step++) {
                if (step > 0 && step % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0)); // let "stop" through

                const ar = await sessions.flow_lm_main.run({ sequence: current, text_embeddings: emptyText, ...flowState });
                if (ar.eos_logit.data[0] > -4 && eosStep == null) eosStep = step;
                const shouldStop = eosStep != null && step >= eosStep + framesAfterEos;

                const latent = new Float32Array(latentDim);
                const std = Math.sqrt(Math.min(Math.max(temperature, 0.1), 1.5));
                for (let i = 0; i < latentDim; i++) {
                    let u = 0;
                    let v = 0;
                    while (u === 0) u = Math.random();
                    while (v === 0) v = Math.random();
                    latent[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
                }
                for (let k = 0; k < LSD_STEPS; k++) {
                    const flow = await sessions.flow_lm_flow.run({ c: ar.conditioning, s: stTensors[k].s, t: stTensors[k].t, x: tensor("float32", latent, [1, latentDim]) });
                    for (let i = 0; i < latentDim; i++) latent[i] += flow.flow_dir.data[i] / LSD_STEPS;
                }

                latents.push(latent);
                current = tensor("float32", latent, [1, 1, latentDim]);
                updateState(flowState, ar, meta.flow_lm_state_manifest);

                const pending = latents.length - decoded;
                const size = shouldStop ? pending : pending >= 12 ? 12 : 0;
                if (size > 0) {
                    const batch = new Float32Array(size * latentDim);
                    for (let f = 0; f < size; f++) batch.set(latents[decoded + f], f * latentDim);
                    const out = await sessions.mimi_decoder.run({ latent: tensor("float32", batch, [1, size, latentDim]), ...mimiState });
                    for (const entry of meta.mimi_state_manifest) mimiState[entry.input_name] = out[entry.output_name];
                    decoded += size;
                    send(new Float32Array(out[sessions.mimi_decoder.outputNames[0]].data));
                }
                if (shouldStop) break;
            }

            if (chunkIndex < chunks.length - 1) send(new Float32Array(Math.floor(CHUNK_GAP_SEC * meta.sample_rate)));
        }
    } finally {
        const stopped = !isGenerating;
        isGenerating = false;
        const elapsedMs = Math.round(performance.now() - started);
        postMessage({ type: "done", stopped, audioSeconds, elapsedMs, sampleRate: meta.sample_rate });
    }
}

self.onmessage = async (event) => {
    const { type } = event.data;
    try {
        if (type === "load") return await load();
        if (type === "stop") {
            isGenerating = false;
            return;
        }
        if (!isReady) throw new Error("The voice model isn't loaded yet");
        if (isGenerating) throw new Error("Wait for the current generation to finish");
        if (type === "clone") return await clone(event.data.audio);
        if (type === "generate") return await generate(event.data.text, event.data.temperature);
    } catch (error) {
        postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
};
