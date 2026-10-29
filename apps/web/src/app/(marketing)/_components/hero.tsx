"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, PauseCircle } from "@untitledui/icons";
import Link from "next/link";
import { PRESET_VOICES } from "@/lib/voices";
import { cx } from "@/utils/cx";
import { MarbleCanvas } from "./marble-canvas";

const FEATURED = ["af_heart", "bm_george", "af_nicole", "am_michael", "bf_emma"];
const sampleLine = (name: string) => `Hi, I am ${name}. I can read your stories, scripts and messages out loud, in a voice that sounds natural.`;

export const Hero = ({ signedIn }: { signedIn: boolean }) => {
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const contextRef = useRef<AudioContext | null>(null);
    const [voiceId, setVoiceId] = useState(FEATURED[0]);
    const [playing, setPlaying] = useState(false);
    const voice = PRESET_VOICES.find((item) => item.id === voiceId)!;

    useEffect(
        () => () => {
            audioRef.current?.pause();
            void contextRef.current?.close();
        },
        [],
    );

    const stop = () => {
        audioRef.current?.pause();
        audioRef.current = null;
        analyserRef.current = null;
        setPlaying(false);
    };

    const play = async (id = voiceId) => {
        audioRef.current?.pause();
        contextRef.current ??= new AudioContext();
        const context = contextRef.current;
        await context.resume();
        const audio = new Audio(`/voice-previews/${id}.mp3`);
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        context.createMediaElementSource(audio).connect(analyser).connect(context.destination);
        audio.onended = stop;
        audioRef.current = audio;
        analyserRef.current = analyser;
        setPlaying(true);
        await audio.play().catch(stop);
    };

    return (
        <section className="px-3 pt-28 md:px-4 md:pt-36">
            <div className="mx-auto flex max-w-3xl flex-col items-center px-2 text-center">
                <span className="flex items-center gap-2 rounded-full bg-vellum-card py-1 pr-3.5 pl-1 text-[13px] text-ink-muted ring-1 ring-ink/10">
                    <img src="/brand/angelite-seal.png" alt="" className="size-6 rounded-full" />
                    Open source, release 1 from Webrizen AI Labs
                </span>
                <h1 className="mkt-display mt-7 text-[clamp(2.75rem,7vw,5.25rem)] text-ink">Give any text a voice</h1>
                <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-muted md:text-[19px]">
                    Natural speech in ten voices, or your own cloned from ten seconds of audio. Built on open models, running right in your browser.
                </p>
                <div className="mt-9 flex flex-wrap justify-center gap-3">
                    <Link
                        href={signedIn ? "/studio" : "/sign-up"}
                        className="rounded-full bg-ink px-6 py-3 text-[15px] font-medium text-vellum transition hover:bg-ink-soft"
                    >
                        {signedIn ? "Open Studio" : "Start for free"}
                    </Link>
                    <Link
                        href="/open-source"
                        className="rounded-full px-6 py-3 text-[15px] font-medium text-ink ring-1 ring-ink/25 transition ring-inset hover:bg-vellum-card"
                    >
                        See the open models
                    </Link>
                </div>
            </div>

            <div className="relative mx-auto mt-16 max-w-[1240px] overflow-hidden rounded-[28px] bg-vellum-deep md:mt-20">
                <MarbleCanvas analyserRef={analyserRef} className="absolute inset-0 size-full" />
                <div className="relative flex min-h-[460px] flex-col items-center justify-center gap-5 px-4 py-14 md:min-h-[540px]">
                    <div className="hidden items-center gap-2 self-start rounded-full bg-ink/80 py-1.5 pr-3.5 pl-1.5 text-[13px] text-vellum backdrop-blur md:absolute md:top-6 md:left-6 md:flex">
                        <span className="flex size-6 items-center justify-center rounded-full bg-angelite/30 text-angelite">
                            <span className="size-2 rounded-full bg-angelite" />
                        </span>
                        Live preview
                    </div>

                    {/* Composer: a pocket version of the Studio. */}
                    <div className="w-full max-w-[460px] rounded-[22px] bg-vellum-card p-4 shadow-[0_24px_60px_-20px_rgba(31,28,36,0.45)] ring-1 ring-ink/10">
                        <div className="-mt-9 mb-3 flex -space-x-2">
                            {FEATURED.map((id) => {
                                const item = PRESET_VOICES.find((entry) => entry.id === id)!;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => {
                                            setVoiceId(id);
                                            void play(id);
                                        }}
                                        aria-label={`Hear ${item.name}`}
                                        aria-pressed={id === voiceId}
                                        className={cx(
                                            "flex size-10 items-center justify-center rounded-full text-[13px] font-medium ring-2 ring-vellum-card transition",
                                            id === voiceId ? "z-10 scale-110 bg-ink text-vellum" : "bg-vellum-deep text-ink hover:z-10 hover:bg-angelite",
                                        )}
                                    >
                                        {item.name.slice(0, 2)}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="min-h-[72px] text-left text-[15px] leading-relaxed text-ink">{sampleLine(voice.name)}</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                            <span className="mkt-data rounded-full bg-vellum px-3 py-1.5 text-[12px] text-ink-muted ring-1 ring-ink/10">
                                {voice.name}, {voice.description.split("·")[1]?.trim()}
                            </span>
                            <button
                                type="button"
                                onClick={() => (playing ? stop() : play())}
                                className="flex items-center gap-2 rounded-full bg-ink py-2 pr-2 pl-4 text-[14px] font-medium text-vellum transition hover:bg-ink-soft"
                            >
                                {playing ? "Stop" : "Speak"}
                                <span className="flex size-7 items-center justify-center rounded-full bg-vellum text-ink">
                                    {playing ? <PauseCircle className="size-4" aria-hidden="true" /> : <ArrowUp className="size-4" aria-hidden="true" />}
                                </span>
                            </button>
                        </div>
                    </div>
                    <p className="rounded-full bg-vellum-card/80 px-4 py-1.5 text-[13px] text-ink-muted backdrop-blur">
                        Want your own words?{" "}
                        <Link href={signedIn ? "/studio" : "/sign-up"} className="font-medium text-ink underline underline-offset-2">
                            Try the Studio free
                        </Link>
                    </p>
                </div>
            </div>

            <div className="mx-auto mt-10 flex max-w-[1240px] flex-col items-center gap-5 px-4 md:mt-12 md:flex-row md:justify-between">
                <p className="text-[14px] text-ink-muted">Built on open models and libraries</p>
                <ul className="mkt-data flex flex-wrap justify-center gap-x-10 gap-y-3 text-[16px] font-medium text-ink/70">
                    <li>Kokoro-82M</li>
                    <li>Pocket TTS</li>
                    <li>Chatterbox</li>
                    <li>ONNX Runtime</li>
                    <li>FFmpeg</li>
                </ul>
            </div>
        </section>
    );
};
