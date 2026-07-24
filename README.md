# NutritiScan

**Your AI Health Operating System.**

An AI health companion built as a React Native (Expo) app with a Supabase backend and Claude-powered intelligence. v1 ships the Jarvis core: conversational onboarding, an AI chat with long-term memory, a daily AI briefing, and personalized daily targets.

## Architecture

```
┌─ Expo app (this repo) ── zero business logic in UI
│   src/app/        Screens (expo-router): auth → onboarding → tabs
│   src/engines/    Client-safe logic (daily target computation)
│   src/lib/        Supabase client, AI transport (SSE streaming)
│   src/theme/      Design system (8pt grid, calm palette)
│
└─ Supabase ── auth, Postgres (RLS on every table), edge functions
    supabase/migrations/          Schema: profiles, conversations,
                                  messages, memories, daily_briefings,
                                  meals, water_logs, weight_logs, sleep_logs
    supabase/functions/chat       Claude Opus 4.8, streaming, save_memory tool
    supabase/functions/daily-briefing   One AI briefing per user per day, cached
    supabase/functions/analyze-food     Claude vision → structured macro estimate
```

**The Anthropic API key never touches the client.** All AI calls go through edge functions; the mobile app only holds the Supabase anon key, and Row Level Security scopes every row to its owner.

**Memory model** (per the product spec's four levels):

| Level | Where |
|---|---|
| 1 — Conversation | `conversations` + `messages` tables, replayed into each request |
| 2 — Daily | `daily_briefings` (one per user per day) |
| 3 — Long-term | `memories` table — the AI writes facts via a `save_memory` tool; users can review and delete them in Profile |
| 4 — Knowledge | The model itself (RAG comes later) |

## Setup

### 1. Supabase project

1. Create a project at [database.new](https://database.new).
2. Link and push the schema:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase db push
   ```

3. Set the AI secret and deploy the functions:

   ```sh
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy chat
   npx supabase functions deploy daily-briefing
   npx supabase functions deploy analyze-food
   ```

4. (Recommended for development) In the Supabase dashboard → Authentication → Providers → Email, disable **Confirm email** so sign-up works without an email loop.

### 2. App

```sh
cp .env.example .env   # fill in EXPO_PUBLIC_SUPABASE_URL + ANON_KEY
npm install
npx expo start
```

Open in Expo Go (scan the QR) or an iOS/Android simulator.

## What works in v1

- Email sign-up / sign-in (Supabase Auth, session persisted)
- Conversational onboarding — one question at a time, computes calorie/protein/water/sleep targets (Mifflin-St Jeor)
- Home dashboard — daily AI briefing (generated once per day, cached) + targets
- AI chat — streaming responses from Claude Opus 4.8, full conversation history, long-term memory the AI maintains itself
- Profile — personal details, goals, a transparent "what your AI remembers" list with per-memory delete, medical disclaimer, sign out
- **Food photo scanner** — take/pick a photo → Claude vision identifies items, portions, calories, and macros with an honest confidence rating; asks a clarifying question when uncertain (answer it to refine the estimate); one tap logs the meal
- Home shows today's consumed calories/protein against targets (updates as you log)
- Progress tab — educational placeholder (next milestone)

## Roadmap (from the product spec)

1. **Nutrition tracking depth** — water logging, meal history view, progress rings
2. **Progress analytics** — AI-summarized trends
3. **Workouts** — adaptive plans + tracking
4. Wearables, grocery scanner, premium tier

## Engineering notes

- Edge functions are Deno; they're excluded from the app's `tsc` typecheck and are validated at deploy time by the Supabase CLI.
- The chat function runs a manual agentic loop: streams text to the client while executing `save_memory` tool calls server-side (max 5 iterations).
- Prompt caching: the stable persona block carries `cache_control`; per-user context follows it so the cache prefix survives across requests.
- Streaming transport is `expo/fetch` (supports streaming bodies on native) parsing SSE frames.
