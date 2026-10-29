import type { SupabaseClient } from "@supabase/supabase-js";
import "server-only";
import { createAdminClient } from "./supabase/server";
import { charactersUsedThisMonth } from "./usage";
import { AUDIO_EXTENSIONS, type AudioFormat } from "./voices";

type Quota = { ok: true; used: number; isPro: boolean } | { ok: false; error: string; status: number };

/** Checks that `characters` more fit in this month's allowance. */
export async function checkQuota(supabase: SupabaseClient, userId: string, characters: number): Promise<Quota> {
    const loadProfile = () =>
        supabase.from("profiles").select("plan, monthly_character_limit, characters_used, usage_period_start").eq("id", userId).maybeSingle();
    let { data: profile } = await loadProfile();
    if (!profile) {
        // Accounts created before the schema existed never got a profile from the sign-up trigger.
        await createAdminClient().from("profiles").upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
        ({ data: profile } = await loadProfile());
    }
    if (!profile) return { ok: false, error: "Your account isn't set up yet. Please try again.", status: 500 };

    const used = charactersUsedThisMonth(profile);
    if (profile.plan === "pro") return { ok: true, used, isPro: true };
    if (used + characters > profile.monthly_character_limit) {
        return {
            ok: false,
            error: `Monthly limit reached: ${used.toLocaleString()} of ${profile.monthly_character_limit.toLocaleString()} characters used`,
            status: 402,
        };
    }
    return { ok: true, used, isPro: false };
}

type NewGeneration = {
    userId: string;
    text: string;
    /** Spoken characters (markup excluded). */
    characters: number;
    voiceType: "preset" | "cloned";
    voiceId: string;
    voiceName: string;
    model: string;
    format: AudioFormat;
    audio: ArrayBuffer | Blob;
    contentType: string;
    durationSeconds: number | null;
};

/**
 * Stores the audio in history and counts the characters. A storage hiccup shouldn't cost the user their audio,
 * so history failures are logged, not thrown. Returns the new id and the month's updated usage (null if unknown).
 */
export async function saveGeneration(supabase: SupabaseClient, generation: NewGeneration) {
    const id = crypto.randomUUID();
    const audioPath = `${generation.userId}/${id}.${AUDIO_EXTENSIONS[generation.format]}`;
    const upload = await supabase.storage.from("generations").upload(audioPath, generation.audio, { contentType: generation.contentType });
    let saved = false;
    if (upload.error) {
        console.error("History upload failed", upload.error);
    } else {
        const insert = await supabase.from("generations").insert({
            id,
            text: generation.text,
            voice_type: generation.voiceType,
            voice_id: generation.voiceId,
            voice_name: generation.voiceName,
            model: generation.model,
            format: generation.format,
            audio_path: audioPath,
            duration_seconds: generation.durationSeconds,
            characters: generation.characters,
        });
        if (insert.error) console.error("History insert failed", insert.error);
        else saved = true;
    }

    const usage = await supabase.rpc("record_character_usage", { n: generation.characters });
    if (usage.error) console.error("Usage update failed", usage.error);

    return { id, saved, audioPath, charactersUsed: typeof usage.data === "number" ? usage.data : null };
}
