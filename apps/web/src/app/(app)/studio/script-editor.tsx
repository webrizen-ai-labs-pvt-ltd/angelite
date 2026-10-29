"use client";

import { useRef, useState } from "react";
import { BookOpen01, ChevronDown, PauseCircle, Trash01, VolumeMax } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { TextArea } from "@/components/base/textarea/textarea";
import { type EffectId, PAUSE_PRESETS, type Pronunciation, pauseTag, scriptLimit, scriptStats } from "@/lib/script";
import { cx } from "@/utils/cx";
import { PronunciationsModal } from "./pronunciations-modal";

export const EXAMPLES: { id: string; name: string; text: string; effect?: EffectId }[] = [
    {
        id: "story",
        name: "Story narration",
        text: "The city was quiet that night. [pause 1s] Too quiet. [pause 0.5s] Somewhere in the distance, a door slammed shut, and every light on the street went out at once.",
    },
    {
        id: "podcast",
        name: "Podcast intro",
        text: "Welcome back to the show! [pause 0.5s] Today we're talking about the one habit that quietly changes everything. [pause 1s] Let's get into it.",
        effect: "room",
    },
    {
        id: "ad",
        name: "Radio ad",
        text: "Tired of slow mornings? [pause 0.5s] Meet Brewly, the coffee maker that's ready before you are. [pause 1s] Brewly. Wake up better.",
        effect: "radio",
    },
    {
        id: "phone",
        name: "Phone menu",
        text: "Thank you for calling. [pause 0.5s] For sales, press one. [pause 0.5s] For support, press two. [pause 0.5s] To hear these options again, press nine.",
        effect: "telephone",
    },
    {
        id: "announcement",
        name: "Stadium announcement",
        text: "Ladies and gentlemen. [pause 1s] Please welcome to the stage. [pause 1.5s] The one. [pause 0.5s] The only.",
        effect: "hall",
    },
];

const formatDuration = (seconds: number) =>
    seconds < 60 ? `~${Math.max(1, Math.round(seconds))} s` : `~${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;

interface ScriptEditorProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onExample: (example: (typeof EXAMPLES)[number]) => void;
    pronunciations: Pronunciation[];
    onPronunciationsChange: (rules: Pronunciation[]) => void;
    /** Spoken characters allowed per generation; null = unlimited. */
    limit: number | null;
    isDisabled?: boolean;
}

export const ScriptEditor = ({ value, onChange, onSubmit, onExample, pronunciations, onPronunciationsChange, limit, isDisabled }: ScriptEditorProps) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [isPronunciationsOpen, setIsPronunciationsOpen] = useState(false);
    const stats = scriptStats(value);
    const overLimit = limit !== null && stats.characters > limit;

    /** Inserts a snippet at the cursor (or replaces the selection), padded with spaces, and keeps focus there. */
    const insertAtCursor = (snippet: string) => {
        const element = textAreaRef.current;
        const start = element?.selectionStart ?? value.length;
        const end = element?.selectionEnd ?? value.length;
        const before = value.slice(0, start);
        const after = value.slice(end);
        const padded = `${before && !/\s$/.test(before) ? " " : ""}${snippet}${after && !/^\s/.test(after) ? " " : ""}`;
        onChange(before + padded + after);
        requestAnimationFrame(() => {
            element?.focus();
            const cursor = start + padded.length;
            element?.setSelectionRange(cursor, cursor);
        });
    };

    return (
        <div
            className={cx(
                "flex flex-col rounded-xl bg-primary shadow-xs ring-1 ring-primary ring-inset focus-within:ring-2 focus-within:ring-brand",
                isDisabled && "opacity-50",
            )}
        >
            <div className="flex flex-wrap items-center gap-1 border-b border-secondary px-2 py-1.5">
                <Dropdown.Root>
                    <Button size="sm" color="tertiary" iconLeading={PauseCircle} iconTrailing={ChevronDown} isDisabled={isDisabled}>
                        Pause
                    </Button>
                    <Dropdown.Popover className="w-44">
                        <Dropdown.Menu onAction={(key) => insertAtCursor(pauseTag(Number(key)))}>
                            {PAUSE_PRESETS.map((seconds) => (
                                <Dropdown.Item
                                    key={seconds}
                                    id={String(seconds)}
                                    label={`${seconds} second${seconds === 1 ? "" : "s"}`}
                                    addon={pauseTag(seconds)}
                                />
                            ))}
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown.Root>

                <Button size="sm" color="tertiary" iconLeading={VolumeMax} onPress={() => setIsPronunciationsOpen(true)} isDisabled={isDisabled}>
                    {pronunciations.length ? `Pronunciations (${pronunciations.length})` : "Pronunciations"}
                </Button>

                <Dropdown.Root>
                    <Button size="sm" color="tertiary" iconLeading={BookOpen01} iconTrailing={ChevronDown} isDisabled={isDisabled}>
                        Examples
                    </Button>
                    <Dropdown.Popover className="w-56">
                        <Dropdown.Menu
                            onAction={(key) => {
                                const example = EXAMPLES.find((item) => item.id === key);
                                if (example) onExample(example);
                            }}
                        >
                            {EXAMPLES.map((example) => (
                                <Dropdown.Item key={example.id} id={example.id} label={example.name} />
                            ))}
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown.Root>

                <div className="ml-auto">
                    <ButtonUtility
                        icon={Trash01}
                        size="xs"
                        color="tertiary"
                        tooltip="Clear text"
                        onPress={() => onChange("")}
                        isDisabled={isDisabled || !value}
                    />
                </div>
            </div>

            <TextArea
                aria-label="Text to speak"
                value={value}
                onChange={onChange}
                maxLength={scriptLimit(limit)}
                rows={12}
                isDisabled={isDisabled}
                placeholder="Type or paste the text you want to hear… Add [pause 1s] anywhere for a break."
                textAreaRef={textAreaRef}
                textAreaClassName="min-h-64 resize-y rounded-none bg-transparent text-lg leading-relaxed shadow-none ring-0 focus:ring-0"
                onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        onSubmit();
                    }
                }}
            />

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-secondary px-3.5 py-2 text-sm">
                <p
                    className={cx(
                        "tabular-nums",
                        overLimit ? "text-error-primary" : limit !== null && stats.characters > limit * 0.9 ? "text-warning-primary" : "text-tertiary",
                    )}
                >
                    {stats.characters.toLocaleString()} {limit === null ? "characters (no limit)" : `/ ${limit.toLocaleString()} characters`} ·{" "}
                    {stats.words.toLocaleString()} words
                    {stats.pauses > 0 && ` · ${stats.pauses} ${stats.pauses === 1 ? "pause" : "pauses"}`}
                    {stats.words > 0 && ` · ${formatDuration(stats.estimatedSeconds)}`}
                </p>
                <p className="hidden text-quaternary sm:block">Ctrl + Enter to generate</p>
            </div>

            <PronunciationsModal isOpen={isPronunciationsOpen} onOpenChange={setIsPronunciationsOpen} rules={pronunciations} onSave={onPronunciationsChange} />
        </div>
    );
};
