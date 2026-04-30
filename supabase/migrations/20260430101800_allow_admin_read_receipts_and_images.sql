-- Allow admins (users.user_type = 'admin') to see all receipts and receipt images.
-- Keeps owner access behavior intact.

create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.user_type = 'admin'
  );
$$;

-- receipts table policies
alter table if exists public.receipts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'receipts'
      and policyname = 'Admins can read all receipts'
  ) then
    create policy "Admins can read all receipts"
      on public.receipts
      for select
      to authenticated
      using (public.is_admin_user());
  end if;
end $$;

-- storage.objects policies for bucket 'receipts'
-- Note: do NOT ALTER storage.objects here; ownership is managed by Supabase Storage.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can read all receipt objects'
  ) then
    create policy "Admins can read all receipt objects"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'receipts'
        and public.is_admin_user()
      );
  end if;
end $$;
