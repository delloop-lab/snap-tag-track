alter table users
  add column if not exists receipt_location_disabled boolean not null default false;

comment on column public.users.receipt_location_disabled is
  'When true, new receipt captures never attach photo/device location and skip the capture-time location prompt.';
