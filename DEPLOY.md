# Deploying Oakwind Rustle

This document is the handoff for getting the app from "scaffold on GitHub" to "live on Vercel with a working briefing." Written for a fresh session (human or Claude) picking this up cold.

## What this app is

Oakwind Rustle is a one-tap briefing web app. Press the button → server fetches weather, local + AI news, and Gmail summary in parallel → composes a single TTS script → the browser reads it aloud via the Web Speech API. Mobile-friendly, no caching anywhere — every press is fresh.

Stack: Next.js 15 App Router, TypeScript, Tailwind v4. Server route handlers under `src/app/api/*` keep API keys off the client and force `Cache-Control: no-store`.

## Deploy to Vercel

1. Open https://vercel.com/new and import `mhalladaptive/oakwind-rustle`. Vercel auto-detects Next.js — no build config needed.
2. **Before the first deploy**, add the environment variables below under "Environment Variables" (you can do an empty first deploy to get the production URL, then come back and fill in the OAuth values that depend on it).
3. Click Deploy.

## Environment variables

All of these get set in **Vercel → Project → Settings → Environment Variables** (and locally in `.env.local` for `npm run dev`). See `.env.example` in the repo for the same list with comments.

| Variable | Purpose | Notes |
| --- | --- | --- |
| `LOCATION_NAME` | Spoken in the briefing ("In Brooklyn, NY, it is 62 degrees...") | Free-form string |
| `LOCATION_LAT` | Weather lookup | Decimal degrees |
| `LOCATION_LON` | Weather lookup | Decimal degrees |
| `GOOGLE_CLIENT_ID` | Gmail OAuth | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Gmail OAuth callback | `https://YOUR-PROJECT.vercel.app/api/auth/gmail/callback` in prod, `http://localhost:3000/api/auth/gmail/callback` for local dev |
| `GMAIL_REFRESH_TOKEN` | Long-lived Gmail access | Captured via the OAuth flow below |
| `LOCAL_NEWS_FEEDS` | Comma-separated RSS URLs | Optional — has a default |
| `AI_NEWS_LIMIT` | Number of AI stories | Optional — defaults to 5 |
| `LOCAL_NEWS_LIMIT` | Number of local stories | Optional — defaults to 5 |

## Google OAuth setup

1. https://console.cloud.google.com/apis/credentials → **Create credentials → OAuth client ID → Web application**.
2. Authorized redirect URIs — add **both**:
   - `http://localhost:3000/api/auth/gmail/callback`
   - `https://YOUR-PROJECT.vercel.app/api/auth/gmail/callback`
3. Enable the Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com
4. Copy the client ID and secret into the env vars above.
5. After deploying (or running locally), visit `/api/auth/gmail/start`. Complete the consent screen. The callback page will display a `refresh_token` — paste it into `GMAIL_REFRESH_TOKEN` and restart / redeploy.

Note: Google only returns a `refresh_token` on **first** consent. If you need to re-capture it, revoke access at https://myaccount.google.com/permissions and run the flow again.

## Local development

```
cp .env.example .env.local
# fill in values
npm install
npm run dev
# visit http://localhost:3000
```

## Verifying a deploy

- `GET /api/briefing` should return JSON with `weather`, `news`, `email`, and `script` fields. `email` will have `configured: false` until the refresh token is set.
- The home page should render a big "Start briefing" button. Tapping it on iOS Safari should both display the briefing cards and speak the script through the device.
- If TTS doesn't fire on iOS, confirm the tap was a direct user gesture (not triggered programmatically) — Safari blocks `speechSynthesis.speak()` outside of one.

## Architecture notes for future work

- Every API route is `export const dynamic = "force-dynamic"` and runs on the Node runtime. `next.config.ts` also pins `Cache-Control: no-store` on `/api/*`. Don't add caching unless you intentionally want it.
- `/api/briefing` runs the three data sources via `Promise.allSettled` — a single source failure (e.g. an RSS feed times out) doesn't kill the whole briefing.
- TTS is client-side via `SpeechSynthesisUtterance`. Free, works offline-after-load, but voice quality varies by OS. Upgrade path: server-side TTS (OpenAI `tts-1-hd` or ElevenLabs) returned as an audio stream the page plays.
- News uses HN Algolia's `search_by_date` endpoint for AI and `rss-parser` for local feeds. No API keys involved.
- Weather uses Open-Meteo. No API key.
