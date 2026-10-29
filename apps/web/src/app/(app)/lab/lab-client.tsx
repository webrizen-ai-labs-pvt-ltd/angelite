"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, CpuChip01, Download01, Stars02, StopCircle } from "@untitledui/icons";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { Badge } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { TextArea } from "@/components/base/textarea/textarea";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { generateOnDevice, prepareVoice, stopGeneration, useEngineState } from "@/lib/browser-tts/engine-store";
import { type DeviceReport, MAX_REFERENCE_SECONDS, checkDevice } from "@/lib/browser-tts/pocket-tts";
import { MAX_TEXT_CHARS } from "@/lib/voices";
import { DeviceEngineCard } from "../device-engine-card";
import { VoiceRecorder } from "../voices/voice-recorder";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SAMPLE_TEXT = "This voice was cloned and generated entirely inside my browser. Nothing left this device.";

const VERDICTS: Record<DeviceReport["verdict"], { label: string; color: "success" | "brand" | "warning" | "error"; text: string }> = {
    good: { label: "Great fit", color: "success", text: "This device should generate faster than real time." },
    ok: { label: "Should work", color: "brand", text: "Expect roughly real-time speed." },
    slow: { label: "May be slow", color: "warning", text: "This device is on the low end. Server generation will be faster." },
    unsupported: { label: "Not supported", color: "error", text: "This browser can't run the voice engine. Use server generation instead." },
};

type Result = { url: string; audioSeconds: number; elapsedMs: number };

