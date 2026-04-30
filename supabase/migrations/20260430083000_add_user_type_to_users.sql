alter table users
  add column if not exists user_type text;

update users
set user_type = 'user'
where user_type is null
   or user_type not in ('user', 'admin');

alter table users
  alter column user_type set default 'user',
  alter column user_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_user_type_check'
  ) then
    alter table users
      add constraint users_user_type_check
      check (user_type in ('user', 'admin'));
  end if;
end $$;
