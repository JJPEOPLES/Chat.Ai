# Chat.ai

Chat.ai is a polished Next.js AI assistant with:

- dark futuristic UI
- streaming chat
- local chat history
- optional Supabase auth/database sync
- file uploads for images, audio, video, PDF, and text
- voice input and voice output
- modular tools routed automatically from user intent
- settings and API status dashboards

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase-ready auth/database layer
- PostgreSQL schema for conversations, messages, and attachments

## Required environment variable

```bash
AI_API_KEY=PUT_MY_AI_API_KEY_HERE
```

Everything else is optional.

## Optional environment variables

Copy `.env.example` to `.env.local` and add only what you want:

```bash
cp .env.example .env.local
```

Optional variables enable Supabase and keyed third-party tools.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

If you want auth + cloud sync:

1. Create a Supabase project
2. Add `NEXT_PUBLIC_SUPABASE_URL`
3. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Run `supabase/schema.sql` in the SQL editor
5. Add your auth providers in Supabase Auth, including Google when ready

Without those keys, the app runs in guest mode with local persistence.

## Tool routing

The assistant auto-selects a tool based on the prompt:

- Weather → 7Timer
- Movies → OMDb
- Music → TheAudioDB
- Lyrics → Lyrics.ovh
- Maps → Mapbox or Google Maps
- Code/repos → GitHub
- Deployments → Netlify
- Shopping → eBay
- Pet adoption → AdoptAPet
- Random excuse → Excuser
- Country detection → Country.is
- News → World News API
- General search → SerpApi

Public/free tools work immediately. Keyed tools stay optional and fail gracefully.

## Media support

- Images: attached to the conversation for model context
- PDFs: parsed server-side
- Audio/video: transcription attempted through the AI provider if supported
- Voice input: browser speech recognition
- Voice output: browser speech synthesis

## Browser agent

- Approval-first browser automation is built into the right rail of the main UI.
- It generates a browser action plan before running anything.
- Nothing executes until you explicitly approve the plan.
- Runs use a fresh Playwright browser session, not your personal signed-in browser profile.
- Login walls, CAPTCHAs, MFA, and provider-specific anti-bot flows may still require manual follow-up.
- On the hosted Netlify app, actual browser execution must run through a local helper on your machine.

### Local browser bridge

To let the hosted app execute approved browser tasks on your computer:

```bash
npm run browser:bridge
```

That starts a local Playwright bridge on `http://127.0.0.1:4467`.
The hosted Chat.ai app will try that bridge first whenever you click `Approve & run`.

## Deployment

Recommended:

- Vercel
- Netlify

Set `AI_API_KEY` in the deployment environment. Add optional keys only if you need those tools.

## Security notes

- `AI_API_KEY` stays server-side only
- uploads are size-checked and typed
- chat and upload routes are rate-limited
- optional tools do not break the chat experience
