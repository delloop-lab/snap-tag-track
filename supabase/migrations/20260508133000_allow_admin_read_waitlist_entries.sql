-- Allow admin users to read waitlist entries in /admin.
-- Waitlist writes are handled by server-side routes with service role key.

alter table if exists public.waitlist_entries enable row level security;

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'is_admin_user'
      and pronamespace = (select oid from pg_namespace where nspname = 'public')
  )
  and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'waitlist_entries'
      and policyname = 'Admins can read waitlist entries'
  ) then
    create policy "Admins can read waitlist entries"
      on public.waitlist_entries
      for select
      to authenticated
      using (public.is_admin_user());
  end if;
end $$;
