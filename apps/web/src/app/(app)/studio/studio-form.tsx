"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download01, Stars02, StopCircle } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import type { Key } from "react-aria-components";
import { Badge } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Select } from "@/components/base/select/select";
import { Slider } from "@/components/base/slider/slider";
import { generateOnDevice, loadEngine, prepareVoice, stopGeneration, useEngineState } from "@/lib/browser-tts/engine-store";
import { checkDevice } from "@/lib/browser-tts/pocket-tts";
import { ensureFolderAccess, saveClip } from "@/lib/local-library";
import { EFFECTS, type EffectId, applyPronunciations, characterLimit, scriptStats } from "@/lib/script";
import { createClient } from "@/lib/supabase/client";
import { AUDIO_EXTENSIONS, AUDIO_FORMATS, type AudioFormat, CLONE_LANGUAGES, type ClonedVoice, PRESET_VOICES } from "@/lib/voices";
import { DeviceEngineCard, loadPercent } from "../device-engine-card";
import { LocalStorageSettings } from "../local-storage-settings";
import { VoicePreviewButton } from "../voice-preview-button";
import { usePronunciations } from "./pronunciations-modal";
import { ScriptEditor } from "./script-editor";

type VoiceOption = { id: string; label: string; supportingText: string; type: "preset" | "cloned"; voiceId: string; cloned?: ClonedVoice };
type Engine = "device" | "server";
type Phase = { step: "idle" } | { step: "server" } | { step: "voice" } | { step: "device"; audioSeconds: number } | { step: "saving" };
type Result = { url: string; filename: string; voiceName: string; characters: number; onDevice: boolean };

const SAMPLE_TEXT =
    "Welcome to Angelite. [pause 0.5s] Type anything here, pick a voice, and press Generate. You can add pauses, fix pronunciations, and finish with an effect.";

// On-device sampling temperature: lower is steadier, higher is more varied and expressive.
const EXPRESSIVENESS = { min: 0.3, max: 1.1, default: 0.7 };

interface StudioFormProps {
    clonedVoices: ClonedVoice[];
    initialVoice?: string;
    /** Server-side (GPU) cloning is deployed. Without it, cloned voices run on the user's device. */
    serverCloning: boolean;
    isPro: boolean;
}

