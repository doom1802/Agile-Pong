# Agile Pong — Architecture

Last reviewed: 2026-07-02

## Runtime architecture

Agile Pong is a modular Next.js monolith deployed on Vercel. Supabase provides passwordless Auth, PostgreSQL, Row Level Security, transactional RPC commands, scheduled jobs and avatar Storage. A separate API service is intentionally deferred until a second client or independent scaling boundary exists.

- Browser: renders the App Router UI and performs client-only avatar compression.
- Next.js Server Actions: authenticate callers, validate form input and invoke Supabase.
- Supabase Auth: sends and verifies email OTPs for `@agilelab.it` accounts.
- PostgreSQL: stores profiles, seasons, ratings, matches, sets and audit events.
- RPC commands: own every match state transition and Elo update transaction.
- Supabase Storage: stores public-read profile avatars with owner-only writes.
- GitHub Actions: validates pull requests and deploys pending migrations after merges to `main`.

Production is `https://agile-pong.vercel.app`. Development uses local Supabase or explicitly enabled mock adapters; production hard-disables mock Auth and data regardless of environment mistakes.

## Trust boundaries

- The browser is untrusted. Hidden controls and Server Actions are not authorization boundaries.
- Every mutating Server Action except OTP request/verification requires an authenticated user.
- Inputs are checked in UI, Server Actions and PostgreSQL where the invariant affects data integrity.
- RLS and grants are the final table-access boundary.
- Authenticated clients can read company application data and update only their own allowed profile columns.
- Match, set, event and rating tables reject direct authenticated writes.
- Public SECURITY DEFINER wrappers expose only narrow match commands; private implementations are not executable by API roles.
- The publishable Supabase key is safe in the browser. Secret/service-role keys are not used by the application.

## Match state machine

```text
create
  │
  ▼
ready ───────────────► cancelled
  │ submit result
  ▼
submitted ───────────► cancelled
  │ opposite side confirms
  │ or scheduled confirmation after 24h
  ▼
confirmed ───────────► confirmed
          edit latest result within 1h
```

Participants can cancel `ready` or `submitted` matches before Elo is applied. Confirmation derives the winner from stored sets and applies Elo at most once in the same transaction. A confirmed result can be edited for one hour only when it is still the latest submitted/confirmed match for every participant. The edit command locks the affected ratings, reverses the previous snapshots and counters, replaces the sets, and reapplies Elo atomically; no partially reverted state is externally visible. Unranked confirmation and editing record history without changing ratings.

## Authorization matrix

| Operation | Creator/participant | Opposite side | Unrelated user | System job |
| --- | --- | --- | --- | --- |
| Read profiles, ratings and matches | Yes | Yes | Yes, when authenticated | Yes |
| Edit own profile | Own profile only | Own profile only | Own profile only | No |
| Create match | Yes; creator must be first participant | N/A | No | No |
| Submit result | Any participant while `ready` | Any participant while `ready` | No | No |
| Confirm result | No, if same side submitted | Yes, while `submitted` | No | After 24h |
| Cancel match | Any participant while `ready` or `submitted` | Any participant while `ready` or `submitted` | No | No |
| Edit latest confirmed result | Any participant, within 1h and only if latest for every player | Any participant under the same rules | No | No |
| Dispute submitted result | RPC retained but not exposed in the current UI | Same | No | No |
| Write ratings/events directly | No | No | No | Private RPC only |
| Upload/delete avatar | Own Storage folder only | Own folder only | Own folder only | No |

General admin correction/deletion is not implemented. The participant edit command is deliberately narrower and cannot rewrite an older rating history.

## Rating and season consistency

Singles and doubles ratings are separate per player and season. Confirmation and latest-result editing lock the match and affected rating rows, apply anti-farming and daily caps, store before/after/delta snapshots, and record audit events. The initial `Open Season` uses PostgreSQL `infinity` as its end date and remains active until a future reviewed rollover migration closes it.

## Delivery and operations

Pull requests must pass dependency audit, lint, typecheck, unit tests, 83 pgTAP assertions, the concurrency test, browser tests and a production build. Protected `main` requires the CI check. A separate production workflow serializes `supabase db push` after merges.

For the internal pilot, Vercel runtime/function logs, Supabase Auth/Postgres logs and GitHub Action results are the observability stack. Sensitive values such as OTPs, tokens, credentials and full personal data must not be logged. Sentry is deferred until error volume or support needs justify another processor and SDK.

The Supabase Free plan has no managed downloadable backup/PITR guarantee used by this project. That risk is accepted for the pilot. Before a destructive migration, create an encrypted logical dump and retain it outside Git; Storage objects require a separate copy. A formal restore drill becomes required before the data is considered business-critical.
