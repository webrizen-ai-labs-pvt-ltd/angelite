"use client";

import { useEffect, useState } from "react";
import { PlayCircle, StopCircle } from "@untitledui/icons";
import { ButtonUtility } from "@/components/base/buttons/button-utility";

// One shared player, so starting a preview stops whichever one is playing.
let player: HTMLAudioElement | null = null;
const listeners = new Set<(src: string | null) => void>();

const setPlaying = (src: string | null) => listeners.forEach((listener) => listener(src));

const play = (src: string) => {
    player?.pause();
    player = new Audio(src);
    player.onended = () => setPlaying(null);
    player.onerror = () => setPlaying(null);
    player.play().catch(() => setPlaying(null));
    setPlaying(src);
};

const stop = () => {
    player?.pause();
    setPlaying(null);
};

/** Plays the pre-generated sample for a preset voice (public/voice-previews/<id>.mp3). */
export const VoicePreviewButton = ({ voiceId, voiceName, size = "xs" }: { voiceId: string; voiceName: string; size?: "xs" | "sm" }) => {
    const src = `/voice-previews/${voiceId}.mp3`;
    const [playingSrc, setPlayingSrc] = useState<string | null>(null);
    const isPlaying = playingSrc === src;

    useEffect(() => {
        listeners.add(setPlayingSrc);
        return () => {
            listeners.delete(setPlayingSrc);
        };
    }, []);

    // Stop audio when the component that started it goes away (e.g. navigating off the page).
    useEffect(
        () => () => {
            if (player?.src.endsWith(src)) stop();
        },
        [src],
    );

    return (
        <ButtonUtility
            icon={isPlaying ? StopCircle : PlayCircle}
            size={size}
            color="tertiary"
            tooltip={isPlaying ? "Stop preview" : `Preview ${voiceName}`}
            aria-label={isPlaying ? "Stop preview" : `Preview ${voiceName}`}
            onPress={() => (isPlaying ? stop() : play(src))}
        />
    );
};
