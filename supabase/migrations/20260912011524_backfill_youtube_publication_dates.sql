-- A review becomes public when an editor approves it, not when the source
-- video was originally uploaded.  Keep the original source timestamp in
-- youtube_imports.video_published_at, while moving published records into the
-- site's latest feed at their actual approval time.
update public.reviews as review
set created_at = imported.decided_at
from public.youtube_imports as imported
where review.youtube_video_id = imported.video_id
  and imported.status = 'published'
  and imported.decided_at is not null
  and review.created_at is distinct from imported.decided_at;
