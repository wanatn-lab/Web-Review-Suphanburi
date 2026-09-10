-- Fresh-install schema for Review Suphanburi.
-- For a database that already has the old reviews table, run migrations
-- 002 through 008 in order instead of running this file.

create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,
  title                 text not null,
  description           text,
  category              text check (category in ('food', 'cafe', 'trip', 'stay', 'market')),
  cover_image           text,
  facebook_embed_url    text,
  tiktok_embed_url      text,
  google_map_embed_url  text,
  latitude              double precision check (latitude is null or latitude between 13.95 and 15.25),
  longitude             double precision check (longitude is null or longitude between 99.15 and 100.45),
  location_text         text,
  facebook_post_id      text,
  source                text not null default 'facebook_auto'
                        check (source in ('facebook_auto', 'manual')),
  created_at            timestamptz not null default now()
);

create index if not exists reviews_category_idx
  on public.reviews (category);
create index if not exists reviews_created_at_idx
  on public.reviews (created_at desc);
create unique index if not exists reviews_facebook_post_id_key
  on public.reviews (facebook_post_id)
  where facebook_post_id is not null;

-- Public read access only. Content changes are made by server routes using
-- the service-role key, which bypasses RLS; the browser anon key cannot write.
alter table public.reviews enable row level security;

-- New Supabase projects can require explicit Data API privileges. Grant only
-- read access to public roles; RLS below still decides which rows are visible.
grant usage on schema public to anon, authenticated;
grant select on table public.reviews to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'Public reviews are viewable by everyone'
  ) then
    create policy "Public reviews are viewable by everyone"
      on public.reviews for select using (true);
  end if;
end
$$;

-- Token storage used only by server-side Facebook refresh/sync routes.
create table if not exists public.facebook_tokens (
  page_id      text primary key,
  access_token text not null,
  expires_at   timestamptz not null,
  updated_at   timestamptz not null default now()
);

alter table public.facebook_tokens enable row level security;

-- No mock reviews are inserted here. A new production database starts empty
-- until content is added through the admin workflow or Facebook sync.
