alter table public.users
  add column if not exists preferred_display_currency text not null default 'GBP';

comment on column public.users.preferred_display_currency is
  'ISO 4217 code used when formatting receipt totals if receipts.currency is null (user Profile preference).';
