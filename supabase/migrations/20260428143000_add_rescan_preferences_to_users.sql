alter table users
  add column if not exists rescan_empty_only boolean not null default false,
  add column if not exists rescan_preview_diff boolean not null default false;

