-- Add YouTube as a first-class review source plus a private moderation queue.
-- Syncing only creates pending rows in youtube_imports; an authenticated editor
-- explicitly publishes a row before it appears in public.reviews.

alter table public.reviews
  add column if not exists youtube_embed_url text,
  add column if not exists youtube_video_id text;

create unique index if not exists reviews_youtube_video_id_unique_idx
  on public.reviews (youtube_video_id)
  where youtube_video_id is not null;

alter table public.reviews
  drop constraint if exists reviews_source_check;

alter table public.reviews
  add constraint reviews_source_check
  check (source in ('facebook_auto', 'youtube_auto', 'manual'));

create table if not exists public.youtube_imports (
  id                    uuid primary key default gen_random_uuid(),
  video_id              text not null unique,
  video_url             text not null,
  original_title        text not null,
  original_description  text,
  seo_title             text not null,
  seo_description       text not null,
  category              text not null references public.categories(slug) on update cascade on delete restrict,
  cover_image           text,
  duration_seconds      integer not null check (duration_seconds between 1 and 180),
  video_published_at    timestamptz not null,
  latitude              double precision,
  longitude             double precision,
  location_text         text,
  ai_generated          boolean not null default false,
  status                text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  published_review_slug text unique,
  synced_at             timestamptz not null default now(),
  decided_at            timestamptz
);

create index if not exists youtube_imports_pending_idx
  on public.youtube_imports (synced_at desc)
  where status = 'pending';

-- The table is service-role/admin only. No public select policy means a queued
-- clip and its AI draft cannot leak before an editor approves it.
alter table public.youtube_imports enable row level security;
