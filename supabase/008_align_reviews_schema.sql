-- Align legacy reviews tables with the columns used by the current app.
-- Run after migrations 002-007. It is additive and preserves existing rows.

begin;

alter table public.reviews
  add column if not exists description text,
  add column if not exists google_map_embed_url text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_text text,
  add column if not exists facebook_post_id text;

-- Older installations stored the body and location under these legacy names.
-- to_jsonb() lets this migration work whether those old columns exist or not.
update public.reviews as review
set description = coalesce(
  review.description,
  to_jsonb(review) ->> 'content',
  to_jsonb(review) ->> 'excerpt',
  to_jsonb(review) ->> 'caption'
)
where review.description is null;

update public.reviews as review
set location_text = coalesce(
  review.location_text,
  to_jsonb(review) ->> 'location_name',
  to_jsonb(review) ->> 'district'
)
where review.location_text is null;

update public.reviews as review
set latitude = coalesce(
      review.latitude,
      nullif(to_jsonb(review) ->> 'location_lat', '')::double precision
    ),
    longitude = coalesce(
      review.longitude,
      nullif(to_jsonb(review) ->> 'location_lng', '')::double precision
    )
where review.latitude is null or review.longitude is null;

create index if not exists reviews_created_at_idx
  on public.reviews (created_at desc);
create unique index if not exists reviews_facebook_post_id_key
  on public.reviews (facebook_post_id)
  where facebook_post_id is not null;

-- Keep the public read model working on projects where Data API privileges
-- are not granted automatically. RLS remains enabled and limits rows.
grant usage on schema public to anon, authenticated;
grant select on table public.reviews to anon, authenticated;

commit;
