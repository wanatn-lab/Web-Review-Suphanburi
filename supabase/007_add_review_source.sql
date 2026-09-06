-- supabase/007_add_review_source.sql
-- Distinguish automatic Facebook imports from temporary manual content.
-- The default keeps /api/sync-facebook working unchanged: rows inserted by
-- that route automatically receive source = 'facebook_auto'.

alter table public.reviews
  add column if not exists source text;

update public.reviews
set source = 'facebook_auto'
where source is null;

alter table public.reviews
  alter column source set default 'facebook_auto',
  alter column source set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_source_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_source_check
      check (source in ('facebook_auto', 'manual'));
  end if;
end
$$;
