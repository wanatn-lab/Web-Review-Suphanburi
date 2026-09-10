-- Prevent future reviews from publishing a map pin outside Suphan Buri.
-- NOT VALID keeps existing rows untouched; the application hides any legacy
-- out-of-range pin until an editor verifies and corrects it.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_latitude_suphan_buri_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_latitude_suphan_buri_check
      check (latitude is null or latitude between 13.95 and 15.25) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_longitude_suphan_buri_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_longitude_suphan_buri_check
      check (longitude is null or longitude between 99.15 and 100.45) not valid;
  end if;
end
$$;
