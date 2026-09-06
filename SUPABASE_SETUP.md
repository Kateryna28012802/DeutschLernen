# Supabase foundation setup

Stage 7 prepares Deutschraum for Supabase but does not create or configure a remote project. Until the public configuration is supplied, the site deliberately runs in legacy local mode. Legacy mode is not suitable for production accounts, Admin access, Premium, or payments.

## 1. Create the project

1. Create a new Supabase project owned by the business account.
2. For a Germany-focused service, prefer the specific **Central EU (Frankfurt), `eu-central-1`** region when available and appropriate for the data-residency decision.
3. Store the database password in a password manager. Never commit it.
4. Review the current Supabase DPA, subprocessors, retention, backups and plan limits. An EU region alone does not establish GDPR compliance.

## 2. Apply the database migration

Apply `supabase/migrations/001_initial_schema.sql` to a new project using the Supabase CLI migration workflow or the Dashboard SQL Editor. Review the SQL before execution and confirm that it completed without errors.

The migration creates profiles, progress, personal vocabulary, syncable user settings, future entitlements, and dynamic Admin content. Static curriculum files remain in Git.

Do not expose additional tables through the Data API or relax grants/RLS to work around an authorization error.

## 3. Configure Auth

1. Enable the email/password provider under Authentication.
2. Require email confirmation for production.
3. Set the Auth Site URL to the actual GitHub Pages production URL.
4. Add only the exact development and production redirect URLs that are needed.
5. Configure password policy, rate limits, email templates and SMTP before launch.
6. Test sign-up, confirmation, sign-in, sign-out, token refresh, password reset and account deletion.

Legacy passwords do not exist as verifiable credentials and must not be imported. Existing users must create a Supabase account or use a controlled account-claim/password-reset flow.

## 4. Add public browser configuration

Open the project **Connect** dialog or **Settings → API Keys** and copy:

- Project URL
- Publishable key (or the legacy anon browser key where applicable)

Insert only those public values in `js/config.js`:

```js
window.DEUTSCHRAUM_CONFIG = Object.freeze({
  supabaseUrl: 'PASTE_PROJECT_URL_HERE',
  supabasePublishableKey: 'PASTE_PUBLIC_PUBLISHABLE_KEY_HERE'
});
```

The browser client is loaded lazily from the official Supabase JavaScript package major version 2 through jsDelivr. No network dependency is loaded while configuration is empty.

Never put any of the following in `js/config.js`, GitHub, GitHub Pages, browser storage, or frontend code:

- `service_role` or secret Supabase keys
- database password or connection string
- JWT signing secret
- webhook secrets
- Stripe, PayPal, Mollie or other payment secret keys

The public key is not an authorization boundary. RLS and grants are mandatory before adding it.

## 5. Create the first Admin safely

1. Register the intended Admin through Supabase Auth and verify the email.
2. Copy that user's UUID from Authentication → Users.
3. In the trusted Dashboard SQL Editor, run the following with the real UUID:

```sql
update public.profiles
set role = 'admin'
where id = '00000000-0000-0000-0000-000000000000';
```

Verify exactly one intended row changed. Do not add a browser function, email-based RLS policy, or user-editable role field.

## 6. Verify security before configuration is published

Execute every case in `supabase/tests/RLS_TEST_PLAN.md` against a disposable project. Confirm in particular:

- anon cannot access private user tables;
- users cannot read or mutate another user's rows;
- users cannot update `profiles.role`;
- users cannot write entitlements;
- only a server-only future webhook may change billing entitlement;
- Admin content operations require the server-verified profile role.

Also test the frontend with empty configuration and with a real test project. Do not claim production readiness until the remote migration and RLS cases pass.

## 7. Legacy migration boundary

Stage 7 does not upload or delete local data. A later authenticated migration must transform only progress, vocabulary and allowed preferences; validate them on the backend; upsert with conflict handling; confirm the remote write; and retain local data until confirmation.

Never import legacy Admin status, Premium status, session state, payment state, or passwords as trusted data.
