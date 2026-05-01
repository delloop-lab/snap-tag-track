-- Log when a user accepts Terms during registration (append-only audit trail).

create table if not exists public.terms_registration_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  accepted_at timestamptz not null default now(),
  terms_version text not null default '2026-05-01',
  signup_context text not null default 'registration'
);

comment on table public.terms_registration_acceptances is 'Audit log: user acknowledged Terms during sign-up.';
comment on column public.terms_registration_acceptances.terms_version is 'Synchronise with Legal / Terms page "Last updated" when terms change.';
comment on column public.terms_registration_acceptances.signup_context is 'e.g. registration — reserved for future flows.';

create index if not exists terms_registration_acceptances_user_id_idx
  on public.terms_registration_acceptances (user_id);
create index if not exists terms_registration_acceptances_accepted_at_idx
  on public.terms_registration_acceptances (accepted_at desc);

alter table public.terms_registration_acceptances enable row level security;

create policy "Users insert own registration terms acceptance"
  on public.terms_registration_acceptances
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users select own registration terms acceptance"
  on public.terms_registration_acceptances
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Depends on public.is_admin_user() from migration 20260430101800.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'is_admin_user' and pronamespace = (select oid from pg_namespace where nspname = 'public'))
     and not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'terms_registration_acceptances'
      and policyname = 'Admins select all registration terms acceptances'
  ) then
    create policy "Admins select all registration terms acceptances"
      on public.terms_registration_acceptances
      for select
      to authenticated
      using (public.is_admin_user());
  end if;
end $$;
