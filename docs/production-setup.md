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
- All seven migrations are applied to the hosted Supabase project.
- Linked database lint reports no schema errors; one non-blocking unused-variable warning remains in `private.create_match_command`.
- Production SMTP delivery has been verified with a real company account.

Required dashboard checks before release:

- Security Advisor has been reviewed: match-command warnings are intentional, password-leak protection is not applicable to OTP-only Auth, and `202607010001_restrict_rls_auto_enable.sql` remediates the exposed administrative helper. Apply it to production and refresh the advisor.
- Enable database SSL enforcement and review network restrictions.
- Protect Supabase, GitHub and Vercel owner accounts with MFA.
- Configure OTP limits and decide whether CAPTCHA is required before wider exposure.
- Decide the avatar policy before release: keep data-only avatars temporarily or implement Supabase Storage validation/RLS.

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

## Vercel and Supabase

1. Import the GitHub repository in Vercel and choose `main` as the production branch.
2. Add these Vercel variables to Production; use separate values for Preview when appropriate:

   ```text
   NEXT_PUBLIC_APP_NAME=Agile Pong
   NEXT_PUBLIC_APP_URL=https://<production-domain>
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   ALLOWED_EMAIL_DOMAIN=agilelab.it
   AUTH_BACKEND=supabase
   DATA_BACKEND=supabase
   ```

3. Never add a service-role/secret key to Vercel for the current application. Do not configure `MOCK_LOGIN_CODE` in Production.
4. In Supabase **Authentication > URL Configuration** set:
   - Site URL: the exact production URL.
   - Redirect URLs: `http://localhost:3001/**`, the exact production URL, and—only if previews use Auth—`https://*-<vercel-team-slug>.vercel.app/**`.
5. Apply migrations with a reviewed deployment step, then regenerate and commit database types.
6. Smoke-test login, onboarding, profile update, singles/doubles flow, logout and mobile layout on the Vercel production domain.

## OTP limits, CAPTCHA and SMTP

In Supabase **Authentication > Rate Limits**:

- Keep at least a 60-second interval between OTP sends to the same address.
- Start with a conservative project OTP limit appropriate for the internal company population (for example 60 per hour) and raise it only from observed demand.
- Keep verification rate limits enabled; do not implement an in-memory Vercel limiter because serverless instances do not share state.

In **Authentication > Bot and Abuse Protection**, enable Cloudflare Turnstile or hCaptcha before public exposure. Add the provider's client integration before enabling enforcement, otherwise login requests will fail.

Production SMTP delivery is verified with one real `@agilelab.it` account. Before wider rollout, confirm delivery and spam placement with at least one additional recipient. The configured SMTP service should retain:

1. Use a transactional provider such as the company SMTP service, AWS SES, Postmark, Resend or SendGrid.
2. Configure host, TLS port, username, password, sender name and a verified `no-reply` address.
3. Configure SPF, DKIM and DMARC for the sending domain and disable link tracking for Auth messages.
4. Tested OTP delivery, expiry, resend throttling and spam placement.

## Backup and restore

- On paid Supabase plans, verify daily backup retention in **Database > Backups**; enable PITR only if the required recovery point justifies it.
- On Free—or before every destructive migration—create an encrypted off-site logical backup using the Session Pooler connection string:

  ```bash
  npm exec supabase db dump -- --db-url "$SUPABASE_DB_URL" -f roles.sql --role-only
  npm exec supabase db dump -- --db-url "$SUPABASE_DB_URL" -f schema.sql
  npm exec supabase db dump -- --db-url "$SUPABASE_DB_URL" -f data.sql --use-copy --data-only
  ```

- Never commit dumps or database passwords. Store encrypted backups outside the repository with dated retention.
- Perform a restore drill into a disposable Supabase project before considering the backup procedure complete.
- Supabase database backups do not restore deleted Storage objects; back up Storage separately once avatars move there.
