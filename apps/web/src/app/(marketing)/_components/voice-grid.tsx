"use client";

import { useEffect, useRef, useState } from "react";
import { PauseCircle, PlayCircle } from "@untitledui/icons";
import { PRESET_VOICES } from "@/lib/voices";
import { cx } from "@/utils/cx";

// The ten preset voices. Each card's waveform is the real envelope of that voice's sample, decoded in the browser.

const BARS = 48;

async function envelope(id: string, context: OfflineAudioContext) {
    const audio = await context.decodeAudioData(await fetch(`/voice-previews/${id}.mp3`).then((response) => response.arrayBuffer()));
    const data = audio.getChannelData(0);
    const size = Math.floor(data.length / BARS);
    const levels = Array.from({ length: BARS }, (_, bar) => {
        let peak = 0;
        for (let i = bar * size; i < (bar + 1) * size; i++) peak = Math.max(peak, Math.abs(data[i]));
        return peak;
    });
    const max = Math.max(...levels) || 1;
    return { levels: levels.map((level) => level / max), seconds: audio.duration };
}

export const VoiceGrid = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [shapes, setShapes] = useState<Record<string, { levels: number[]; seconds: number }>>({});
    const [playing, setPlaying] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const io = new IntersectionObserver(
            async ([entry]) => {
                if (!entry.isIntersecting) return;
                io.disconnect();
                const context = new OfflineAudioContext(1, 1, 24000);
                for (const voice of PRESET_VOICES) {
                    const shape = await envelope(voice.id, context).catch(() => null);
                    if (cancelled) return;
                    if (shape) setShapes((previous) => ({ ...previous, [voice.id]: shape }));
                }
            },
            { rootMargin: "300px" },
        );
        io.observe(sectionRef.current!);
        return () => {
            cancelled = true;
            io.disconnect();
            audioRef.current?.pause();
        };
    }, []);

    useEffect(() => {
        if (!playing) return;
        let frame = 0;
        const tick = () => {
            frame = requestAnimationFrame(tick);
            const audio = audioRef.current;
            if (audio?.duration) setProgress(audio.currentTime / audio.duration);
        };
        tick();
        return () => cancelAnimationFrame(frame);
    }, [playing]);

    const toggle = (id: string) => {
        audioRef.current?.pause();
        if (playing === id) return setPlaying(null);
        const audio = new Audio(`/voice-previews/${id}.mp3`);
        audio.onended = () => setPlaying(null);
        audioRef.current = audio;
        setProgress(0);
        setPlaying(id);
        audio.play().catch(() => setPlaying(null));
    };

    return (
        <section id="voices" ref={sectionRef} className="mx-auto max-w-[1240px] scroll-mt-24 px-3 py-16 md:px-4 md:py-24">
            <div className="mb-12 flex flex-col gap-4 px-2 md:mb-14 md:flex-row md:items-end md:justify-between">
                <h2 className="mkt-heading max-w-2xl text-[clamp(2rem,4.4vw,3.25rem)] text-ink">Ten voices, ready on day one</h2>
                <p className="max-w-sm text-[17px] leading-relaxed text-ink-muted">
                    Preset voices from Kokoro-82M in American and British English. Press play to hear each one.
                </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {PRESET_VOICES.map((voice) => {
                    const shape = shapes[voice.id];
                    const isPlaying = playing === voice.id;
                    const [character, accent] = voice.description.split("·").map((part) => part.trim());
                    return (
                        <li key={voice.id}>
                            <button
                                type="button"
                                onClick={() => toggle(voice.id)}
                                aria-pressed={isPlaying}
                                className={cx(
                                    "group flex w-full flex-col gap-5 rounded-[24px] p-5 text-left transition",
                                    isPlaying ? "bg-ink text-vellum" : "bg-vellum-card text-ink hover:bg-vellum-deep",
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[18px] font-medium">{voice.name}</span>
                                        <span className={cx("text-[13px]", isPlaying ? "text-vellum/60" : "text-ink-muted")}>{accent}</span>
                                    </div>
                                    {isPlaying ? (
                                        <PauseCircle className="size-7 shrink-0 text-angelite" aria-hidden="true" />
                                    ) : (
                                        <PlayCircle className="size-7 shrink-0 text-ink/40 transition group-hover:text-ink" aria-hidden="true" />
                                    )}
                                </div>
                                <div className="flex h-12 items-center gap-[2px]" aria-hidden="true">
                                    {Array.from({ length: BARS }, (_, bar) => {
                                        const level = shape?.levels[bar] ?? 0.08;
                                        const played = isPlaying && bar / BARS <= progress;
                                        return (
                                            <span
                                                key={bar}
                                                className={cx(
                                                    "w-full rounded-full transition-colors",
                                                    isPlaying ? (played ? "bg-angelite" : "bg-vellum/25") : "bg-ink/25 group-hover:bg-ink/40",
                                                )}
                                                style={{ height: `${Math.max(6, level * 100)}%` }}
                                            />
                                        );
                                    })}
                                </div>
                                <div className={cx("flex items-center justify-between text-[13px]", isPlaying ? "text-vellum/60" : "text-ink-muted")}>
                                    <span>{character}</span>
                                    <span className="mkt-data text-[12px]">{shape ? `${shape.seconds.toFixed(1)} s` : ""}</span>
                                </div>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};
