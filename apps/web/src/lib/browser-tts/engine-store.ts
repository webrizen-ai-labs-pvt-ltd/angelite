"use client";

import { useSyncExternalStore } from "react";
import { type EffectId, parseScript } from "../script";
import { applyEffect } from "./effects";
import { type GenerateProgress, type LoadProgress, PocketTts, concatSamples, encodeWav } from "./pocket-tts";

// One on-device engine per tab, shared by Studio and the Browser lab, so the model loads (and the voice clones) once.

export type EngineState =
    | { status: "idle" }
    | { status: "loading"; progress: LoadProgress }
    | { status: "ready"; threads: number; cached: boolean; loadMs: number }
    | { status: "error"; message: string };

const CACHE_PREFIX = "angelite-pocket-tts-"; // matches CACHE_NAME in public/pocket-tts/worker.js

let engine: PocketTts | null = null;
let state: EngineState = { status: "idle" };
let loading: Promise<void> | null = null;
let clonedVoiceKey: string | null = null;
const listeners = new Set<() => void>();

const setState = (next: EngineState) => {
    state = next;
    listeners.forEach((listener) => listener());
};

export const useEngineState = () =>
    useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => state,
        () => state,
    );

/** True when the model was downloaded before, so loading takes seconds and no data. */
export async function isEngineCached() {
    try {
        return (await caches.keys()).some((key) => key.startsWith(CACHE_PREFIX));
    } catch {
        return false;
    }
}

/** Loads the engine once; concurrent callers share the same load. Rejects with a readable message. */
export function loadEngine() {
    if (state.status === "ready") return Promise.resolve();
    loading ??= (async () => {
        const started = performance.now();
        setState({ status: "loading", progress: { stage: "runtime", loaded: 0, total: 0 } });
        engine ??= new PocketTts();
        try {
            const ready = await engine.load((progress) => setState({ status: "loading", progress }));
            setState({ status: "ready", threads: ready.threads, cached: ready.cached, loadMs: Math.round(performance.now() - started) });
        } catch (error) {
            engine.dispose();
            engine = null;
            const message = error instanceof Error ? error.message : "Couldn't load the voice engine";
            setState({ status: "error", message });
            throw new Error(message);
        } finally {
            loading = null;
        }
    })();
    return loading;
}

/** Clones the voice unless it's already the active one. `key` identifies the voice (e.g. its database id). */
export async function prepareVoice(key: string, getSample: () => Promise<Blob>) {
    await loadEngine();
    if (clonedVoiceKey === key) return { cloned: false, ms: 0 };
    clonedVoiceKey = null;
    const result = await engine!.clone(await getSample());
    clonedVoiceKey = key;
    return { cloned: true, ms: result.ms };
}

export type DeviceOutput = { wav: Blob; audioSeconds: number; elapsedMs: number; stopped: boolean };

/**
 * Speaks a Studio script with the active voice: each text segment is generated in turn, [pause] markup becomes
 * silence, and the effect is applied at the end. Progress reports seconds of audio made so far.
 */
export async function generateOnDevice(
    script: string,
    options: { temperature?: number; effect?: EffectId; onProgress?: (progress: GenerateProgress) => void } = {},
): Promise<DeviceOutput> {
    if (!engine || !clonedVoiceKey) throw new Error("Choose a voice first");
    const started = performance.now();
    const pieces: Float32Array[] = [];
    let sampleRate = 24000;
    let madeSeconds = 0;
    let stopped = false;

    for (const segment of parseScript(script)) {
        if (segment.type === "pause") {
            pieces.push(new Float32Array(Math.round(segment.seconds * sampleRate)));
            madeSeconds += segment.seconds;
            continue;
        }
        const before = madeSeconds;
        const result = await engine.generate(segment.text, {
            temperature: options.temperature,
            onProgress: ({ audioSeconds }) => options.onProgress?.({ audioSeconds: before + audioSeconds, elapsedMs: Math.round(performance.now() - started) }),
        });
        sampleRate = result.sampleRate;
        pieces.push(result.samples);
        madeSeconds += result.audioSeconds;
        if (result.stopped) {
            stopped = true;
            break;
        }
    }

    const samples = await applyEffect(concatSamples(pieces), sampleRate, options.effect ?? "none");
    return { wav: encodeWav([samples], sampleRate), audioSeconds: samples.length / sampleRate, elapsedMs: Math.round(performance.now() - started), stopped };
}

export const stopGeneration = () => engine?.stop();