export const StudioForm = ({ clonedVoices, initialVoice, serverCloning, isPro }: StudioFormProps) => {
    const router = useRouter();
    const engineState = useEngineState();

    const voiceOptions: VoiceOption[] = [
        ...clonedVoices.map((voice) => ({
            id: `cloned:${voice.id}`,
            label: voice.name,
            supportingText: voice.model === "multilingual" ? "Cloned · multilingual" : "Cloned · English",
            type: "cloned" as const,
            voiceId: voice.id,
            cloned: voice,
        })),
        ...PRESET_VOICES.map((voice) => ({
            id: `preset:${voice.id}`,
            label: voice.name,
            supportingText: voice.description,
            type: "preset" as const,
            voiceId: voice.id,
        })),
    ];

    const [text, setText] = useState(SAMPLE_TEXT);
    const [voiceKey, setVoiceKey] = useState<string>(
        voiceOptions.some((option) => option.id === initialVoice) ? initialVoice! : `preset:${PRESET_VOICES[0].id}`,
    );
    const [language, setLanguage] = useState<string>("en");
    const [speed, setSpeed] = useState(1);
    const [format, setFormat] = useState<AudioFormat>("mp3");
    const [effect, setEffect] = useState<EffectId>("none");
    const [expressiveness, setExpressiveness] = useState(EXPRESSIVENESS.default);
    const [pronunciations, setPronunciations] = usePronunciations();
    const [engine, setEngine] = useState<Engine>(serverCloning ? "server" : "device");
    const [deviceSupported, setDeviceSupported] = useState(true);
    const [phase, setPhase] = useState<Phase>({ step: "idle" });
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [result, setResult] = useState<Result | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const voice = voiceOptions.find((option) => option.id === voiceKey) ?? voiceOptions[0];
    const isMultilingual = voice.cloned?.model === "multilingual";
    const characters = scriptStats(text).characters;
    // What the voice actually reads: the script with pronunciation fixes applied.
    const script = () => applyPronunciations(text, pronunciations).trim();
    const runsOnDevice = voice.type === "cloned" && (engine === "device" || !serverCloning);
    const limit = characterLimit(isPro, runsOnDevice);
    const overLimit = limit !== null && characters > limit;
    const deviceLanguageBlocked = runsOnDevice && isMultilingual && language !== "en";
    const isBusy = phase.step !== "idle";

    useEffect(() => setDeviceSupported(checkDevice().supported), []);

    // Default the language to the cloned voice's own language when switching voices.
    useEffect(() => {
        if (voice.cloned) setLanguage(voice.cloned.language);
    }, [voice.cloned]);

    // Free the previous clip's memory when a new one replaces it.
    useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result]);

    // Autoplay each new clip.
    useEffect(() => {
        if (result) audioRef.current?.play().catch(() => {});
    }, [result]);

    const fileName = (id: string, extension: string) => `angelite-${voice.label.toLowerCase().replace(/\s+/g, "-")}-${id}.${extension}`;

    const generateOnServer = async () => {
        setPhase({ step: "server" });
        const response = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: script(),
                voice: { type: voice.type, id: voice.voiceId },
                speed,
                format,
                effect,
                language: isMultilingual ? language : undefined,
            }),
        });
        if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error ?? "Generation failed. Please try again.");
        }
        // Usually a link to the saved copy (long clips are too big to send back directly); otherwise the audio itself.
        const isJson = response.headers.get("Content-Type")?.includes("application/json");
        const blob = isJson ? await fetch((await response.json()).url).then((stored) => stored.blob()) : await response.blob();
        const id = response.headers.get("X-Generation-Id")?.slice(0, 8) ?? "audio";
        setResult({ url: URL.createObjectURL(blob), filename: fileName(id, AUDIO_EXTENSIONS[format]), voiceName: voice.label, characters, onDevice: false });
    };

    const generateLocally = async () => {
        const cloned = voice.cloned!;

        await loadEngine(); // progress shows in the engine card and on the button
        setPhase({ step: "voice" });
        await prepareVoice(cloned.id, async () => {
            const { data, error: downloadError } = await createClient().storage.from("voice-samples").download(cloned.sample_path);
            if (downloadError || !data) throw new Error("Couldn't load this voice's recording");
            return data;
        });

        setPhase({ step: "device", audioSeconds: 0 });
        const spoken = script();
        const output = await generateOnDevice(spoken, {
            temperature: expressiveness,
            effect,
            onProgress: ({ audioSeconds }) => setPhase({ step: "device", audioSeconds }),
        });
        if (output.audioSeconds === 0) return; // stopped before any audio

        const url = URL.createObjectURL(output.wav);
        setResult({ url, filename: fileName(crypto.randomUUID().slice(0, 8), "wav"), voiceName: voice.label, characters, onDevice: true });
        if (output.stopped) {
            setNotice("Stopped early. The partial clip wasn't saved to history.");
            return;
        }

        // On-device clips stay on this device: the user's chosen folder, or the browser's private storage.
        setPhase({ step: "saving" });
        try {
            const clip = await saveClip(output.wav, { text: spoken, voiceName: voice.label, durationSeconds: output.audioSeconds });
            setNotice(clip.location === "folder" ? `Saved to your folder as ${clip.fileName}.` : "Saved on this device. Find it in History.");
        } catch {
            setNotice("Couldn't save to this device. Download it to keep it.");
        }
    };

    const generate = async () => {
        if (isBusy || characters === 0 || overLimit) return;
        setError(null);
        setNotice(null);
        try {
            // Ask for folder permission now, while we still have the click; the browser won't allow it after a long wait.
            if (runsOnDevice) await ensureFolderAccess().catch(() => false);
            if (runsOnDevice) await generateLocally();
            else await generateOnServer();
            router.refresh(); // updates the usage meter in the sidebar
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
        } finally {
            setPhase({ step: "idle" });
        }
    };

    const buttonLabel = (() => {
        if (engineState.status === "loading" && runsOnDevice && isBusy) return `Loading engine… ${Math.round(loadPercent(engineState.progress))}%`;
        switch (phase.step) {
            case "server":
                return "Generating…";
            case "voice":
                return "Preparing voice…";
            case "device":
                return `Generating… ${phase.audioSeconds.toFixed(1)} s`;
            case "saving":
                return "Saving…";
            default:
                return runsOnDevice ? "Generate on this device" : "Generate speech";
        }
    })();

    return (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="flex flex-col gap-4">
                <ScriptEditor
                    value={text}
                    onChange={setText}
                    onSubmit={generate}
                    onExample={(example) => {
                        setText(example.text);
                        setEffect(example.effect ?? "none");
                    }}
                    pronunciations={pronunciations}
                    onPronunciationsChange={setPronunciations}
                    limit={limit}
                    isDisabled={isBusy}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-tertiary">
                        {overLimit ? (
                            <span className="text-error-primary">
                                {isPro
                                    ? `Server voices take up to ${limit?.toLocaleString()} characters at a time. Use a cloned voice on this device for longer scripts.`
                                    : `Shorten the text to ${limit?.toLocaleString()} characters to generate.`}
                            </span>
                        ) : runsOnDevice ? (
                            "Free and unlimited: runs on this device."
                        ) : (
                            ""
                        )}
                    </p>
                    <div className="flex gap-3">
                        {phase.step === "device" && (
                            <Button size="lg" color="secondary" iconLeading={StopCircle} onPress={stopGeneration}>
                                Stop
                            </Button>
                        )}
                        <Button
                            size="lg"
                            iconLeading={Stars02}
                            onPress={generate}
                            isDisabled={characters === 0 || overLimit || deviceLanguageBlocked || (runsOnDevice && !deviceSupported)}
                            isLoading={isBusy}
                            showTextWhileLoading
                        >
                            {buttonLabel}
                        </Button>
                    </div>
                </div>

                {phase.step === "server" && (
                    <p className="text-sm text-tertiary">The first request after a quiet period can take up to a minute while the voice model wakes up.</p>
                )}

                {error && (
                    <div role="alert" className="flex items-start gap-3 rounded-xl bg-error-primary p-4 ring-1 ring-error_subtle ring-inset">
                        <AlertCircle className="mt-0.5 size-5 shrink-0 text-fg-error-primary" aria-hidden="true" />
                        <p className="text-sm text-error-primary">{error}</p>
                    </div>
                )}

                {result && (
                    <div className="flex flex-col gap-3 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                                <p className="truncate text-sm font-semibold text-primary">{result.voiceName}</p>
                                <Badge size="sm" color="gray">
                                    {result.characters.toLocaleString()} chars
                                </Badge>
                                {result.onDevice && (
                                    <Badge size="sm" color="brand">
                                        Made on this device
                                    </Badge>
                                )}
                            </div>
                            <Button href={result.url} download={result.filename} color="secondary" size="sm" iconLeading={Download01}>
                                Download
                            </Button>
                        </div>
                        <audio ref={audioRef} src={result.url} controls className="w-full" />
                        {notice && <p className="text-sm text-warning-primary">{notice}</p>}
                    </div>
                )}
            </section>

            <aside className="flex flex-col gap-6 lg:border-l lg:border-secondary lg:pl-8">
                <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                        <Select
                            label="Voice"
                            items={voiceOptions}
                            value={voiceKey}
                            onChange={(key: Key | null) => key && setVoiceKey(String(key))}
                            popoverClassName="max-h-80"
                            isDisabled={isBusy}
                        >
                            {(item) => (
                                <Select.Item id={item.id} supportingText={item.supportingText}>
                                    {item.label}
                                </Select.Item>
                            )}
                        </Select>
                    </div>
                    {voice.type === "preset" && (
                        <div className="flex h-10 items-center">
                            <VoicePreviewButton voiceId={voice.voiceId} voiceName={voice.label} size="sm" />
                        </div>
                    )}
                </div>

                {voice.type === "cloned" && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-secondary">Generate on</p>
                            {serverCloning && (
                                <ButtonGroup
                                    size="sm"
                                    disallowEmptySelection
                                    selectedKeys={new Set([engine])}
                                    onSelectionChange={(keys) => {
                                        const [next] = keys;
                                        if (next) setEngine(next as Engine);
                                    }}
                                    isDisabled={isBusy}
                                >
                                    <ButtonGroupItem id="device">This device</ButtonGroupItem>
                                    <ButtonGroupItem id="server">Server</ButtonGroupItem>
                                </ButtonGroup>
                            )}
                        </div>
                        {runsOnDevice ? (
                            deviceSupported ? (
                                <div className="flex flex-col gap-3 rounded-xl bg-secondary p-4">
                                    <DeviceEngineCard isDisabled={isBusy} />
                                    <p className="text-xs text-quaternary">Private and free: your text and audio never leave this device. English only.</p>
                                    <div className="border-t border-secondary pt-3">
                                        <LocalStorageSettings compact />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-error-primary">
                                    This browser can't run the on-device engine. Try a recent Chrome, Edge, Firefox or Safari.
                                </p>
                            )
                        ) : (
                            <p className="text-sm text-tertiary">Runs on our GPU server. Supports all 23 languages.</p>
                        )}
                    </div>
                )}

                {isMultilingual && (
                    <Select
                        label="Language"
                        items={CLONE_LANGUAGES.map((lang) => ({ id: lang.id, label: lang.name }))}
                        value={language}
                        onChange={(key: Key | null) => key && setLanguage(String(key))}
                        hint={
                            deviceLanguageBlocked
                                ? "On-device generation is English only. Switch to the server for other languages."
                                : "Write your text in this language."
                        }
                        isInvalid={deviceLanguageBlocked}
                        isDisabled={isBusy}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                )}

                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-secondary">Speed</p>
                        <p className="text-sm text-tertiary">{voice.type === "preset" ? `${speed.toFixed(2)}×` : "Natural"}</p>
                    </div>
                    <Slider
                        aria-label="Speed"
                        minValue={0.5}
                        maxValue={2}
                        step={0.05}
                        value={speed}
                        onChange={(value) => setSpeed(Array.isArray(value) ? value[0] : value)}
                        labelFormatter={(value) => `${value.toFixed(2)}×`}
                        isDisabled={voice.type !== "preset"}
                    />
                    {voice.type !== "preset" && <p className="text-sm text-tertiary">Cloned voices keep the pace of your recording.</p>}
                </div>

                {runsOnDevice && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-secondary">Expressiveness</p>
                            <p className="text-sm text-tertiary">{expressiveness < 0.55 ? "Steady" : expressiveness > 0.85 ? "Expressive" : "Balanced"}</p>
                        </div>
                        <Slider
                            aria-label="Expressiveness"
                            minValue={EXPRESSIVENESS.min}
                            maxValue={EXPRESSIVENESS.max}
                            step={0.05}
                            value={expressiveness}
                            onChange={(value) => setExpressiveness(Array.isArray(value) ? value[0] : value)}
                            labelFormatter={(value) => `${Math.round(((value - EXPRESSIVENESS.min) / (EXPRESSIVENESS.max - EXPRESSIVENESS.min)) * 100)}%`}
                            isDisabled={isBusy}
                        />
                        <p className="text-sm text-tertiary">Higher adds more variation and emotion to the delivery. Lower keeps it calm and consistent.</p>
                    </div>
                )}

                <Select
                    label="Effect"
                    items={EFFECTS.map((item) => ({ id: item.id, label: item.name, supportingText: item.description }))}
                    value={effect}
                    onChange={(key: Key | null) => key && setEffect(key as EffectId)}
                    isDisabled={isBusy}
                >
                    {(item) => (
                        <Select.Item id={item.id} supportingText={item.supportingText}>
                            {item.label}
                        </Select.Item>
                    )}
                </Select>

                <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-medium text-secondary">Format</p>
                    <ButtonGroup
                        size="sm"
                        disallowEmptySelection
                        selectedKeys={new Set([runsOnDevice ? "wav" : format])}
                        onSelectionChange={(keys) => {
                            const [next] = keys;
                            if (next) setFormat(next as AudioFormat);
                        }}
                        isDisabled={runsOnDevice}
                    >
                        {AUDIO_FORMATS.map((option) => (
                            <ButtonGroupItem key={option} id={option}>
                                {option.toUpperCase()}
                            </ButtonGroupItem>
                        ))}
                    </ButtonGroup>
                    {runsOnDevice && <p className="text-sm text-tertiary">On-device audio is saved as WAV.</p>}
                </div>
            </aside>
        </div>
    );
};
