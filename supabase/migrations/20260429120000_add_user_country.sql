alter table users
  add column if not exists country text;

comment on column users.country is 'User country (display name, required in app profile form).';
