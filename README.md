# Agile Pong

Small MVP for Agile Lab's internal ping pong ranking app.

## What is included

- Next.js App Router frontend and backend actions.
- Mock passwordless login: use any `@agilelab.it` email and code `123456`.
- Long-lived cookie session in the mock repository.
- Profile onboarding with nickname, name, avatar URL, and office.
- Singles and doubles leaderboards.
- Ranked and unranked match creation.
- Match flow: ready -> submitted -> confirmed.
- Elo-style singles and doubles rating logic.
- Mock DB adapter designed to be replaced by Supabase/Postgres.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3001`.

## Mock login

Use:

```txt
email: any @agilelab.it address
code: 123456
```

Seeded users are in `src/server/db/mock-data.ts`.

## Where to swap the DB

The app uses `src/server/db/repository.ts` as its interface and `src/server/db/mock-repository.ts` as the current implementation. Replace the implementation with a Supabase repository while keeping the rest of the app stable.
