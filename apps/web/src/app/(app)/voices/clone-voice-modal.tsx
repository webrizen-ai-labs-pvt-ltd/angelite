"use client";

import { useEffect, useState } from "react";
import { UserPlus01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import type { Key } from "react-aria-components";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { createClient } from "@/lib/supabase/client";
import { CLONE_LANGUAGES } from "@/lib/voices";
import { VoiceRecorder } from "./voice-recorder";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const CONSENT_STATEMENT =
    "This is my own voice, or I have explicit permission from the speaker to clone it. I will not use it to deceive, impersonate or harm anyone.";

const MODELS = [
    { id: "turbo", label: "English", supportingText: "Fastest, best English quality" },
    { id: "multilingual", label: "Multilingual", supportingText: "23 languages" },
];

interface CloneVoiceModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    /** Without the GPU server, voices run on the user's device, which is English only. */
    serverCloning: boolean;
}

export const CloneVoiceModal = ({ isOpen, onOpenChange, serverCloning }: CloneVoiceModalProps) => {
    const router = useRouter();
    const [source, setSource] = useState<"record" | "upload">("record");
    const [name, setName] = useState("");
    const [model, setModel] = useState<"turbo" | "multilingual">("turbo");
    const [language, setLanguage] = useState("en");
    const [sample, setSample] = useState<File | null>(null);
    const [sampleUrl, setSampleUrl] = useState<string | null>(null);
    const [consent, setConsent] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sample) return setSampleUrl(null);
        const url = URL.createObjectURL(sample);
        setSampleUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [sample]);

    const reset = () => {
        setName("");
        setModel("turbo");
        setLanguage("en");
        setSample(null);
        setConsent(false);
        setError(null);
    };

    const close = () => {
        onOpenChange(false);
        reset();
    };

    const save = async () => {
        if (!sample) return;
        setIsSaving(true);
        setError(null);

        const supabase = createClient();
        try {
            const { data: auth } = await supabase.auth.getClaims();
            const userId = auth?.claims?.sub;
            if (!userId) throw new Error("Your session expired. Please sign in again.");

            const extension = sample.name.split(".").pop()?.toLowerCase() || "webm";
            const samplePath = `${userId}/${crypto.randomUUID()}.${extension}`;
            const upload = await supabase.storage.from("voice-samples").upload(samplePath, sample, { contentType: sample.type || "audio/webm" });
            if (upload.error) throw new Error(`Upload failed: ${upload.error.message}`);

            const insert = await supabase.from("voices").insert({
                name: name.trim(),
                model,
                language: model === "multilingual" ? language : "en",
                sample_path: samplePath,
                consent_statement: CONSENT_STATEMENT,
            });
            if (insert.error) {
                await supabase.storage.from("voice-samples").remove([samplePath]);
                throw new Error(insert.error.message);
            }

            close();
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save this voice.");
        } finally {
            setIsSaving(false);
        }
    };

    const canSave = name.trim().length > 0 && sample !== null && consent && !isSaving;

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={(open) => (open ? onOpenChange(true) : close())} isDismissable={!isSaving}>
            <Modal className="max-w-lg">
                <Dialog aria-label="Clone a voice">
                    <div className="relative flex w-full flex-col gap-5 p-4 sm:p-6">
                        <CloseButton theme="light" size="lg" className="absolute top-3 right-3" />
                        <div className="flex flex-col gap-4">
                            <FeaturedIcon icon={UserPlus01} color="brand" theme="light" size="lg" />
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">Clone a voice</h2>
                                <p className="text-sm text-tertiary">A clean 10–20 second sample is enough. Angelite never trains on your audio.</p>
                            </div>
                        </div>

                        <Input label="Voice name" placeholder="e.g. My narrator voice" value={name} onChange={setName} maxLength={60} isRequired />

                        {serverCloning ? (
                            <Select label="Model" items={MODELS} value={model} onChange={(key: Key | null) => key && setModel(key as "turbo" | "multilingual")}>
                                {(item) => (
                                    <Select.Item id={item.id} supportingText={item.supportingText}>
                                        {item.label}
                                    </Select.Item>
                                )}
                            </Select>
                        ) : (
                            <p className="text-sm text-tertiary">
                                Your voice will speak English and generate on your own device. More languages arrive with server cloning.
                            </p>
                        )}

                        {model === "multilingual" && (
                            <Select
                                label="Main language"
                                items={CLONE_LANGUAGES.map((lang) => ({ id: lang.id, label: lang.name }))}
                                value={language}
                                onChange={(key: Key | null) => key && setLanguage(String(key))}
                                popoverClassName="max-h-72"
                            >
                                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                            </Select>
                        )}

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-secondary">Voice sample</p>
                                {!sample && (
                                    <ButtonGroup
                                        size="sm"
                                        disallowEmptySelection
                                        selectedKeys={new Set([source])}
                                        onSelectionChange={(keys) => {
                                            const [next] = keys;
                                            if (next) setSource(next as "record" | "upload");
                                        }}
                                    >
                                        <ButtonGroupItem id="record">Record</ButtonGroupItem>
                                        <ButtonGroupItem id="upload">Upload</ButtonGroupItem>
                                    </ButtonGroup>
                                )}
                            </div>

                            {sample && sampleUrl ? (
                                <div className="flex flex-col gap-3 rounded-xl p-3 ring-1 ring-secondary ring-inset">
                                    <audio src={sampleUrl} controls className="w-full" />
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate text-sm text-tertiary">{sample.name}</p>
                                        <Button color="link-gray" size="sm" onPress={() => setSample(null)}>
                                            Replace
                                        </Button>
                                    </div>
                                </div>
                            ) : source === "record" ? (
                                <VoiceRecorder onRecorded={setSample} />
                            ) : (
                                <FileUpload.DropZone
                                    accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg"
                                    allowsMultiple={false}
                                    maxSize={MAX_FILE_BYTES}
                                    hint="MP3, WAV, M4A, WebM or OGG, up to 10 MB. 10–20 seconds of clear speech works best."
                                    onDropFiles={(files) => files[0] && setSample(files[0])}
                                    onDropUnacceptedFiles={() => setError("That file type isn't supported. Upload an audio file.")}
                                    onSizeLimitExceed={() => setError("That file is larger than 10 MB.")}
                                />
                            )}
                        </div>

                        <Checkbox isSelected={consent} onChange={setConsent} label="I have the right to clone this voice" hint={CONSENT_STATEMENT} />

                        {error && (
                            <p role="alert" className="rounded-lg bg-error-primary px-3.5 py-2.5 text-sm text-error-primary">
                                {error}
                            </p>
                        )}

                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                            <Button color="secondary" size="lg" onPress={close} isDisabled={isSaving}>
                                Cancel
                            </Button>
                            <Button size="lg" onPress={save} isDisabled={!canSave} isLoading={isSaving} showTextWhileLoading>
                                Save voice
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
};
