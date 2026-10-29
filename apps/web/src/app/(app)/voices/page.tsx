import type { Metadata } from "next";
import { isCloningEnabled } from "@/lib/inference";
import { createClient } from "@/lib/supabase/server";
import type { ClonedVoice } from "@/lib/voices";
import { PageHeader } from "../page-header";
import { VoiceLibrary } from "./voice-library";

export const metadata: Metadata = { title: "Voices" };

export default async function VoicesPage() {
    const supabase = await createClient();
    const [{ data: voices }, { data: profile }] = await Promise.all([
        supabase.from("voices").select("id, name, model, language, sample_path, created_at").order("created_at", { ascending: false }).returns<ClonedVoice[]>(),
        supabase.from("profiles").select("plan").maybeSingle(), // row-level security returns only the user's own
    ]);

    return (
        <div className="mx-auto flex max-w-container flex-col gap-8 px-4 lg:px-8">
            <PageHeader title="Voices" description="Clone your own voice in seconds, or pick from the preset library." />
            <VoiceLibrary voices={voices ?? []} serverCloning={isCloningEnabled()} isPro={profile?.plan === "pro"} />
        </div>
    );
}
