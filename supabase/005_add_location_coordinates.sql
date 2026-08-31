-- supabase/005_add_location_coordinates.sql
-- Migration: add the exact coordinate columns used by /api/sync-facebook.
-- Additive and idempotent; nullable columns preserve all existing rows.

alter table public.reviews
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
