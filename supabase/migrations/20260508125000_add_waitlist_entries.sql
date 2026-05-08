create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  email text not null unique,
  source text not null default 'unknown',
  request_count integer not null default 1,
  created_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now()
);

alter table public.waitlist_entries enable row level security;

create index if not exists waitlist_entries_email_idx on public.waitlist_entries (email);
create index if not exists waitlist_entries_last_requested_idx on public.waitlist_entries (last_requested_at desc);
