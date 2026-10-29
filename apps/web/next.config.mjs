/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    // Cross-origin isolation lets the in-browser voice engine (public/pocket-tts) use multiple CPU threads.
                    // "credentialless" still loads cross-origin media such as Supabase signed URLs; browsers without it run single-threaded.
                    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
                    { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    // The microphone is used to record voice samples; nothing else needs device access.
                    { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=()" },
                ],
            },
            {
                // Voice samples and the engine's tokenizer never change between deploys of the same name.
                source: "/voice-previews/:file*",
                headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
            },
        ];
    },
    experimental: {
        optimizePackageImports: ["@untitledui/icons"],
    },
};

export default nextConfig;
