-- The moderation screen filters queued YouTube clips by category.  The
-- foreign-key constraint does not create an index on this child column.
create index if not exists youtube_imports_category_idx
  on public.youtube_imports (category);
