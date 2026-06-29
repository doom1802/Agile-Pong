# Architecture

## Decision

Agile Pong is a modular Next.js monolith backed by Supabase Auth, PostgreSQL and
Storage. UI and server-side application code remain in one deployment. A separate
API service is deferred until there is a concrete second client, public API,
independent scaling requirement or background-workload boundary.

## Trust boundaries

- The browser is untrusted. A hidden button or a Server Action is not authorization.
- Server Actions authenticate the caller and validate input before invoking the data layer.
- PostgreSQL RLS is the final read/write authorization boundary.
- Match state transitions and rating updates must run as one database transaction.
- The Supabase publishable key may be exposed; a secret/service-role key must never
  be shipped to the browser or used as the default request client.

## Data access

The current in-memory repository remains the local fallback while the Supabase
repository is implemented. Supabase activation is explicit through
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Authenticated users may read company player and match data. They may update only
their own editable profile columns. Direct writes to match, score, event and rating
tables are intentionally not granted. Those writes will be exposed through narrow,
transactional database functions after their authorization tests are in place.

## Delivery sequence

1. Establish schema, constraints, grants and baseline RLS.
2. Add local Supabase configuration and policy tests.
3. Replace mock OTP/session handling with Supabase Auth SSR.
4. Implement transactional match commands.
5. Add the Supabase repository and switch reads.
6. Remove the mock production path after data migration and end-to-end verification.
