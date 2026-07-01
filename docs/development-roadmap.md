# Agile Pong — Development Roadmap

Last updated: 2026-07-01

Status legend:

- **Complete**: implemented and verified at the level required by the definition of done.
- **In progress**: the main implementation exists, but validation or hardening is still missing.
- **Not started**: no release-ready implementation exists yet.

## Current status

Completed:

- Next.js application shell and responsive UI.
- Supabase Auth with company-domain validation and email OTP.
- Optional local mock authentication and data mode, explicitly enabled by environment variables.
- Supabase schema, RLS baseline, profiles, seasons and initial ratings.
- Real player directory and leaderboards backed by Supabase.
- Atomic match creation command.
- Atomic match-result submission command.
- Atomic opposite-side confirmation command.
- Transactional singles and doubles Elo updates.
- Anti-farming factors and per-player daily rating caps.
- Participant-driven cancellation and dispute commands.
- Scheduled confirmation of submitted matches after 24 hours.
- Security headers and production hard-disable for mock backends.
- Vitest, Playwright and pgTAP test infrastructure.
- GitHub CI, protected `main` pull-request flow and automatic production database migrations.
- Vercel production deployment at `https://agile-pong.vercel.app`.
- Open-ended initial season with no automatic expiry.

Verified on 2026-07-01:

- ESLint passes.
- TypeScript typecheck passes.
- Production build passes.
- Vitest passes: 6 tests.
- Supabase pgTAP passes: 70 tests across 3 files.
- Multi-session confirmation test observes the PostgreSQL row-lock wait and proves Elo is applied once.
- Playwright passes: 16 tests across desktop Chromium and mobile WebKit.
- Docker CLI is available from `~/.local/bin/docker` and connects to Docker Desktop.
- `npm audit --omit=dev` reports zero known vulnerabilities.
- Local database lint reports no schema errors.
- The hosted Supabase project is current through the latest merged migration; avatar Storage is pending this branch.
- Linked database lint reports no schema errors (one non-blocking unused-variable warning remains).
- Production SMTP successfully delivers an OTP to a company account.
- Production login, OTP verification, onboarding and profile edits pass on Vercel.
- Supabase SSL enforcement is enabled; Auth URLs and conservative rate limits are configured.
- Security Advisor reports zero errors and only six reviewed warnings.
- The production migration workflow completed its first successful deployment.

In progress:

- Profile photos are being moved from inline data URLs to compressed Supabase Storage objects.
- A real two-account production match confirmation remains to be smoke-tested with a colleague.
- A real two-account match confirmation and production avatar verification remain open.

The application must not be deployed as a finished product until all P0 items below are complete.

## P0 — Required before deployment

### 1. Atomic result confirmation

**Status: Complete.** The locking RPC, opposite-side authorization, winner derivation, unranked path, audit event and idempotent retry are covered. A two-session test observes the second confirmation waiting on the row lock and proves only one event is recorded.

- Add a PostgreSQL command that locks the submitted match row.
- Allow confirmation only while the match is in `submitted` status.
- Require the confirmer to be a participant from the opposite side to the submitter.
- Prevent self-confirmation and duplicate confirmation.
- Derive the winner from stored sets; never trust a winner supplied by the browser.
- Confirm unranked matches without changing ratings.
- Record the confirmation event and confirmer.

Definition of done: one database transaction either completes every confirmation update or changes nothing.

### 2. Transactional Elo calculation

**Status: Complete.** Elo is calculated and persisted inside the confirmation transaction with separate rating kinds and exact database-level snapshots. Sequential retries and simultaneous confirmations both prove ratings and counters update exactly once.

- Port the current Elo rules into the trusted database transaction.
- Keep separate singles and doubles ratings.
- Apply provisional/experienced K-factors.
- Apply set, point-dominance and format multipliers.
- Store rating before, after and delta on every match player.
- Update player rating and ranked-match counters exactly once.
- Make retries idempotent.

Definition of done: concurrent confirmations cannot apply rating twice and the database result matches domain test vectors.

### 3. Anti-farming and daily cap

**Status: Complete.** All anti-farming thresholds are covered, singles and reversed-side doubles matchup history are exercised, and both the `+80` and `-80` daily caps are verified through confirmation transactions.

- Count identical singles matchups or doubles team matchups during the previous seven days.
- Apply full weight for matches 1–3, half weight for matches 4–6 and zero weight from match 7 onward.
- Enforce the documented daily `+80/-80` cap per player.
- Persist and display the applied anti-farming factor.

Definition of done: database tests cover every threshold and both match types.

### 4. Connect the application to confirmation RPC

**Status: Complete.** Confirmation now goes through the repository RPC, command errors are mapped to safe redirects, affected views are revalidated and actions are rendered according to participant/state authorization.

- Replace the remaining multi-call Supabase confirmation path.
- Return safe user-facing errors for invalid state, permissions and malformed scores.
- Revalidate home, matches, leaderboard and player pages after success.
- Disable actions in the UI when the current user is not authorized.

### 5. Match workflow validation

**Status: Complete.** Player uniqueness/count and ranked score formats are validated across UI/server/database paths. Submit is participant-only, while cancellation and dispute have explicit transactional commands.

Profile nicknames are also unique case-insensitively at the database boundary, with matching mock behavior and friendly profile/onboarding errors.

