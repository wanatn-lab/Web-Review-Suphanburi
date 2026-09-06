-- Soft-delete reviews from the public site without losing the row.
-- This also prevents Facebook auto-sync from re-inserting a hidden post.

alter table public.reviews
  add column if not exists deleted_at timestamptz;

create index if not exists reviews_deleted_at_idx
  on public.reviews (deleted_at);