export const LabClient = () => {
    const engine = useEngineState();
    const [device, setDevice] = useState<DeviceReport | null>(null);

    const [source, setSource] = useState<"record" | "upload">("record");
    const [sample, setSample] = useState<File | null>(null);
    const [consent, setConsent] = useState(false);
    const [voice, setVoice] = useState<{ status: "none" | "cloning" | "ready"; ms?: number }>({ status: "none" });

    const [text, setText] = useState(SAMPLE_TEXT);
    const [generating, setGenerating] = useState<{ audioSeconds: number; elapsedMs: number } | null>(null);
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setDevice(checkDevice());
    }, []);

    useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result]);

    const sampleUrl = useObjectUrl(sample);

    const cloneVoice = async () => {
        if (!sample) return;
        setError(null);
        setVoice({ status: "cloning" });
        try {
            // A fresh key per sample, so a new recording always re-clones.
            const cloned = await prepareVoice(`lab:${crypto.randomUUID()}`, async () => sample);
            setVoice({ status: "ready", ms: cloned.ms });
        } catch (cloneError) {
            setVoice({ status: "none" });
            setError(cloneError instanceof Error ? cloneError.message : "Couldn't read that recording");
        }
    };

    const generate = async () => {
        setError(null);
        setResult(null);
        setGenerating({ audioSeconds: 0, elapsedMs: 0 });
        try {
            const output = await generateOnDevice(text, { onProgress: setGenerating });
            setResult({ url: URL.createObjectURL(output.wav), audioSeconds: output.audioSeconds, elapsedMs: output.elapsedMs });
        } catch (generateError) {
            setError(generateError instanceof Error ? generateError.message : "Generation failed");
        } finally {
            setGenerating(null);
        }
    };

    const ready = engine.status === "ready";
    const verdict = device ? VERDICTS[device.verdict] : null;

    return (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col gap-6">
                {/* 1. Engine */}
                <Step number={1} title="Load the voice engine" done={ready}>
                    <DeviceEngineCard isDisabled={device?.verdict === "unsupported"} />
                </Step>

                {/* 2. Voice */}
                <Step number={2} title="Clone a voice" done={voice.status === "ready"} isDisabled={!ready}>
                    {voice.status === "ready" ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="flex items-center gap-2 text-sm text-tertiary">
                                <CheckCircle className="size-5 text-fg-success-primary" aria-hidden="true" />
                                Voice ready in {((voice.ms ?? 0) / 1000).toFixed(1)} s
                            </p>
                            <Button
                                color="link-gray"
                                size="sm"
                                onPress={() => {
                                    setVoice({ status: "none" });
                                    setSample(null);
                                }}
                            >
                                Use a different voice
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm text-tertiary">
                                    {MAX_REFERENCE_SECONDS} seconds of clear speech. The recording never leaves this device.
                                </p>
                                {!sample && (
                                    <ButtonGroup
                                        size="sm"
                                        disallowEmptySelection
                                        selectedKeys={new Set([source])}
                                        onSelectionChange={(keys) => {
                                            const [next] = keys;
                                            if (next) setSource(next as "record" | "upload");
                                        }}
                                    >
                                        <ButtonGroupItem id="record">Record</ButtonGroupItem>
                                        <ButtonGroupItem id="upload">Upload</ButtonGroupItem>
                                    </ButtonGroup>
                                )}
                            </div>

                            {sample && sampleUrl ? (
                                <div className="flex flex-col gap-3 rounded-xl p-3 ring-1 ring-secondary ring-inset">
                                    <audio src={sampleUrl} controls className="w-full" />
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate text-sm text-tertiary">{sample.name}</p>
                                        <Button color="link-gray" size="sm" onPress={() => setSample(null)} isDisabled={voice.status === "cloning"}>
                                            Replace
                                        </Button>
                                    </div>
                                </div>
                            ) : source === "record" ? (
                                <VoiceRecorder onRecorded={setSample} />
                            ) : (
                                <FileUpload.DropZone
                                    accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg"
                                    allowsMultiple={false}
                                    maxSize={MAX_FILE_BYTES}
                                    hint="MP3, WAV, M4A, WebM or OGG, up to 10 MB."
                                    onDropFiles={(files) => files[0] && setSample(files[0])}
                                    onDropUnacceptedFiles={() => setError("That file type isn't supported. Upload an audio file.")}
                                    onSizeLimitExceed={() => setError("That file is larger than 10 MB.")}
                                />
                            )}

                            <Checkbox
                                isSelected={consent}
                                onChange={setConsent}
                                label="I have the right to clone this voice"
                                hint="It's my own voice, or I have the speaker's permission."
                            />

                            <div>
                                <Button
                                    onPress={cloneVoice}
                                    isDisabled={!ready || !sample || !consent}
                                    isLoading={voice.status === "cloning"}
                                    showTextWhileLoading
                                >
                                    {voice.status === "cloning" ? "Cloning…" : "Clone this voice"}
                                </Button>
                            </div>
                        </div>
                    )}
                </Step>

                {/* 3. Generate */}
                <Step number={3} title="Generate speech" isDisabled={voice.status !== "ready"}>
                    <div className="flex flex-col gap-4">
                        <TextArea
                            aria-label="Text to speak"
                            value={text}
                            onChange={setText}
                            maxLength={MAX_TEXT_CHARS}
                            rows={4}
                            isDisabled={voice.status !== "ready"}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-tertiary tabular-nums">
                                {generating
                                    ? `${generating.audioSeconds.toFixed(1)} s of audio made · ${(generating.elapsedMs / 1000).toFixed(1)} s elapsed`
                                    : `${text.length.toLocaleString()} / ${MAX_TEXT_CHARS.toLocaleString()} characters · English`}
                            </p>
                            {generating ? (
                                <Button color="secondary" iconLeading={StopCircle} onPress={stopGeneration}>
                                    Stop
                                </Button>
                            ) : (
                                <Button iconLeading={Stars02} onPress={generate} isDisabled={voice.status !== "ready" || !text.trim()}>
                                    Generate on this device
                                </Button>
                            )}
                        </div>

                        {result && (
                            <div className="flex flex-col gap-3 rounded-xl bg-secondary p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-secondary">
                                        {result.audioSeconds.toFixed(1)} s of audio in {(result.elapsedMs / 1000).toFixed(1)} s
                                    </p>
                                    <Badge size="sm" color={result.audioSeconds * 1000 >= result.elapsedMs ? "success" : "warning"}>
                                        {(result.audioSeconds / Math.max(result.elapsedMs / 1000, 0.001)).toFixed(1)}× real time
                                    </Badge>
                                </div>
                                <audio src={result.url} controls autoPlay className="w-full" />
                                <div>
                                    <Button href={result.url} download="angelite-browser.wav" color="secondary" size="sm" iconLeading={Download01}>
                                        Download WAV
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Step>

                {error && <ErrorText message={error} />}
            </div>

            <aside className="flex flex-col gap-4 rounded-xl p-5 ring-1 ring-secondary ring-inset lg:self-start">
                <div className="flex items-center gap-3">
                    <FeaturedIcon icon={CpuChip01} color="gray" theme="modern" size="md" />
                    <div className="flex flex-col">
                        <p className="text-sm font-semibold text-primary">This device</p>
                        {verdict && (
                            <Badge size="sm" color={verdict.color}>
                                {verdict.label}
                            </Badge>
                        )}
                    </div>
                </div>
                {device && verdict && (
                    <>
                        <p className="text-sm text-tertiary">{verdict.text}</p>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <DeviceRow label="CPU cores" value={device.cores ? String(device.cores) : "Unknown"} />
                            <DeviceRow label="Memory" value={device.memoryGb ? `${device.memoryGb} GB+` : "Unknown"} />
                            <DeviceRow label="Multithreading" value={device.threads ? "On" : "Off"} />
                            <DeviceRow label="WebGPU" value={device.webgpu ? "Available" : "No"} />
                        </dl>
                        <p className="text-xs text-quaternary">Runs Kyutai Pocket TTS (CC BY 4.0) with ONNX Runtime Web. English only for now.</p>
                    </>
                )}
            </aside>
        </div>
    );
};

const Step = ({
    number,
    title,
    done,
    isDisabled,
    children,
}: {
    number: number;
    title: string;
    done?: boolean;
    isDisabled?: boolean;
    children: React.ReactNode;
}) => (
    <section className={`flex flex-col gap-4 rounded-xl p-5 ring-1 ring-secondary ring-inset ${isDisabled ? "opacity-50" : ""}`} aria-disabled={isDisabled}>
        <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary">
                {done ? <CheckCircle className="size-4 text-fg-success-primary" aria-hidden="true" /> : number}
            </span>
            <h2 className="text-md font-semibold text-primary">{title}</h2>
        </div>
        {children}
    </section>
);

const DeviceRow = ({ label, value }: { label: string; value: string }) => (
    <>
        <dt className="text-tertiary">{label}</dt>
        <dd className="text-right font-medium text-secondary">{value}</dd>
    </>
);

const ErrorText = ({ message }: { message: string }) => (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-error-primary px-3.5 py-2.5 text-sm text-error-primary">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {message}
    </p>
);

function useObjectUrl(blob: Blob | null) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!blob) return setUrl(null);
        const next = URL.createObjectURL(blob);
        setUrl(next);
        return () => URL.revokeObjectURL(next);
    }, [blob]);
    return url;
}
