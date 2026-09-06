-- Deutschraum Stage 7: initial Supabase schema, grants and RLS.
-- Run in a new Supabase project before adding public browser configuration.

create schema if not exists private;

create type public.app_role as enum ('user', 'admin');
create type public.entitlement_status as enum ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 100),
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (char_length(lesson_id) between 1 and 160),
  task_id text not null default '' check (char_length(task_id) <= 160),
  completed boolean not null default false,
  score numeric(5,2) check (score is null or score between 0 and 100),
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id, task_id)
);

create table public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_key text not null check (char_length(word_key) between 1 and 300),
  word text not null check (char_length(word) between 1 and 500),
  word_type text check (word_type is null or char_length(word_type) <= 100),
  forms jsonb not null default '{}'::jsonb check (jsonb_typeof(forms) = 'object'),
  translation text not null default '' check (char_length(translation) <= 2000),
  learning_state jsonb not null default '{}'::jsonb check (jsonb_typeof(learning_state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, word_key)
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  learning_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(learning_settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (char_length(plan) between 1 and 100),
  status public.entitlement_status not null default 'inactive',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Static curriculum stays version-controlled. Only future Admin-created content belongs here.
create table public.content_items (
  id text primary key check (char_length(id) between 1 and 160),
  level text check (level in ('A1','A2','B1','B2','C1','C2')),
  section text not null check (char_length(section) between 1 and 160),
  topic text not null check (char_length(topic) between 1 and 300),
  content_type text not null check (char_length(content_type) between 1 and 100),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  publication_status text not null default 'draft' check (publication_status in ('draft','published','archived')),
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'user');
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger progress_updated_at before update on public.progress for each row execute function private.set_updated_at();
create trigger vocabulary_updated_at before update on public.user_vocabulary for each row execute function private.set_updated_at();
create trigger settings_updated_at before update on public.user_settings for each row execute function private.set_updated_at();
create trigger entitlements_updated_at before update on public.entitlements for each row execute function private.set_updated_at();
create trigger content_updated_at before update on public.content_items for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.user_vocabulary enable row level security;
alter table public.user_settings enable row level security;
alter table public.entitlements enable row level security;
alter table public.content_items enable row level security;

revoke all on table public.profiles, public.progress, public.user_vocabulary, public.user_settings, public.entitlements, public.content_items from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.progress, public.user_vocabulary, public.user_settings to authenticated;
grant select on public.entitlements to authenticated;
grant select on public.content_items to anon, authenticated;
grant insert, update, delete on public.content_items to authenticated;
grant all on table public.profiles, public.progress, public.user_vocabulary, public.user_settings, public.entitlements, public.content_items to service_role;

revoke all on function private.is_admin() from public;
revoke all on function private.set_updated_at() from public;
revoke all on function private.handle_new_user() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy progress_select_own on public.progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy progress_insert_own on public.progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy progress_update_own on public.progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy progress_delete_own on public.progress for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy vocabulary_select_own on public.user_vocabulary for select to authenticated
  using ((select auth.uid()) = user_id);
create policy vocabulary_insert_own on public.user_vocabulary for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy vocabulary_update_own on public.user_vocabulary for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy vocabulary_delete_own on public.user_vocabulary for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy settings_select_own on public.user_settings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy settings_insert_own on public.user_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy settings_update_own on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy settings_delete_own on public.user_settings for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy entitlements_select_own on public.entitlements for select to authenticated
  using ((select auth.uid()) = user_id);

create policy content_select_published on public.content_items for select to anon, authenticated
  using (publication_status = 'published');
create policy content_select_admin on public.content_items for select to authenticated
  using (private.is_admin());
create policy content_insert_admin on public.content_items for insert to authenticated
  with check (private.is_admin() and created_by = (select auth.uid()));
create policy content_update_admin on public.content_items for update to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy content_delete_admin on public.content_items for delete to authenticated
  using (private.is_admin());
