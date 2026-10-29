// Site-wide facts: who makes Angelite and where it lives. Used for SEO metadata, structured data and the legal pages.

export const SITE = {
    name: "Angelite",
    title: "Angelite: open-source AI voice generator",
    description:
        "Turn text into natural speech in ten voices, or clone your own from ten seconds of audio. Built on open models and running right in your browser. Free to start.",
    url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
    keywords: [
        "AI voice generator",
        "text to speech",
        "voice cloning",
        "open source TTS",
        "free text to speech",
        "zero-shot voice cloning",
        "in-browser TTS",
        "Kokoro",
        "Pocket TTS",
        "voiceover generator",
    ],
} as const;

export const COMPANY = {
    legalName: "Webrizen AI Labs Private Limited",
    shortName: "Webrizen AI Labs",
    domain: "webrizen.com",
    url: "https://webrizen.com",
    creator: {
        name: "Arshahdul Ahmed",
        domain: "arsh.webrizen.com",
        url: "https://arsh.webrizen.com",
    },
} as const;

/** Public marketing pages, for the sitemap. */
export const PUBLIC_PAGES = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/open-source", priority: 0.7, changeFrequency: "monthly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
] as const;

/** Per-page metadata with a canonical URL and matching Open Graph / Twitter text. */
export const pageMetadata = ({ title, description, path }: { title: string; description: string; path: string }) => ({
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} · ${SITE.name}`, description, url: path },
    twitter: { title: `${title} · ${SITE.name}`, description },
});
