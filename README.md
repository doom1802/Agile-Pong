# Agile Pong

Small MVP for Agile Lab's internal ping pong ranking app.

## What is included

- Next.js App Router frontend and backend actions.
- Passwordless Supabase Auth restricted to `@agilelab.it` email addresses.
- SSR cookie sessions refreshed by the Next.js proxy.
- Profile onboarding with nickname, name, avatar URL, and office.
- Singles and doubles leaderboards.
- Ranked and unranked match creation.
- Match flow: ready -> submitted -> confirmed.
- Transactional Elo, anti-farming, daily caps, and singles/doubles ratings in PostgreSQL.
- Optional mock Auth/data adapters for isolated UI development and browser tests.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3001`.

## Authentication

Configure Supabase using `.env.example`, then sign in with an `@agilelab.it`
address and the one-time code delivered by email.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:db # requires Docker Desktop and `supabase start`
npm run build
```

Playwright always starts the app with mock Auth and mock data. Database/RLS tests run against an isolated local Supabase stack and never write to the linked remote project.

## Production security gate

Before deployment:

- Keep `AUTH_BACKEND` and `DATA_BACKEND` set to `supabase`; mock mode is also hard-disabled when `NODE_ENV=production`.
- In Supabase Auth rate-limit settings, verify the OTP/email-send limits and SMTP quota are appropriate for the company user count.
- Run `npm audit --omit=dev`, `npm run db:lint`, and Supabase Security Advisor; resolve or explicitly document every applicable finding.
- Verify Site URL, allowed redirect URLs, cookie/logout behavior, and that no service-role key is present in browser or Vercel public variables.
- Apply migrations from an empty local database and run `npm run test:db` before pushing them to the linked project.

The app uses only the Supabase publishable key during normal requests. Match and rating tables are read-only to authenticated clients; state changes go through transactional RPC commands.
