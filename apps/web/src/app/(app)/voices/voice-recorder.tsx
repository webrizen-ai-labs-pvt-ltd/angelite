"use client";

import { useEffect, useRef, useState } from "react";
import { Microphone01, StopCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";

export const MIN_SECONDS = 5;
export const MAX_SECONDS = 20;

interface VoiceRecorderProps {
    onRecorded: (file: File) => void;
}

/** Records up to MAX_SECONDS from the microphone and hands back an audio file. */
export const VoiceRecorder = ({ onRecorded }: VoiceRecorderProps) => {
    const [seconds, setSeconds] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stop = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        setIsRecording(false);
    };

    useEffect(() => stop, []);

    const start = async () => {
        setError(null);
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        } catch {
            setError("Microphone access was blocked. Allow it in your browser, or upload a file instead.");
            return;
        }

        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        const startedAt = Date.now();
        recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
        recorder.onstop = () => {
            stream.getTracks().forEach((track) => track.stop());
            const duration = (Date.now() - startedAt) / 1000;
            if (duration < MIN_SECONDS) {
                setError(`Record at least ${MIN_SECONDS} seconds for a good clone.`);
                return;
            }
            const type = recorder.mimeType || "audio/webm";
            const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
            onRecorded(new File(chunks, `recording.${extension}`, { type }));
        };

        recorderRef.current = recorder;
        recorder.start();
        setSeconds(0);
        setIsRecording(true);
        timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            setSeconds(elapsed);
            if (elapsed >= MAX_SECONDS) stop();
        }, 250);
    };

    return (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-secondary px-6 py-6 text-center">
            {isRecording ? (
                <>
                    <p className="text-display-xs font-semibold text-primary tabular-nums">
                        0:{String(seconds).padStart(2, "0")} <span className="text-md font-normal text-tertiary">/ 0:{MAX_SECONDS}</span>
                    </p>
                    <p className="text-sm text-tertiary">Read naturally, in a quiet room. Stops automatically at {MAX_SECONDS}s.</p>
                    <Button color="primary-destructive" iconLeading={StopCircle} onPress={stop}>
                        Stop recording
                    </Button>
                </>
            ) : (
                <>
                    <p className="max-w-80 text-sm text-tertiary">
                        Read something aloud for {MIN_SECONDS}–{MAX_SECONDS} seconds, for example: “The quick brown fox jumps over the lazy dog, while I test my
                        new voice.”
                    </p>
                    <Button color="secondary" iconLeading={Microphone01} onPress={start}>
                        Start recording
                    </Button>
                </>
            )}
            {error && (
                <p role="alert" className="text-sm text-error-primary">
                    {error}
                </p>
            )}
        </div>
    );
};
