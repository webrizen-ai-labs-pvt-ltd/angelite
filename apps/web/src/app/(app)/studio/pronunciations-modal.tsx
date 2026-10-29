"use client";

import { useEffect, useState } from "react";
import { Plus, Trash01, VolumeMax } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import type { Pronunciation } from "@/lib/script";

const STORAGE_KEY = "angelite.pronunciations";

/** Pronunciation rules live in this browser (localStorage), so they're a per-device convenience. */
export function usePronunciations() {
    const [rules, setRules] = useState<Pronunciation[]>([]);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
            if (Array.isArray(stored)) setRules(stored.filter((rule) => typeof rule?.word === "string" && typeof rule?.soundsLike === "string"));
        } catch {
            // storage blocked or corrupt: start empty
        }
    }, []);

    const save = (next: Pronunciation[]) => {
        setRules(next);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            // storage blocked: rules still apply until the page reloads
        }
    };

    return [rules, save] as const;
}

interface PronunciationsModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    rules: Pronunciation[];
    onSave: (rules: Pronunciation[]) => void;
}

export const PronunciationsModal = ({ isOpen, onOpenChange, rules, onSave }: PronunciationsModalProps) => {
    const [draft, setDraft] = useState<Pronunciation[]>(rules);

    useEffect(() => {
        if (isOpen) setDraft(rules.length ? rules : [{ word: "", soundsLike: "" }]);
    }, [isOpen, rules]);

    const update = (index: number, patch: Partial<Pronunciation>) =>
        setDraft((current) => current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));

    const save = () => {
        onSave(
            draft.filter((rule) => rule.word.trim() && rule.soundsLike.trim()).map((rule) => ({ word: rule.word.trim(), soundsLike: rule.soundsLike.trim() })),
        );
        onOpenChange(false);
    };

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
            <Modal className="max-w-xl">
                <Dialog aria-label="Pronunciations">
                    <div className="relative flex w-full flex-col gap-5 p-4 sm:p-6">
                        <CloseButton theme="light" size="lg" className="absolute top-3 right-3" />
                        <div className="flex flex-col gap-4">
                            <FeaturedIcon icon={VolumeMax} color="brand" theme="light" size="lg" />
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">Pronunciations</h2>
                                <p className="text-sm text-tertiary">
                                    Teach voices how to say names and brands by spelling them the way they sound, e.g. “Angelite” → “An-juh-lite”. Works with
                                    every voice. Saved in this browser.
                                </p>
                            </div>
                        </div>

                        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
                            {draft.map((rule, index) => (
                                <div key={index} className="flex items-end gap-2">
                                    <Input
                                        label={index === 0 ? "Word" : undefined}
                                        aria-label="Word"
                                        placeholder="Angelite"
                                        value={rule.word}
                                        onChange={(word) => update(index, { word })}
                                        maxLength={60}
                                    />
                                    <Input
                                        label={index === 0 ? "Sounds like" : undefined}
                                        aria-label="Sounds like"
                                        placeholder="An-juh-lite"
                                        value={rule.soundsLike}
                                        onChange={(soundsLike) => update(index, { soundsLike })}
                                        maxLength={80}
                                    />
                                    <div className="flex h-10 items-center">
                                        <ButtonUtility
                                            icon={Trash01}
                                            size="xs"
                                            color="tertiary"
                                            tooltip="Remove"
                                            onPress={() => setDraft((current) => current.filter((_, i) => i !== index))}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div>
                            <Button
                                color="link-color"
                                size="sm"
                                iconLeading={Plus}
                                onPress={() => setDraft((current) => [...current, { word: "", soundsLike: "" }])}
                            >
                                Add word
                            </Button>
                        </div>

                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                            <Button color="secondary" size="lg" onPress={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button size="lg" onPress={save}>
                                Save
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
};
