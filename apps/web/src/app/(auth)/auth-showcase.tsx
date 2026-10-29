"use client";

import { useEffect, useRef, useState } from "react";
import { Folder, PauseCircle, PlayCircle, Stars02, UserSquare } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { PRESET_VOICES } from "@/lib/voices";
import { MarbleCanvas } from "../(marketing)/_components/marble-canvas";

// The panel beside the sign-in form: the marbling from the home page, with a small player whose voice stirs it,
// and the facts that matter when deciding to sign up.

const COPY = {
    "/sign-up": {
        title: "Your voice, in ten seconds.",
        body: "Create a free account and clone a voice from a short recording. No card, no training, no waiting.",
    },
    default: { title: "Your studio is waiting.", body: "Pick up where you left off: your scripts, your voices and everything saved to your folder." },
};

const FEATURES = [
    { icon: UserSquare, title: "Clone any voice you have permission to use", body: "Ten seconds of clear speech is enough." },
    { icon: Stars02, title: "Unlimited on your own device", body: "Cloned voices run in the browser, so they never count against your plan." },
    { icon: Folder, title: "Private by design", body: "Scripts and audio made on your device stay there." },
];

const STATS = [
    { value: "10", label: "preset voices" },
    { value: "1.3 s", label: "to clone a voice" },
    { value: "$0", label: "to start" },
];

const PLAYLIST = ["af_heart", "bm_george", "af_nicole", "am_michael"];

export const AuthShowcase = () => {
    const pathname = usePathname();
    const copy = pathname === "/sign-up" ? COPY["/sign-up"] : COPY.default;
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const contextRef = useRef<AudioContext | null>(null);
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const voice = PRESET_VOICES.find((item) => item.id === PLAYLIST[index % PLAYLIST.length])!;

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

    const toggle = async () => {
        if (playing) {
            stop();
            setIndex((value) => value + 1); // next press plays the next voice
            return;
        }
        contextRef.current ??= new AudioContext();
        await contextRef.current.resume();
        const audio = new Audio(`/voice-previews/${voice.id}.mp3`);
        const analyser = contextRef.current.createAnalyser();
        analyser.fftSize = 1024;
        contextRef.current.createMediaElementSource(audio).connect(analyser).connect(contextRef.current.destination);
        audio.onended = () => {
            stop();
            setIndex((value) => value + 1);
        };
        audioRef.current = audio;
        analyserRef.current = analyser;
        setPlaying(true);
        await audio.play().catch(stop);
    };

    return (
        <aside className="relative flex h-full min-h-[560px] flex-col justify-end overflow-hidden rounded-[28px] bg-vellum-deep p-4 md:p-8">
            <MarbleCanvas analyserRef={analyserRef} className="absolute inset-0 size-full" />

            <div className="relative flex max-w-[520px] flex-col gap-6 rounded-[24px] bg-ink/90 p-6 text-vellum shadow-[0_30px_60px_-30px_rgba(31,28,36,0.7)] backdrop-blur-md md:p-8">
                <div className="flex flex-col gap-3">
                    <h2 className="mkt-display text-[clamp(1.9rem,3vw,2.6rem)] leading-[1.05]">{copy.title}</h2>
                    <p className="text-[16px] leading-relaxed text-vellum/70">{copy.body}</p>
                </div>

                <button
                    type="button"
                    onClick={toggle}
                    className="flex items-center gap-3 rounded-2xl bg-vellum/8 p-3 text-left ring-1 ring-vellum/12 transition ring-inset hover:bg-vellum/12"
                >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-vellum text-ink">
                        {playing ? <PauseCircle className="size-6" aria-hidden="true" /> : <PlayCircle className="size-6" aria-hidden="true" />}
                    </span>
                    <span className="flex min-w-0 flex-col">
                        <span className="text-[15px] font-medium">{playing ? `Playing ${voice.name}` : `Hear ${voice.name}`}</span>
                        <span className="truncate text-[13px] text-vellum/60">
                            {voice.description.split("·").map((part) => part.trim()).join(", ")}. Watch the marbling move with the voice.
                        </span>
                    </span>
                </button>

                <ul className="flex flex-col gap-4 border-t border-vellum/12 pt-6">
                    {FEATURES.map((feature) => (
                        <li key={feature.title} className="flex gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-angelite/20 text-angelite">
                                <feature.icon className="size-[18px]" aria-hidden="true" />
                            </span>
                            <span className="flex flex-col gap-0.5">
                                <span className="text-[15px] font-medium">{feature.title}</span>
                                <span className="text-[14px] text-vellum/60">{feature.body}</span>
                            </span>
                        </li>
                    ))}
                </ul>

                <dl className="grid grid-cols-3 divide-x divide-vellum/12 border-t border-vellum/12 pt-6">
                    {STATS.map((stat) => (
                        <div key={stat.label} className="flex flex-col gap-1 px-3 first:pl-0">
                            <dt className="sr-only">{stat.label}</dt>
                            <dd className="mkt-display text-[26px] leading-none">{stat.value}</dd>
                            <dd className="text-[13px] text-vellum/60">{stat.label}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </aside>
    );
};
