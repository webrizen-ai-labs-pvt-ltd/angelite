"use client";

import { useState } from "react";
import { ClockRewind, Download01, Recording02, Trash01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { createClient } from "@/lib/supabase/client";

export type HistoryItem = {
    id: string;
    text: string;
    voice_name: string;
    model: string;
    format: string;
    audio_path: string;
    duration_seconds: number | null;
    characters: number;
    created_at: string;
    url: string | null;
};

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const rounded = Math.round(seconds);
    return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
};

export const HistoryList = ({ items }: { items: HistoryItem[] }) => {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const remove = async (item: HistoryItem) => {
        setDeletingId(item.id);
        const supabase = createClient();
        const { error } = await supabase.from("generations").delete().eq("id", item.id);
        if (!error) {
            await supabase.storage.from("generations").remove([item.audio_path]);
            router.refresh();
        }
        setDeletingId(null);
    };

    if (items.length === 0) {
        return (
            <div className="rounded-xl py-12 ring-1 ring-secondary ring-inset">
                <EmptyState size="sm">
                    <EmptyState.Header pattern="none">
                        <EmptyState.FeaturedIcon icon={ClockRewind} color="gray" theme="modern" />
                    </EmptyState.Header>
                    <EmptyState.Content>
                        <EmptyState.Title>Nothing generated yet</EmptyState.Title>
                        <EmptyState.Description>Audio you create in the Studio shows up here.</EmptyState.Description>
                    </EmptyState.Content>
                    <EmptyState.Footer>
                        <Button href="/studio" iconLeading={Recording02}>
                            Open Studio
                        </Button>
                    </EmptyState.Footer>
                </EmptyState>
            </div>
        );
    }

    return (
        <ul className="flex flex-col divide-y divide-secondary rounded-xl ring-1 ring-secondary ring-inset">
            {items.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-primary">{item.voice_name}</p>
                                <Badge size="sm" color="gray">
                                    {item.format.toUpperCase()}
                                </Badge>
                                {formatDuration(item.duration_seconds) && (
                                    <Badge size="sm" color="gray">
                                        {formatDuration(item.duration_seconds)}
                                    </Badge>
                                )}
                            </div>
                            <p className="line-clamp-2 text-sm text-tertiary">{item.text}</p>
                            <p className="text-xs text-quaternary">
                                {dateFormat.format(new Date(item.created_at))} · {item.characters.toLocaleString()} characters
                            </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                            {item.url && <ButtonUtility href={item.url} icon={Download01} size="xs" color="tertiary" tooltip="Download" />}
                            <ButtonUtility
                                icon={Trash01}
                                size="xs"
                                color="tertiary"
                                tooltip="Delete"
                                isDisabled={deletingId === item.id}
                                onPress={() => remove(item)}
                            />
                        </div>
                    </div>
                    {item.url ? (
                        <audio src={item.url} controls preload="none" className="w-full" />
                    ) : (
                        <p className="text-sm text-tertiary">Audio unavailable.</p>
                    )}
                </li>
            ))}
        </ul>
    );
};
