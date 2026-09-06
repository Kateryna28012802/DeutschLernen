/*
 * Public browser configuration only.
 * A Supabase publishable/anon key is designed for browser use when RLS is correct.
 * NEVER place service_role keys, database passwords, JWT/webhook secrets or payment secrets here.
 */
window.DEUTSCHRAUM_CONFIG = Object.freeze({
  supabaseUrl: '',
  supabasePublishableKey: ''
});
