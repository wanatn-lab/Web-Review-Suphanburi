-- Google Maps link of the reviewed venue, pasted by an editor from the
-- Google Maps "Share" button. Free alternative to the Places API: the public
-- "open in Maps" buttons open this link, so readers land on the venue page.
alter table public.reviews
  add column if not exists google_maps_url text
  check (google_maps_url is null or (google_maps_url ~ '^https://' and length(google_maps_url) <= 2048));
