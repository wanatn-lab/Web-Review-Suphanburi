-- Keep the freshness signal in sitemap and structured data tied to the
-- actual content change, not only the original import date.
alter table public.reviews
  add column if not exists updated_at timestamptz;

update public.reviews
set updated_at = created_at
where updated_at is null;

alter table public.reviews
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.set_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reviews_set_updated_at on public.reviews;

create trigger reviews_set_updated_at
before update on public.reviews
for each row
execute function public.set_reviews_updated_at();
