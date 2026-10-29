"use client";

import { useState } from "react";
import { Plus, Recording02, Trash01, UserSquare } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { createClient } from "@/lib/supabase/client";
import { CLONE_LANGUAGES, type ClonedVoice, PRESET_VOICES } from "@/lib/voices";
import { VoicePreviewButton } from "../voice-preview-button";
import { CloneVoiceModal } from "./clone-voice-modal";

const VOICE_LIMIT = 3;

const languageName = (id: string) => CLONE_LANGUAGES.find((language) => language.id === id)?.name ?? id;

export const VoiceLibrary = ({ voices, serverCloning, isPro }: { voices: ClonedVoice[]; serverCloning: boolean; isPro: boolean }) => {
    const router = useRouter();
    const [isCloneOpen, setIsCloneOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<ClonedVoice | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const atLimit = !isPro && voices.length >= VOICE_LIMIT;

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setIsDeleting(true);
        setError(null);
        const supabase = createClient();
        const { error: deleteError } = await supabase.from("voices").delete().eq("id", pendingDelete.id);
        if (deleteError) {
            setError(deleteError.message);
        } else {
            await supabase.storage.from("voice-samples").remove([pendingDelete.sample_path]);
            setPendingDelete(null);
            router.refresh();
        }
        setIsDeleting(false);
    };

    return (
        <div className="flex flex-col gap-10">
            <section className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-primary">Your voices</h2>
                        <Badge size="sm" color="gray">
                            {isPro ? voices.length : `${voices.length} / ${VOICE_LIMIT}`}
                        </Badge>
                    </div>
                    <Button iconLeading={Plus} onPress={() => setIsCloneOpen(true)} isDisabled={atLimit}>
                        Clone a voice
                    </Button>
                </div>

                {atLimit && <p className="text-sm text-tertiary">You've reached the {VOICE_LIMIT}-voice limit on the free plan. Delete one to add another.</p>}

                {voices.length === 0 ? (
                    <div className="rounded-xl py-10 ring-1 ring-secondary ring-inset">
                        <EmptyState size="sm">
                            <EmptyState.Header pattern="none">
                                <EmptyState.FeaturedIcon icon={UserSquare} color="brand" theme="light" />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>No cloned voices yet</EmptyState.Title>
                                <EmptyState.Description>Record or upload 10–20 seconds of speech to create a voice of your own.</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button iconLeading={Plus} onPress={() => setIsCloneOpen(true)}>
                                    Clone a voice
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {voices.map((voice) => (
                            <li key={voice.id} className="flex flex-col gap-4 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset">
                                <div className="flex items-start gap-3">
                                    <Avatar initials={voice.name.slice(0, 2).toUpperCase()} size="md" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-md font-semibold text-primary">{voice.name}</p>
                                        <p className="text-sm text-tertiary">
                                            {voice.model === "multilingual" ? `Multilingual · ${languageName(voice.language)}` : "English"}
                                        </p>
                                    </div>
                                    <ButtonUtility icon={Trash01} size="xs" color="tertiary" tooltip="Delete voice" onPress={() => setPendingDelete(voice)} />
                                </div>
                                <Button
                                    href={`/studio?voice=${encodeURIComponent(`cloned:${voice.id}`)}`}
                                    color="secondary"
                                    size="sm"
                                    iconLeading={Recording02}
                                >
                                    Use in Studio
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-primary">Preset voices</h2>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {PRESET_VOICES.map((voice) => (
                        <li key={voice.id} className="flex items-center gap-3 rounded-xl p-4 ring-1 ring-secondary ring-inset">
                            <Avatar initials={voice.name.slice(0, 2).toUpperCase()} size="sm" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-primary">{voice.name}</p>
                                <p className="truncate text-sm text-tertiary">{voice.description}</p>
                            </div>
                            <VoicePreviewButton voiceId={voice.id} voiceName={voice.name} size="sm" />
                            <Button href={`/studio?voice=${encodeURIComponent(`preset:${voice.id}`)}`} color="link-color" size="sm">
                                Use
                            </Button>
                        </li>
                    ))}
                </ul>
            </section>

            <CloneVoiceModal isOpen={isCloneOpen} onOpenChange={setIsCloneOpen} serverCloning={serverCloning} />

            <ModalOverlay isOpen={pendingDelete !== null} onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)} isDismissable>
                <Modal className="max-w-100">
                    <Dialog aria-label="Delete voice">
                        <div className="flex w-full flex-col gap-5 p-4 sm:p-6">
                            <FeaturedIcon icon={Trash01} color="error" theme="light" size="lg" />
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">Delete “{pendingDelete?.name}”?</h2>
                                <p className="text-sm text-tertiary">
                                    The voice and its recording are removed permanently. Audio you already generated stays in your history.
                                </p>
                            </div>
                            {error && <p className="text-sm text-error-primary">{error}</p>}
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Button color="secondary" size="lg" onPress={() => setPendingDelete(null)} isDisabled={isDeleting}>
                                    Cancel
                                </Button>
                                <Button color="primary-destructive" size="lg" onPress={confirmDelete} isLoading={isDeleting} showTextWhileLoading>
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </div>
    );
};
