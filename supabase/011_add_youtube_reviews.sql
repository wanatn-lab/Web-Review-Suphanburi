-- Add YouTube as a first-class review source. A partial unique index keeps the
-- cron idempotent while preserving rows from Facebook/manual imports.

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
