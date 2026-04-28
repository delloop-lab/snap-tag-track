alter table receipts
  add column if not exists currency text default 'GBP';

comment on column receipts.currency is
  'ISO 4217 currency code detected by AI from receipt (e.g. GBP, EUR, USD).';
