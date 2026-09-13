-- Replace the generic imported slug with a stable, readable restaurant URL.
UPDATE public.reviews
SET slug = 'zon-saep-uthong'
WHERE slug = 'trip' AND deleted_at IS NULL;
