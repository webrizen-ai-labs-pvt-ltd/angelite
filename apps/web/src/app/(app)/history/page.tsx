import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HISTORY_RETENTION_DAYS } from "@/lib/usage";
import { PageHeader } from "../page-header";
import { type HistoryItem, HistoryList } from "./history-list";
import { LocalClips } from "./local-clips";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
    const supabase = await createClient();
    const { data: generations } = await supabase
        .from("generations")
        .select("id, text, voice_name, model, format, audio_path, duration_seconds, characters, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

    const rows = generations ?? [];
    const { data: signed } = rows.length
        ? await supabase.storage.from("generations").createSignedUrls(
              rows.map((row) => row.audio_path),
              60 * 60,
          )
        : { data: [] };
    const urlByPath = new Map((signed ?? []).map((entry) => [entry.path, entry.signedUrl]));

    const items: HistoryItem[] = rows.map((row) => ({ ...row, url: urlByPath.get(row.audio_path) ?? null }));

    return (
        <div className="mx-auto flex max-w-container flex-col gap-8 px-4 lg:px-8">
            <PageHeader title="History" description="Everything you've generated, on this device and online." />
            <LocalClips />
            <section className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold text-primary">Saved online</h2>
                    <p className="text-sm text-tertiary">Your last 50 server generations. Audio is kept for {HISTORY_RETENTION_DAYS} days.</p>
                </div>
                <HistoryList items={items} />
            </section>
        </div>
    );
}
