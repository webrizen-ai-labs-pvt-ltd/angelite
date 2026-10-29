// Studio script markup, shared by the server route and the on-device engine.
//   "Hello [pause 1.5s] world"  ->  speaks "Hello", 1.5 s of silence, then "world".
// Must match PAUSE_RE / EFFECTS in services/inference/app.py.
import { MAX_TEXT_CHARS } from "./voices";

export const MAX_PAUSE_SECONDS = 5;
export const PAUSE_PRESETS = [0.5, 1, 2, 3] as const;

// Spoken characters per generation. Pro is unlimited on-device; on the server it's bounded by Vercel's 300 s
// function limit (measured: ~1,900 characters take ~110 s on a cold Kokoro container, so 3,000 stays well inside).
export const PRO_SERVER_TEXT_CHARS = 3000;
const UNLIMITED_SCRIPT_CHARS = 200_000; // just a sanity cap for the text box

/** Spoken-character limit for one generation, or null for unlimited. */
export const characterLimit = (isPro: boolean, onDevice: boolean) => (isPro ? (onDevice ? null : PRO_SERVER_TEXT_CHARS) : MAX_TEXT_CHARS);

/** Raw script length allowed, leaving room for [pause] markup. */
export const scriptLimit = (limit: number | null) => (limit === null ? UNLIMITED_SCRIPT_CHARS : limit * 2);

const PAUSE_RE = /\[pause\s+(\d+(?:\.\d+)?)\s*(ms|s)?\]/gi;

export type ScriptSegment = { type: "text"; text: string } | { type: "pause"; seconds: number };

export const pauseTag = (seconds: number) => `[pause ${seconds}s]`;

export function parseScript(script: string): ScriptSegment[] {
    const segments: ScriptSegment[] = [];
    let last = 0;
    for (const match of script.matchAll(PAUSE_RE)) {
        const text = script.slice(last, match.index).trim();
        if (text) segments.push({ type: "text", text });
        const value = Number.parseFloat(match[1]) / (match[2]?.toLowerCase() === "ms" ? 1000 : 1);
        segments.push({ type: "pause", seconds: Math.min(value, MAX_PAUSE_SECONDS) });
        last = match.index + match[0].length;
    }
    const rest = script.slice(last).trim();
    if (rest) segments.push({ type: "text", text: rest });
    return segments;
}

/** The words that will actually be spoken: markup removed. This is what counts toward limits. */
export const spokenText = (script: string) => script.replace(PAUSE_RE, " ").replace(/\s+/g, " ").trim();

export function scriptStats(script: string) {
    const segments = parseScript(script);
    const spoken = spokenText(script);
    const words = spoken ? spoken.split(" ").length : 0;
    const pauseSeconds = segments.reduce((sum, segment) => sum + (segment.type === "pause" ? segment.seconds : 0), 0);
    const pauses = segments.filter((segment) => segment.type === "pause").length;
    // ~150 words a minute is a typical narration pace.
    return { characters: spoken.length, words, pauses, estimatedSeconds: (words / 150) * 60 + pauseSeconds };
}

// ---------------------------------------------------------------------------
// Pronunciations: "sounds like" replacements applied before synthesis, e.g. Angelite -> An-juh-lite.
// ---------------------------------------------------------------------------

export type Pronunciation = { word: string; soundsLike: string };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function applyPronunciations(script: string, pronunciations: Pronunciation[]) {
    return pronunciations.reduce((text, { word, soundsLike }) => {
        if (!word.trim() || !soundsLike.trim()) return text;
        return text.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word.trim())}(?![\\p{L}\\p{N}])`, "giu"), soundsLike.trim());
    }, script);
}

// ---------------------------------------------------------------------------
// Effects: applied by ffmpeg on the server and by Web Audio on the device (lib/browser-tts/effects.ts).
// ---------------------------------------------------------------------------

export const EFFECTS = [
    { id: "none", name: "None", description: "Clean, dry voice" },
    { id: "room", name: "Room", description: "Small, natural room" },
    { id: "hall", name: "Hall", description: "Large, echoing space" },
    { id: "echo", name: "Echo", description: "Distinct repeating echo" },
    { id: "telephone", name: "Telephone", description: "Narrow phone line" },
    { id: "radio", name: "Radio", description: "Compressed broadcast" },
] as const;

export type EffectId = (typeof EFFECTS)[number]["id"];

export const isEffectId = (value: unknown): value is EffectId => EFFECTS.some((effect) => effect.id === value);
