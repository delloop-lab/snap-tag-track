-- Normalize existing tag names: trim, collapse spaces, capitalize first letter.
update tags
set name = case
  when btrim(name) = '' then name
  else upper(left(regexp_replace(btrim(name), '\s+', ' ', 'g'), 1))
       || substr(regexp_replace(btrim(name), '\s+', ' ', 'g'), 2)
end
where name is not null;

create or replace function public.normalize_tag_name()
returns trigger
language plpgsql
as $$
begin
  if new.name is null then
    return new;
  end if;

  new.name := regexp_replace(btrim(new.name), '\s+', ' ', 'g');
  if new.name <> '' then
    new.name := upper(left(new.name, 1)) || substr(new.name, 2);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_normalize_tag_name on public.tags;
create trigger trg_normalize_tag_name
before insert or update of name
on public.tags
for each row
execute function public.normalize_tag_name();
