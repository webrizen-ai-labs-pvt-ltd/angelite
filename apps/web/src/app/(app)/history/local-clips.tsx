"use client";

import { useCallback, useEffect, useState } from "react";
import { Download01, Trash01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { type LocalClip, deleteClip, ensureFolderAccess, listClips, readClip } from "@/lib/local-library";
import { LocalStorageSettings } from "../local-storage-settings";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

const formatDuration = (seconds: number) => {
    const rounded = Math.round(seconds);
    return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
};

/** Clips generated on this device. They live only here (a chosen folder or browser storage), never on our servers. */
export const LocalClips = () => {
    const [clips, setClips] = useState<LocalClip[] | null>(null);
    const [urls, setUrls] = useState<Record<string, string | null>>({});

    const load = useCallback(async () => {
        const list = await listClips().catch(() => []);
        const entries = await Promise.all(
            list.map(async (clip) => {
                const file = await readClip(clip);
                return [clip.id, file ? URL.createObjectURL(file) : null] as const;
            }),
        );
        setUrls((previous) => {
            Object.values(previous).forEach((url) => url && URL.revokeObjectURL(url));
            return Object.fromEntries(entries);
        });
        setClips(list);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => () => Object.values(urls).forEach((url) => url && URL.revokeObjectURL(url)), [urls]);

    const remove = async (clip: LocalClip) => {
        if (clip.location === "folder" && !(await ensureFolderAccess())) return;
        await deleteClip(clip);
        void load();
    };

    const missingAccess = clips?.some((clip) => clip.location === "folder" && !urls[clip.id]);

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-primary">On this device</h2>
                <p className="text-sm text-tertiary">Voices generated on your device are saved here only. They never leave this computer.</p>
            </div>
            <div className="rounded-xl bg-secondary px-4 py-3">
                <LocalStorageSettings onChange={load} />
            </div>

            {missingAccess && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-primary px-4 py-3">
                    <p className="text-sm text-warning-primary">Your browser needs permission again to play clips from your folder.</p>
                    <Button size="sm" color="secondary" onPress={async () => (await ensureFolderAccess()) && load()}>
                        Allow access
                    </Button>
                </div>
            )}

            {clips === null ? null : clips.length === 0 ? (
                <p className="rounded-xl px-4 py-6 text-center text-sm text-tertiary ring-1 ring-secondary ring-inset">
                    Nothing yet. Generate with a cloned voice on this device and it will appear here.
                </p>
            ) : (
                <ul className="flex flex-col divide-y divide-secondary rounded-xl ring-1 ring-secondary ring-inset">
                    {clips.map((clip) => {
                        const url = urls[clip.id];
                        return (
                            <li key={clip.id} className="flex flex-col gap-3 p-4 sm:p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-primary">{clip.voiceName}</p>
                                            <Badge size="sm" color="gray">
                                                WAV
                                            </Badge>
                                            <Badge size="sm" color="gray">
                                                {formatDuration(clip.durationSeconds)}
                                            </Badge>
                                            <Badge size="sm" color="brand">
                                                {clip.location === "folder" ? "In your folder" : "In browser"}
                                            </Badge>
                                        </div>
                                        <p className="line-clamp-2 text-sm text-tertiary">{clip.text}</p>
                                        <p className="truncate text-xs text-quaternary">
                                            {dateFormat.format(new Date(clip.createdAt))} · {clip.fileName}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        {url && (
                                            <ButtonUtility
                                                href={url}
                                                download={clip.fileName}
                                                icon={Download01}
                                                size="xs"
                                                color="tertiary"
                                                tooltip="Download"
                                            />
                                        )}
                                        <ButtonUtility icon={Trash01} size="xs" color="tertiary" tooltip="Delete" onPress={() => remove(clip)} />
                                    </div>
                                </div>
                                {url ? (
                                    <audio src={url} controls preload="none" className="w-full" />
                                ) : (
                                    <p className="text-sm text-tertiary">
                                        {clip.location === "folder" ? "Allow folder access to play this clip, or it was moved." : "This file is missing."}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
};
