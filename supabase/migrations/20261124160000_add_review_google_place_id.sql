-- Google Maps Place ID of the reviewed venue, captured when an editor picks a
-- place in the admin location picker. Lets the public "open in Maps" buttons
-- open the venue's own Google Maps page instead of a bare coordinate pin.
alter table public.reviews
  add column if not exists google_place_id text
  check (google_place_id is null or google_place_id ~ '^[A-Za-z0-9_-]{1,512}$');
