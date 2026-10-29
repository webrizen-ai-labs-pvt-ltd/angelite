// Must match KOKORO_VOICES in services/inference/app.py.
export const PRESET_VOICES = [
    { id: "af_heart", name: "Heart", description: "Warm, friendly · US female" },
    { id: "af_bella", name: "Bella", description: "Bright, expressive · US female" },
    { id: "af_nicole", name: "Nicole", description: "Soft, intimate · US female" },
    { id: "af_sky", name: "Sky", description: "Light, youthful · US female" },
    { id: "am_adam", name: "Adam", description: "Deep, steady · US male" },
    { id: "am_michael", name: "Michael", description: "Clear, confident · US male" },
    { id: "bf_emma", name: "Emma", description: "Polished · UK female" },
    { id: "bf_isabella", name: "Isabella", description: "Gentle · UK female" },
    { id: "bm_george", name: "George", description: "Classic narrator · UK male" },
    { id: "bm_lewis", name: "Lewis", description: "Calm, modern · UK male" },
] as const;

export type PresetVoiceId = (typeof PRESET_VOICES)[number]["id"];

export const isPresetVoiceId = (id: string): id is PresetVoiceId => PRESET_VOICES.some((voice) => voice.id === id);

// Chatterbox Multilingual V3 languages.
export const CLONE_LANGUAGES = [
    { id: "en", name: "English" },
    { id: "ar", name: "Arabic" },
    { id: "zh", name: "Chinese" },
    { id: "da", name: "Danish" },
    { id: "nl", name: "Dutch" },
    { id: "fi", name: "Finnish" },
    { id: "fr", name: "French" },
    { id: "de", name: "German" },
    { id: "el", name: "Greek" },
    { id: "he", name: "Hebrew" },
    { id: "hi", name: "Hindi" },
    { id: "it", name: "Italian" },
    { id: "ja", name: "Japanese" },
    { id: "ko", name: "Korean" },
    { id: "ms", name: "Malay" },
    { id: "no", name: "Norwegian" },
    { id: "pl", name: "Polish" },
    { id: "pt", name: "Portuguese" },
    { id: "ru", name: "Russian" },
    { id: "es", name: "Spanish" },
    { id: "sw", name: "Swahili" },
    { id: "sv", name: "Swedish" },
    { id: "tr", name: "Turkish" },
] as const;

export const isCloneLanguage = (id: string) => CLONE_LANGUAGES.some((language) => language.id === id);

export const AUDIO_FORMATS = ["mp3", "opus", "wav"] as const;
export type AudioFormat = (typeof AUDIO_FORMATS)[number];

export const AUDIO_EXTENSIONS: Record<AudioFormat, string> = { mp3: "mp3", opus: "ogg", wav: "wav" };

export const MAX_TEXT_CHARS = 1000;

export type ClonedVoice = {
    id: string;
    name: string;
    model: "turbo" | "multilingual";
    language: string;
    sample_path: string;
    created_at: string;
};
