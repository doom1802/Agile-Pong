# Agile Pong — Production setup

Last reviewed: 2026-07-01

## Security review status

Completed in code and local validation:

- Every mutating Server Action requires a verified user except OTP request/verification.
- Match mutations cross the database boundary through authenticated transactional RPCs.
- RLS and column grants prevent anonymous reads and direct authenticated writes to protected tables.
- No service-role or Supabase secret key is present in application code or tracked environment files.
- Mock authentication and data backends are hard-disabled when `NODE_ENV=production`.
- CSP, clickjacking, MIME sniffing, referrer, opener, permissions and production HSTS headers are configured.
- `npm audit --omit=dev` reports zero vulnerabilities after the PostCSS security override.
- Local PL/pgSQL lint reports no schema errors; database, concurrency and browser suites pass.
- Every migration currently merged to `main` is applied to the hosted Supabase project.
- Linked database lint reports no schema errors; one non-blocking unused-variable warning remains in `private.create_match_command`.
- Production SMTP delivery has been verified with a real company account.
- SSL enforcement is enabled and Auth rate limits have been reviewed.
- Vercel production login, onboarding and profile edits have been smoke-tested.
- Automatic production database deployment completed successfully.
- Security Advisor reports zero errors and six reviewed warnings.

Remaining operational checks before wider rollout:

- Network restrictions are intentionally deferred because GitHub-hosted migration runners use dynamic IPs; revisit if deployments move to a fixed egress runner.
- Protect Supabase, GitHub and Vercel owner accounts with MFA.
- CAPTCHA is deferred for the internal company-domain rollout and must be reconsidered before public exposure.
- Merge and production-test compressed avatar uploads backed by Supabase Storage.
- Free-plan backup risk is accepted for the internal pilot; take an encrypted logical dump before destructive migrations.

## GitHub Actions CI

The repository includes `.github/workflows/ci.yml`, triggered by pull requests and pushes to `main`. It uses Node 24, installs Playwright Chromium/WebKit, starts a clean local Supabase stack and runs:

   ```bash
   npm audit --omit=dev
   npm run lint
   npm run typecheck
   npm run test
   npm run test:db
   npm run test:e2e
   npm run build
   ```

The workflow has passed on GitHub. The `main` ruleset requires pull requests and the `Validate application and database` check before merging.

The validation workflow needs no production Supabase or Vercel secrets because it uses mock browser data and the local Docker database. Keep production migration deployment in a separate protected workflow using GitHub environment approvals.

## Automated production migrations

`.github/workflows/deploy-database.yml` runs after every push to `main` (and manually when requested). It links the production Supabase project and applies only pending migration files with `supabase db push`. GitHub concurrency prevents two production migration jobs from running at once.

Create a GitHub environment named `production`, then add these encrypted environment secrets:

```text
SUPABASE_ACCESS_TOKEN=<personal access token from Supabase account settings>
SUPABASE_DB_PASSWORD=<production project database password>
SUPABASE_PROJECT_ID=cpzdfvhrgagfclcqbamo
```

Do not expose these values to pull-request workflows or Vercel. Keep migrations backward-compatible because Vercel and the database workflow may start concurrently after a merge. If strict ordering becomes necessary, disable Vercel's automatic production deploy and trigger a Vercel deploy hook only after the migration job succeeds.

## Vercel and Supabase

1. Import the GitHub repository in Vercel and choose `main` as the production branch.
2. Add these Vercel variables to Production; use separate values for Preview when appropriate:

   ```text
   NEXT_PUBLIC_APP_NAME=Agile Pong
   NEXT_PUBLIC_APP_URL=https://agile-pong.vercel.app
   NEXT_PUBLIC_SUPABASE_URL=https://cpzdfvhrgagfclcqbamo.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   ALLOWED_EMAIL_DOMAIN=agilelab.it
   AUTH_BACKEND=supabase
   DATA_BACKEND=supabase
   ```

3. Never add a service-role/secret key to Vercel for the current application. Do not configure `MOCK_LOGIN_CODE` in Production.
4. In Supabase **Authentication > URL Configuration** set:
   - Site URL: `https://agile-pong.vercel.app`.
   - Redirect URLs: `http://localhost:3001/**` and `https://agile-pong.vercel.app/**`.
5. Apply migrations with a reviewed deployment step, then regenerate and commit database types.
6. Smoke-test login, onboarding, profile update, singles/doubles flow, logout and mobile layout on the Vercel production domain.

## OTP limits, CAPTCHA and SMTP

In Supabase **Authentication > Rate Limits**:

- Keep at least a 60-second interval between OTP sends to the same address.
- Start with a conservative project OTP limit appropriate for the internal company population (for example 60 per hour) and raise it only from observed demand.
- Keep verification rate limits enabled; do not implement an in-memory Vercel limiter because serverless instances do not share state.

CAPTCHA is intentionally disabled for the initial company-domain-only rollout. Before public exposure, integrate Cloudflare Turnstile or hCaptcha in the client before enabling dashboard enforcement, otherwise login requests will fail.

## Profile avatars

Profile images are cropped and compressed in the browser to a 384×384 JPEG before submission. The server accepts at most 512 KB, verifies JPEG bytes and uploads to `avatars/<user-id>/avatar.jpg`. Storage policies allow authenticated users to insert, replace or delete only objects under their own user-ID folder. The bucket is public-read so avatar URLs render without distributing signed URLs; do not use it for sensitive images.

Production SMTP delivery is verified with one real `@agilelab.it` account. Before wider rollout, confirm delivery and spam placement with at least one additional recipient. The configured SMTP service should retain:

1. Use a transactional provider such as the company SMTP service, AWS SES, Postmark, Resend or SendGrid.
2. Configure host, TLS port, username, password, sender name and a verified `no-reply` address.
3. Configure SPF, DKIM and DMARC for the sending domain and disable link tracking for Auth messages.
4. Tested OTP delivery, expiry, resend throttling and spam placement.

## Backup and restore

The internal pilot currently accepts the Supabase Free-plan limitation: there is no project requirement for managed downloadable backups or PITR, and a restore drill is deferred until the data becomes business-critical. Before every destructive migration, create an encrypted off-site logical backup using the Session Pooler connection string:

  ```bash
  npm exec -- supabase db dump --db-url "$SUPABASE_DB_URL" -f roles.sql --role-only
  npm exec -- supabase db dump --db-url "$SUPABASE_DB_URL" -f schema.sql
  npm exec -- supabase db dump --db-url "$SUPABASE_DB_URL" -f data.sql --use-copy --data-only
  ```

- Never commit dumps or database passwords. Store encrypted backups outside the repository with dated retention.
- A restore drill into a disposable project becomes mandatory before upgrading the data’s criticality or inviting a broad company rollout.
- Supabase database backups do not restore deleted Storage objects; back up Storage separately once avatars move there.

## Observability

For the internal pilot, use Vercel runtime/function logs, Supabase Auth/Postgres logs and GitHub Action results. These cover application exceptions, failed Auth/RPC calls and deployment failures without adding another SDK or data processor. Sentry is intentionally deferred.

- Never log OTPs, access/refresh tokens, credentials or full request payloads.
- Use the timestamp, route, deployment and safe error code to correlate failures across Vercel and Supabase.
- Treat repeated login, RPC, Storage or migration failures as the threshold for adding alerting or a dedicated error tracker.
