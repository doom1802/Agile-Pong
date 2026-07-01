# Agile Pong

Internal Agile Lab ping-pong ranking app, live at [agile-pong.vercel.app](https://agile-pong.vercel.app).

## Product

- Passwordless Supabase Auth restricted to `@agilelab.it`.
- Profile onboarding, unique nicknames and compressed Storage-backed avatars.
- Singles and doubles leaderboards with separate Elo ratings.
- Ranked and unranked match creation.
- Result flow: `ready → submitted → confirmed`, plus cancellation and dispute.
- Opposite-side confirmation, 24-hour scheduled confirmation, anti-farming and daily caps.
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
