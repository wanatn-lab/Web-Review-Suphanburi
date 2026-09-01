-- supabase/006_add_facebook_tokens.sql
-- Migration: table facebook_tokens for storing the Page Access Token that the
-- refresh system maintains (see app/api/refresh-facebook-token/route.ts)
--
-- Why store this in Supabase instead of overwriting the Vercel env var:
-- A Vercel serverless function cannot modify its own environment variable at
-- runtime, so we need a real writable server-side store instead. This table
-- becomes the new source of truth; FB_PAGE_ACCESS_TOKEN in Vercel stays as the
-- "bootstrap" value used only before the refresh cron runs for the first time.
--
-- One row per page (keyed by page_id) is enough for now.
-- Additive only, safe to re-run (IF NOT EXISTS).

create table if not exists public.facebook_tokens (
  page_id      text primary key,
  access_token text not null,
  expires_at   timestamptz not null,
  updated_at   timestamptz not null default now()
);

-- No public read/insert/update policy on purpose -- this table holds a live
-- token. Only the server-side SUPABASE_SERVICE_ROLE_KEY can access it.
-- (service role bypasses RLS by design; RLS is enabled anyway so an anon key
-- accidentally pointed at this table is denied by default.)
alter table public.facebook_tokens enable row level security;

