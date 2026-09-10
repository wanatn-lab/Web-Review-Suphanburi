-- Keep this site geographically truthful: public reviews and their Geo SEO
-- must refer to Suphan Buri. Existing rows are soft-deleted so their history
-- remains recoverable in the database, while future writes are rejected.

update public.reviews
set deleted_at = coalesce(deleted_at, now())
where deleted_at is null
  and latitude is not null
  and longitude is not null
  and not (
    latitude between 13.95 and 15.25
    and longitude between 99.15 and 100.45
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_coordinates_within_suphan_buri'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_coordinates_within_suphan_buri
      check (
        (latitude is null and longitude is null)
        or (
          latitude between 13.95 and 15.25
          and longitude between 99.15 and 100.45
        )
      ) not valid;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.youtube_imports') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'youtube_imports_coordinates_within_suphan_buri'
      and conrelid = 'public.youtube_imports'::regclass
  ) then
    alter table public.youtube_imports
      add constraint youtube_imports_coordinates_within_suphan_buri
      check (
        (latitude is null and longitude is null)
        or (
          latitude between 13.95 and 15.25
          and longitude between 99.15 and 100.45
        )
      ) not valid;
  end if;
end
$$;
