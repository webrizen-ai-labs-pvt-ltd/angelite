import { checkQuota, saveGeneration } from "@/lib/generations";
import { type InferenceAudio, InferenceError, isCloningEnabled, synthesizeClone, synthesizePreset } from "@/lib/inference";
import { characterLimit, isEffectId, scriptLimit, spokenText } from "@/lib/script";
import { createClient } from "@/lib/supabase/server";
import { AUDIO_EXTENSIONS, AUDIO_FORMATS, type AudioFormat, type ClonedVoice, PRESET_VOICES, isCloneLanguage } from "@/lib/voices";

// GPU cold starts can take a while; Vercel Hobby allows up to 300 s.
export const maxDuration = 300;

type TTSBody = {
    text?: unknown;
    voice?: { type?: unknown; id?: unknown };
    speed?: unknown;
    format?: unknown;
    language?: unknown;
    effect?: unknown;
};

const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getClaims();
    const userId = auth?.claims?.sub;
    if (!userId) return jsonError("Sign in to generate audio", 401);

    const body = (await request.json().catch(() => ({}))) as TTSBody;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const format = (AUDIO_FORMATS as readonly unknown[]).includes(body.format) ? (body.format as AudioFormat) : "mp3";
    const speed = typeof body.speed === "number" && body.speed >= 0.5 && body.speed <= 2 ? body.speed : 1;
    const voiceType = body.voice?.type;
    const voiceId = typeof body.voice?.id === "string" ? body.voice.id : "";
    const effect = isEffectId(body.effect) ? body.effect : "none";
    // `text` may contain [pause 1s] markup; only spoken characters count toward limits.
    const characters = spokenText(text).length;

    if (!characters) return jsonError("Enter some text to generate", 400);

    // Quota check. Usage resets each calendar month (see record_character_usage in the migration).
    const quota = await checkQuota(supabase, userId, characters);
    if (!quota.ok) return jsonError(quota.error, quota.status);

    const limit = characterLimit(quota.isPro, false)!;
    if (characters > limit || text.length > scriptLimit(limit)) return jsonError(`Text is limited to ${limit.toLocaleString()} characters per generation`, 400);

    let result: InferenceAudio;
    let voiceName: string;
    let model: string;

    try {
        if (voiceType === "preset") {
            const preset = PRESET_VOICES.find((voice) => voice.id === voiceId);
            if (!preset) return jsonError("Unknown voice", 400);
            voiceName = preset.name;
            model = "kokoro-82m";
            result = await synthesizePreset({ text, voice: preset.id, speed, format, effect });
        } else if (voiceType === "cloned") {
            if (!isCloningEnabled()) return jsonError("Voice cloning is temporarily unavailable", 503);
            const { data: voice } = await supabase.from("voices").select("id, name, model, language, sample_path").eq("id", voiceId).single<ClonedVoice>();
            if (!voice) return jsonError("Voice not found", 404);

            const { data: reference, error } = await supabase.storage.from("voice-samples").download(voice.sample_path);
            if (error || !reference) return jsonError("Could not load the voice sample", 500);

            const language = typeof body.language === "string" && isCloneLanguage(body.language) ? body.language : voice.language;
            voiceName = voice.name;
            model = `chatterbox-${voice.model}`;
            result = await synthesizeClone({ text, reference, model: voice.model, language, format, effect });
        } else {
            return jsonError("Choose a voice", 400);
        }
    } catch (error) {
        if (error instanceof InferenceError) return jsonError(error.message, error.status);
        console.error("TTS failed", error);
        return jsonError("Generation failed. Please try again.", 500);
    }

    const saved = await saveGeneration(supabase, {
        userId,
        text,
        characters,
        voiceType,
        voiceId,
        voiceName,
        model,
        format,
        audio: result.audio,
        contentType: result.contentType,
        durationSeconds: result.durationSeconds,
    });

    const headers = {
        "X-Generation-Id": saved.id,
        "X-Characters-Used": String(saved.charactersUsed ?? quota.used + characters),
        "Cache-Control": "no-store",
    };

    // Long clips can pass Vercel's 4.5 MB response limit, so hand back a link to the stored copy instead of the bytes.
    if (saved.saved) {
        const { data: signed } = await supabase.storage.from("generations").createSignedUrl(saved.audioPath, 60 * 60);
        if (signed) return Response.json({ id: saved.id, url: signed.signedUrl, durationSeconds: result.durationSeconds }, { headers });
    }
    if (result.audio.byteLength > 4 * 1024 * 1024) return jsonError("Couldn't save this long clip. Please try again.", 500);

    return new Response(result.audio, {
        headers: {
            ...headers,
            "Content-Type": result.contentType,
            "Content-Disposition": `inline; filename="angelite-${saved.id.slice(0, 8)}.${AUDIO_EXTENSIONS[format]}"`,
        },
    });
}
