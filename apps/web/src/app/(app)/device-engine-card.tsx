"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Download01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { isEngineCached, loadEngine, useEngineState } from "@/lib/browser-tts/engine-store";
import type { LoadProgress } from "@/lib/browser-tts/pocket-tts";

const STAGE_LABELS: Record<LoadProgress["stage"], string> = {
    runtime: "Starting the engine…",
    download: "Downloading the voice model…",
    init: "Preparing the model…",
};

const formatMb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/** Download is the long part: it gets 0–95%, starting up gets the rest. */
export const loadPercent = (progress: LoadProgress) => {
    if (progress.stage === "init") return 97;
    if (progress.stage === "download" && progress.total > 0) return Math.min(95, (progress.loaded / progress.total) * 95);
    return 0;
};

export const EngineProgress = ({ progress }: { progress: LoadProgress }) => {
    const hasBytes = progress.stage === "download" && progress.total > 0;
    return (
        <div className="flex flex-col gap-2" role="status" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-medium text-secondary">{STAGE_LABELS[progress.stage]}</p>
                {hasBytes && (
                    <p className="text-tertiary tabular-nums">
                        {formatMb(progress.loaded)} of {formatMb(progress.total)}
                    </p>
                )}
            </div>
            <ProgressBar value={loadPercent(progress)} labelPosition="right" />
        </div>
    );
};

/** Status of the in-browser engine with a download button; loads straight away when the model is already on this device. */
export const DeviceEngineCard = ({ autoLoadIfCached = true, isDisabled }: { autoLoadIfCached?: boolean; isDisabled?: boolean }) => {
    const engine = useEngineState();
    const [cached, setCached] = useState<boolean | null>(null);

    useEffect(() => {
        let active = true;
        isEngineCached().then((isCached) => {
            if (!active) return;
            setCached(isCached);
            if (isCached && autoLoadIfCached && !isDisabled) loadEngine().catch(() => {});
        });
        return () => {
            active = false;
        };
    }, [autoLoadIfCached, isDisabled]);

    if (engine.status === "loading") return <EngineProgress progress={engine.progress} />;

    if (engine.status === "ready") {
        return (
            <p className="flex items-center gap-2 text-sm text-tertiary">
                <CheckCircle className="size-5 shrink-0 text-fg-success-primary" aria-hidden="true" />
                Engine ready{engine.cached ? " (stored on this device)" : ""} · {engine.threads} {engine.threads === 1 ? "thread" : "threads"}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <p className="text-sm text-tertiary">
                {cached
                    ? "The voice model is stored on this device. Loading takes a few seconds."
                    : "Downloads about 146 MB once. After that it's stored on this device and loads in seconds."}
            </p>
            {engine.status === "error" && (
                <p role="alert" className="flex items-start gap-2 text-sm text-error-primary">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {engine.message}
                </p>
            )}
            <div>
                <Button color="secondary" size="sm" iconLeading={Download01} onPress={() => loadEngine().catch(() => {})} isDisabled={isDisabled}>
                    {engine.status === "error" ? "Try again" : cached ? "Load voice engine" : "Download voice engine"}
                </Button>
            </div>
        </div>
    );
};
