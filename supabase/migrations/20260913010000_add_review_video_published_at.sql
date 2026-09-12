-- Preserve the original YouTube upload timestamp separately from the date a
-- review was approved and published on this site.
alter table public.reviews
  add column if not exists video_published_at timestamptz;

update public.reviews as review
set video_published_at = imported.video_published_at
from public.youtube_imports as imported
where review.youtube_video_id = imported.video_id
  and imported.video_published_at is not null
  and review.video_published_at is distinct from imported.video_published_at;

create index if not exists reviews_video_published_at_idx
  on public.reviews (video_published_at desc);
