# Angelite web app

Next.js 16 (App Router, Turbopack) with [Untitled UI React](https://www.untitledui.com/react) (React Aria, Tailwind v4) and Supabase.
Setup and deployment are in the [root README](../../README.md); component conventions are in `CLAUDE.md`.

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Layout

```
src/
├── app/
│   ├── (marketing)/   Public site: home, about, open-source, pricing, contact, terms, privacy (_components = its sections)
│   ├── (auth)/        Sign in and sign up
│   ├── (app)/         Signed-in app: studio, voices, history, lab (browser engine test page)
│   ├── api/tts        Preset (and GPU-clone) generation through the inference service
│   ├── api/cron       Daily history cleanup (Vercel Cron)
│   ├── auth/          Email confirmation and sign-out routes
│   └── sitemap.ts, robots.ts, manifest.ts, icons and Open Graph images
├── components/        Untitled UI components in use (base, application, foundations)
├── lib/
│   ├── browser-tts/   On-device engine client (Pocket TTS worker, effects, shared engine store)
│   ├── supabase/      Server and browser clients
│   ├── site.ts        Site, company and SEO details
│   ├── script.ts      Script markup ([pause]), limits, effects, pronunciations
│   └── …              inference, generations, local-library, voices, usage
├── proxy.ts           Session refresh and route protection
└── styles/            Theme (app) and marketing.css (brand tokens for the public site)
public/
├── pocket-tts/        In-browser voice engine worker and tokenizer (see NOTICE.md)
├── voice-previews/    One sample per preset voice
└── brand/             Logo images used by the app
```

## Routes

| Route | Purpose |
|---|---|
| `/`, `/about`, `/open-source`, `/pricing`, `/contact`, `/terms`, `/privacy` | Public site |
| `/sign-in`, `/sign-up`, `/auth/confirm` | Supabase email and password auth |
| `/studio` | Script editor, preset or cloned voices, on-device or server generation |
| `/voices` | Clone a voice (record or upload) and manage cloned voices |
| `/history` | Clips on this device and the last 50 server generations |
| `/lab` | Standalone test page for the in-browser engine |
| `POST /api/tts` | Generates audio, saves history and records usage |
| `GET /api/cron/cleanup` | Deletes server audio older than 30 days |
