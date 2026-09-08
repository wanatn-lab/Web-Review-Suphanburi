-- Keep the public category URL correctly spelled in every environment.
-- reviews.category follows automatically through reviews_category_fkey ON UPDATE CASCADE.
UPDATE public.categories
SET slug = 'property'
WHERE slug = 'probperty';
