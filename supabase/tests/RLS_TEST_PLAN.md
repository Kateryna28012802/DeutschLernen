# Deutschraum RLS test plan

Run this specification against a disposable Supabase project after applying all migrations. Do not use production users or data.

## Fixtures

Create three Auth users through the Admin Dashboard or server-only test setup: `user_a`, `user_b`, and `admin`. Set only the `admin` profile role to `admin` using the SQL Editor or another trusted server-side operation. Never promote it through the browser client.

## Required assertions

1. With the anon key and no Auth session, selecting `profiles`, `progress`, `user_vocabulary`, `user_settings`, or `entitlements` returns no private rows. Writes fail.
2. As User A, insert/select/update/delete User A progress and vocabulary succeeds.
3. As User A, selecting or mutating rows owned by User B returns no rows or an authorization error.
4. As User A, updating `profiles.display_name` succeeds. Updating `profiles.role` fails at the column-grant boundary.
5. As User A, inserting, updating, or deleting `entitlements` fails. Selecting only User A's entitlement succeeds when a trusted server fixture creates it.
6. As User A, draft content is not readable and content writes fail.
7. As Admin, draft and published content are readable and Admin content writes succeed when `created_by = auth.uid()`.
8. As Admin, entitlement writes still fail through the browser role; future webhook/server code must use a server-only credential.
9. Delete a disposable Auth user and verify profile, settings, progress, and vocabulary rows cascade.

Record the project version, migration checksum and pass/fail result. These cases are a reproducible specification; they have not been executed remotely in Stage 7.
