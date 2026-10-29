// Client for public/pocket-tts/worker.js: zero-shot voice cloning that runs entirely on the user's device.

export const POCKET_SAMPLE_RATE = 24000;
export const MAX_REFERENCE_SECONDS = 10; // the model only uses the first 10 s of a sample

export type LoadStage = "runtime" | "download" | "init";
export type LoadProgress = { stage: LoadStage; loaded: number; total: number };
export type GenerateProgress = { audioSeconds: number; elapsedMs: number };
export type GenerateResult = { samples: Float32Array; sampleRate: number; audioSeconds: number; elapsedMs: number; stopped: boolean };

type WorkerMessage =
    | { type: "progress"; stage: LoadStage | "generate"; loaded: number; total: number }
    | { type: "ready"; threads: number; cached: boolean }
    | { type: "cloned"; ms: number }
    | { type: "chunk"; audio: Float32Array; audioSeconds: number; elapsedMs: number }
    | { type: "done"; stopped: boolean; audioSeconds: number; elapsedMs: number; sampleRate: number }
    | { type: "error"; message: string };

export class PocketTts {
    private worker: Worker;
    private listener: ((message: WorkerMessage) => void) | null = null;

    constructor() {
        this.worker = new Worker("/pocket-tts/worker.js", { type: "module" });
        this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => this.listener?.(event.data);
        this.worker.onerror = (event) => this.listener?.({ type: "error", message: event.message || "The voice engine crashed" });
    }

    /** Sends one request and resolves on `until`; other messages go to `onMessage`. Requests run one at a time. */
    private request<T extends WorkerMessage["type"]>(
        message: Record<string, unknown>,
        until: T,
        onMessage?: (message: WorkerMessage) => void,
        transfer: Transferable[] = [],
    ): Promise<Extract<WorkerMessage, { type: T }>> {
        return new Promise((resolve, reject) => {
            this.listener = (incoming) => {
                if (incoming.type === "error") {
                    this.listener = null;
                    reject(new Error(incoming.message));
                } else if (incoming.type === until) {
                    this.listener = null;
                    resolve(incoming as Extract<WorkerMessage, { type: T }>);
                } else {
                    onMessage?.(incoming);
                }
            };
            this.worker.postMessage(message, transfer);
        });
    }

    load(onProgress: (progress: LoadProgress) => void) {
        return this.request({ type: "load" }, "ready", (message) => {
            if (message.type === "progress" && message.stage !== "generate") onProgress({ stage: message.stage, loaded: message.loaded, total: message.total });
        });
    }

    /** Builds the voice from a recording or uploaded file. */
    async clone(file: Blob) {
        const audio = await decodeReference(file);
        return this.request({ type: "clone", audio }, "cloned", undefined, [audio.buffer]);
    }

    /** `temperature` (0.1–1.5) trades steadiness for expressiveness; the worker defaults to 0.7. */
    async generate(text: string, options: { temperature?: number; onProgress?: (progress: GenerateProgress) => void } = {}): Promise<GenerateResult> {
        const chunks: Float32Array[] = [];
        const done = await this.request({ type: "generate", text, temperature: options.temperature }, "done", (message) => {
            if (message.type === "chunk") {
                chunks.push(message.audio);
                options.onProgress?.({ audioSeconds: message.audioSeconds, elapsedMs: message.elapsedMs });
            }
        });
        return {
            samples: concatSamples(chunks),
            sampleRate: done.sampleRate,
            audioSeconds: done.audioSeconds,
            elapsedMs: done.elapsedMs,
            stopped: done.stopped,
        };
    }

    /** Stops a running generation; the pending generate() resolves with what was made so far. */
    stop() {
        this.worker.postMessage({ type: "stop" });
    }

    dispose() {
        this.worker.terminate();
        this.listener = null;
    }
}

/** Any browser-decodable audio -> 24 kHz mono Float32, trimmed to MAX_REFERENCE_SECONDS. */
export async function decodeReference(file: Blob): Promise<Float32Array<ArrayBuffer>> {
    const context = new AudioContext();
    try {
        const decoded = await context.decodeAudioData(await file.arrayBuffer());
        const seconds = Math.min(decoded.duration, MAX_REFERENCE_SECONDS);
        const offline = new OfflineAudioContext(1, Math.ceil(seconds * POCKET_SAMPLE_RATE), POCKET_SAMPLE_RATE);
        const source = offline.createBufferSource();
        source.buffer = decoded; // mixing down to the 1-channel context averages the channels
        source.connect(offline.destination);
        source.start();
        const rendered = await offline.startRendering();
        return new Float32Array(rendered.getChannelData(0));
    } finally {
        void context.close();
    }
}

export function concatSamples(chunks: Float32Array[]) {
    const out = new Float32Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }
    return out;
}

export function encodeWav(chunks: Float32Array[], sampleRate: number) {
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    const writeString = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length * 2, true);

    let offset = 44;
    for (const chunk of chunks) {
        for (const sample of chunk) {
            view.setInt16(offset, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
            offset += 2;
        }
    }
    return new Blob([buffer], { type: "audio/wav" });
}

export type DeviceReport = {
    supported: boolean;
    threads: boolean;
    cores: number | null;
    memoryGb: number | null;
    webgpu: boolean;
    verdict: "good" | "ok" | "slow" | "unsupported";
};

/** Rough hardware check, so we can warn (or fall back to the server) before a 150 MB download. */
export function checkDevice(): DeviceReport {
    const supported = typeof WebAssembly === "object" && typeof Worker === "function" && typeof OfflineAudioContext === "function";
    const threads = typeof SharedArrayBuffer === "function" && self.crossOriginIsolated;
    const cores = navigator.hardwareConcurrency || null;
    const memoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;
    const webgpu = "gpu" in navigator;

    let verdict: DeviceReport["verdict"] = "ok";
    if (!supported) verdict = "unsupported";
    else if ((memoryGb !== null && memoryGb < 4) || (cores !== null && cores < 4)) verdict = "slow";
    else if (threads && (cores ?? 0) >= 8) verdict = "good";

    return { supported, threads, cores, memoryGb, webgpu, verdict };
}
