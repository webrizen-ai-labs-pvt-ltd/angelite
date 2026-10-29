import "server-only";
import type { EffectId } from "./script";
import type { AudioFormat } from "./voices";

// Server-side client for services/inference. The token never reaches the browser.

export class InferenceError extends Error {
    constructor(
        message: string,
        public status: number,
    ) {
        super(message);
    }
}

// Cloning needs a GPU on the inference service; leave this off until it's deployed with ANGELITE_GPU set.
export const isCloningEnabled = () => process.env.VOICE_CLONING_ENABLED === "true";

export type InferenceAudio = { audio: ArrayBuffer; contentType: string; durationSeconds: number | null };

const call = async (path: string, init: RequestInit): Promise<InferenceAudio> => {
    const baseUrl = process.env.INFERENCE_URL;
    const token = process.env.INFERENCE_TOKEN;
    if (!baseUrl || !token) throw new InferenceError("Voice service is not configured", 503);

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
        cache: "no-store",
    });

    if (!response.ok) {
        const detail = await response
            .json()
            .then((body) => (typeof body?.detail === "string" ? body.detail : null))
            .catch(() => null);
        // 4xx from the service are the user's input problems; anything else is ours.
        throw response.status < 500
            ? new InferenceError(detail ?? "The voice service rejected this request", 400)
            : new InferenceError("The voice service is unavailable. Please try again.", 502);
    }

    const seconds = Number(response.headers.get("X-Audio-Seconds"));
    return {
        audio: await response.arrayBuffer(),
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
        durationSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : null,
    };
};

export const synthesizePreset = (input: { text: string; voice: string; speed: number; format: AudioFormat; effect: EffectId }) =>
    call("/v1/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

export const synthesizeClone = (input: { text: string; reference: Blob; model: string; language: string; format: AudioFormat; effect: EffectId }) => {
    const form = new FormData();
    form.set("text", input.text);
    form.set("reference", input.reference, "reference");
    form.set("model", input.model);
    form.set("language", input.language);
    form.set("format", input.format);
    form.set("effect", input.effect);
    return call("/v1/clone", { method: "POST", body: form });
};
