# Local development

No production credentials are required for application development, browser tests or local database tests.

## Application-only setup

Requirements: Node.js 24 and npm.

```bash
git clone https://github.com/doom1802/Agile-Pong.git
cd Agile-Pong
npm ci
cp .env.mock.example .env.local
npm run dev
```

Open `http://localhost:3001`, enter any `@agilelab.it` address and use code `123456`. Auth, profiles, matches and ratings use an in-memory mock repository. Data resets when the development server restarts.

The mock adapters are development-only. They are hard-disabled when `NODE_ENV=production`, even if the environment variables are accidentally copied to a production host.

## Application checks

These commands require no Docker, Supabase account or secret keys:

```bash
npm audit --omit=dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Playwright starts its own isolated mock server on `127.0.0.1:3101`, so it may run alongside the regular development server on port `3001`.

## Local database development

Database migrations, RLS and concurrency tests require Docker Desktop. They use a disposable local Supabase stack, not the hosted production project.

```bash
npm exec -- supabase start
npm exec -- supabase migration up --local
npm run test:db
npm exec -- supabase stop --no-backup
```

Local Studio is available at `http://127.0.0.1:54323` while the stack is running. Never run `db:push`, `db:lint` or other `--linked` commands unless you are an authorized production maintainer performing a reviewed deployment task.

## Typical contribution flow

```bash
git switch main
git pull --ff-only
git switch -c feature/short-description
# make changes
npm run lint
npm run typecheck
npm run test
npm run test:e2e
git add path/to/changed-file
git commit -m "type: concise description"
git push -u origin feature/short-description
```

Open a pull request to `main`. GitHub CI runs the full application and local database gate. Production migrations run only after an approved PR is merged.