- Validate player count and uniqueness on client, server and database boundaries.
- Validate ranked formats (`11/21`, best-of `3/5`).
- Validate that submitted sets produce a valid match winner.
- Enforce the required number of winning sets for ranked matches.
- Define and implement cancel/dispute behavior or hide those states until implemented.
- Ensure only participating users can submit results.

### 6. Database and RLS tests

**Status: Complete.** The local suite has 70 passing pgTAP assertions covering protected writes, anonymous access, nickname uniqueness, initialization, participant roles, avatar Storage policy, open-season configuration, repeated requests and transactional rating outcomes, plus a passing two-session lock/concurrency test.

- Add pgTAP tests for profile access and protected columns.
- Verify anonymous users cannot read company data.
- Verify authenticated users cannot write match/rating tables directly.
- Test creator, participant, opponent and unrelated-user scenarios.
- Test repeated and concurrent submit/confirm requests.
- Test season and rating initialization.

### 7. End-to-end tests

**Status: Complete.** Playwright runs an isolated mock server on port `3101` with its own build directory. All 16 desktop Chromium and mobile WebKit tests pass without reusing the development server on port `3001`.

- Configure Playwright and a repeatable test command.
- Cover login-domain rejection and local mock login.
- Cover first-login onboarding and returning-user bypass.
- Cover profile editing and logout.
- Cover singles and doubles creation.
- Cover result submission and opposite-side confirmation.
- Verify leaderboard changes and match history.
- Run desktop and mobile viewport smoke tests.

### 8. Production security review

**Status: Complete for internal rollout.** Server Actions, SSR sessions, RLS/RPC boundaries, production mock protection, dependency audit and security headers are hardened. SMTP, Auth URLs, OTP limits and SSL enforcement are verified. Security Advisor reports zero errors; its five authenticated match-command warnings are intentional and password-leak protection does not apply to OTP-only authentication. Network restrictions remain open by design because GitHub-hosted migration runners use dynamic IPs. CAPTCHA is deferred for the company-domain-only internal rollout and must be reconsidered before public exposure.

- Review every Server Action as an untrusted public endpoint.
- Confirm no secret/service-role key is exposed or used by browser code.
- Add security headers appropriate for Next.js and the image/avatar policy.
- Add abuse protection/rate limiting to OTP requests.
- Review session, cookie and logout behavior.
- Run Supabase Security Advisor and resolve applicable findings.
- Review indexes used by RLS and match queries.

## P1 — Release engineering

### 9. Continuous integration

**Status: Complete.** `.github/workflows/ci.yml` validates dependencies, lint, types, unit tests, migrations/database behavior, browser flows and the production build. Its first run passed on GitHub, and the `main` ruleset now requires pull requests and the CI status check.

- Add GitHub Actions for lint, typecheck, production build and tests.
- Verify generated Supabase types are committed and current.
- Validate migrations from an empty database.
- Prevent merge when required checks fail.

### 10. Environment and deployment configuration

**Status: Complete for the internal pilot.** Production mock mode is hard-disabled, Vercel is live, Auth/SMTP configuration is verified, and the protected GitHub workflow successfully deploys migrations. Development uses local Supabase rather than production data. Free-plan backup limitations are explicitly accepted; encrypted dumps are required before destructive migrations.

- Keep mock backends disabled in production regardless of environment mistakes.
- Document all required Vercel variables.
- Configure Supabase Site URL and allowed redirect URLs for the Vercel domain.
- Production SMTP sender configured and delivery tested with a company account.
- Decide how development data is identified/cleaned because development and production share one Supabase project.
- Add a documented backup/export procedure before destructive migrations.

### 11. Documentation cleanup

**Status: Complete.** README, zero-credential local setup, architecture, state machine, authorization matrix, production operations, deployment flow and current product decisions reflect the live system.

- Update README sections that still describe the mock repository as the default.
- Remove mock-specific copy from insights and UI.
- Update architecture documentation to reflect completed Supabase Auth and repository work.
- Add local-development, database-migration and deployment instructions.
- Document the match state machine and authorization matrix.

## P2 — Product completion and polish

**Status: Partially started.** Automatic confirmation, cancellation and dispute foundations already exist; the remaining product and operational work below is not release-complete.

- Implement admin correction/deletion with audit events.
- Implement dispute and cancellation flows if retained in the domain model.
- Add admin-controlled season rollover and archive views; the current `Open Season` remains active until then.
- Complete and production-verify compressed avatar Storage with file validation and owner-only write policies.
- Complete badges using confirmed real matches only.
- Add empty/loading/error states across all data pages.
- Reconsider dedicated error tracking when Vercel/Supabase logs are insufficient for support volume.
- Review accessibility, keyboard navigation and mobile usability.

## Final release gate

Before wider company rollout:

- Every P0 item is complete.
- CI is green from a clean checkout.
- Database migrations apply successfully from an empty schema.
- The full match flow passes E2E testing.
- RLS tests prove unrelated users cannot mutate matches.
- No mock backend can activate in production.
- Supabase and Vercel production configuration has been verified.

## Next execution order

1. Merge and production-verify compressed avatar Storage.
2. Run a real two-account match smoke test: create, submit, opposite-side confirm and verify Elo/history.
3. Perform the final release-gate run from a clean checkout.
4. Before any destructive migration, create an encrypted logical backup; require a restore drill only when data criticality increases.
5. Reassess dedicated observability when pilot usage produces enough failures to justify it.
