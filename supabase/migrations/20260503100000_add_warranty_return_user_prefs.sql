alter table public.users
  add column if not exists warranty_default_months integer not null default 36
    check (warranty_default_months >= 1 and warranty_default_months <= 600);

alter table public.users
  add column if not exists return_window_days integer not null default 30
    check (return_window_days >= 0 and return_window_days <= 365);

comment on column public.users.warranty_default_months is
  'Default warranty length from purchase when receipt has no warranty_expires_at (typical period for user region).';

comment on column public.users.return_window_days is
  'Days after purchase the user tracks for easy return; shown as a reminder in the app (not legal advice).';
