![Angelite](brand/assets/angelite-readme-banner.png)

# Angelite

Open-source AI voice generation: natural text to speech in ten preset voices, and zero-shot voice cloning from ten seconds of audio that runs right in the browser.

Release 1 of the open-source program at [Webrizen AI Labs](https://webrizen.com) (Webrizen AI Labs Private Limited), created by [Arshahdul Ahmed](https://arsh.webrizen.com).

## How it works

```
                 ┌─ preset voices ─► Next.js API on Vercel ─► Modal: Kokoro-82M on CPU (+ FFmpeg effects)
Browser (Studio) ┤
                 └─ cloned voices ─► Pocket TTS in the browser (ONNX Runtime Web), saved to the user's own folder
                         │
                         └─► Supabase: auth, Postgres (profiles, voices, history, contact), Storage (samples, audio)
```

| Folder | What it is | Runs on |
|---|---|---|
| `apps/web` | Next.js 16 app: marketing site, auth, Studio, Voices, History, on-device engine | Vercel |
| `services/inference` | Python API: Kokoro-82M presets on CPU; Chatterbox cloning when a GPU is enabled | Modal |
| `supabase/migrations` | Schema, quotas, row-level security, storage buckets | Supabase |
| `brand` | Brand guidelines and logo asset kit | |

## Local development

```bash
npm install --prefix apps/web
cp apps/web/.env.example apps/web/.env.local   # fill in the values
npm run dev                                     # http://localhost:3000
```

## Deploy

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Run every file in `supabase/migrations` in order, either with `npx supabase link --project-ref <ref>` and `npx supabase db push`, or by pasting each into the SQL editor:
   `20261029000000_init.sql`, `20261030000000_pro_plan.sql`, `20261031000000_long_audio.sql`, `20261101000000_contact_messages.sql`.
3. **Authentication → URL Configuration:** set **Site URL** to your production URL and add `https://<your-domain>/**` and `http://localhost:3000/**` to the redirect URLs.

### 2. Inference service (Modal)
See [services/inference/README.md](services/inference/README.md). `npm run deploy:inference` deploys preset voices on CPU (no card needed). Keep the printed URL and your `SPIKE_TOKEN`.

### 3. Web app (Vercel)
1. Import the repository and set **Root Directory** to `apps/web`.
2. Add the environment variables from `apps/web/.env.example`. Set `NEXT_PUBLIC_SITE_URL` to the production URL (no trailing slash): it drives canonical links, the sitemap and social previews.
3. Deploy. `vercel.json` runs `/api/cron/cleanup` daily to delete server audio older than 30 days; it is protected by `CRON_SECRET`.

Vercel's Hobby plan is for non-commercial use. Move to Pro before charging for Angelite.

### After the first deploy
- Open `/robots.txt` and `/sitemap.xml` to confirm they show the production URL, then submit the sitemap in Google Search Console.
- Sign up, generate a preset clip, clone a voice on the device, and send a test message from `/contact`.
- To make an account Pro: `update public.profiles set plan = 'pro' where id = (select id from auth.users where email = '…');`

## Plans
| | Free | Pro (invite only) |
|---|---|---|
| On-device cloning and generation | Unlimited | Unlimited |
| Characters per generation | 1,000 | No limit on device, 3,000 on the server |
| Preset voices on the server | 10,000 characters a month | Unlimited |
| Saved cloned voices | 3 | Unlimited |

## Responsible use
Every saved clone records the owner's confirmation that they have the speaker's permission. Server-cloned audio from Chatterbox carries an inaudible Perth watermark. See the Terms page for the full rules.

## Licenses
Angelite builds on open models and libraries; see `/open-source` on the site and `apps/web/public/pocket-tts/NOTICE.md` for credits. Pocket TTS weights are CC BY 4.0 (Kyutai), Kokoro-82M is Apache-2.0, Chatterbox is MIT.
