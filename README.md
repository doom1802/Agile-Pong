# Agile Pong

Agile Pong is the Agile Lab app for recording ping-pong matches, challenging your colleagues and following the leaderboard.

Try it at [agile-pong.vercel.app](https://agile-pong.vercel.app).

## Getting started

1. Enter your Agile Lab email address.
2. Check your inbox for the one-time code (OTP) and use it to sign in.
3. Complete your profile.
4. Play a match and record the result in the app.

There are two kinds of matches:

- **Ranked:** the result affects the leaderboard and your rating.
- **Friendly:** the result is recorded, but does not affect the leaderboard.

You can play both kinds of matches as **singles** (one player per side) or **doubles** (two players per side).

## Product

- Passwordless sign-in restricted to `@agilelab.it` email addresses.
- Player profiles with unique nicknames and avatars.
- Separate singles and doubles leaderboards.
- Ranked and friendly matches.
- Result flow: `ready → submitted → confirmed`, with participant cancellation before confirmation.
- Either participant may edit the latest confirmed match shared by all involved players for one hour; the database reverses and reapplies Elo atomically.
- Opposite-side confirmation, 24-hour scheduled confirmation, anti-farming and daily caps.
- Inline score validation, explicit winner summaries, pending states for forms and route-level loading feedback.
- Open-ended initial season until an admin-controlled rollover is implemented.

## Architecture

The application is a Next.js App Router monolith on Vercel backed by Supabase Auth, PostgreSQL and Storage. Browser and Server Action input is untrusted; RLS, grants and transactional RPC commands enforce data access and match transitions. Production never enables mock backends.

See [local development](docs/local-development.md), [architecture](docs/architecture.md), [product specification](docs/product-spec.md), [roadmap](docs/development-roadmap.md) and [production setup](docs/production-setup.md).

## Local development

For a zero-credential mock environment:

```bash
cp .env.mock.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3001`, use any `@agilelab.it` email and enter code `123456`. See the local-development guide for Docker-based database testing, also requiring no hosted Supabase credentials.

## Quality gate

```bash
npm audit --omit=dev
npm run lint
npm run typecheck
npm run test
npm run test:db      # Docker Desktop and local Supabase required
npm run test:e2e
npm run build
```

Playwright uses isolated mock Auth/data. Database and concurrency tests use local PostgreSQL and never mutate the linked project.

## Delivery

Work on a branch and open a pull request to `main`. The required CI check validates application and database behavior. After merge:

1. Vercel deploys the Next.js application.
2. The protected database workflow serially applies pending Supabase migrations.

Migrations must remain backward-compatible because those deployments may overlap. Never commit environment files, database dumps, service-role keys or Supabase access tokens.

## Pilot operations

- Observability: Vercel logs, Supabase logs and GitHub Action results; Sentry is intentionally deferred.
- Backups: Free-plan risk accepted for the pilot; take an encrypted logical dump before destructive migrations.
- CAPTCHA: deferred while access is company-domain-only; reconsider before public exposure.
- Network restrictions: deferred because GitHub-hosted migration runners use dynamic IPs.
