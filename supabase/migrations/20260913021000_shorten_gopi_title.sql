-- Keep the exact restaurant name and location while leaving room for the
-- site's title template on search-result snippets.
UPDATE public.reviews
SET title = 'โกปี๊ หลังโรงไม้ | ติ่มซำสุพรรณบุรี'
WHERE slug = 'food-40267fab' AND deleted_at IS NULL;
