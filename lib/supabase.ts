import { createClient } from "@supabase/supabase-js";
import { resilientFetch } from "./supabase-fetch";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — ตรวจสอบไฟล์ .env.local");

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false }, global: { fetch: resilientFetch } });

export interface Review {
  id: string; title: string; slug: string; description: string | null; category: string | null;
  category_label: string | null; cover_image: string | null; facebook_embed_url: string | null;
  tiktok_embed_url: string | null; youtube_embed_url: string | null; google_map_embed_url: string | null; latitude: number | null;
  longitude: number | null; location_text: string | null; facebook_post_id: string | null; youtube_video_id: string | null;
  is_must_visit: boolean; must_visit_order: number | null; created_at: string; deleted_at: string | null;
}
type ReviewRow = Omit<Review, "category_label"> & { categories: { label: string } | { label: string }[] | null; };
const REVIEW_COLUMNS = "id, title, slug, description, category, cover_image, facebook_embed_url, tiktok_embed_url, youtube_embed_url, google_map_embed_url, latitude, longitude, location_text, facebook_post_id, youtube_video_id, is_must_visit, must_visit_order, created_at, deleted_at, categories(label)";

function toReview(row: ReviewRow): Review {
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  const { categories, ...review } = row;
  return { ...review, category_label: category?.label ?? null };
}

export async function getReviewBySlug(slug: string): Promise<Review | null> {
  const { data, error } = await supabase.from("reviews").select(REVIEW_COLUMNS).is("deleted_at", null).eq("slug", slug).maybeSingle();
  if (error) { console.error(`[getReviewBySlug] slug="${slug}":`, error.message); return null; }
  return data ? toReview(data as unknown as ReviewRow) : null;
}
export async function getAllReviews(limit = 24): Promise<Review[]> {
  const { data, error } = await supabase.from("reviews").select(REVIEW_COLUMNS).is("deleted_at", null).order("created_at", { ascending: false }).limit(limit);
  if (error) { console.error("[getAllReviews]:", error.message); return []; }
  return (data ?? []).map((row) => toReview(row as unknown as ReviewRow));
}
export async function getReviewsByCategory(category: string, limit = 24): Promise<Review[]> {
  const { data, error } = await supabase.from("reviews").select(REVIEW_COLUMNS).is("deleted_at", null).eq("category", category).order("created_at", { ascending: false }).limit(limit);
  if (error) { console.error(`[getReviewsByCategory] category="${category}":`, error.message); return []; }
  return (data ?? []).map((row) => toReview(row as unknown as ReviewRow));
}
export async function getMustVisitReviews(limit = 24): Promise<Review[]> {
  const { data, error } = await supabase.from("reviews").select(REVIEW_COLUMNS)
    .is("deleted_at", null).eq("is_must_visit", true)
    .order("must_visit_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false }).limit(limit);
  if (error) { console.error("[getMustVisitReviews]:", error.message); return []; }
  return (data ?? []).map((row) => toReview(row as unknown as ReviewRow));
}
export async function searchReviews(query: string, limit = 24): Promise<Review[]> {
  const sanitized = query.trim().replace(/[,()]/g, "");
  if (!sanitized) return [];
  const { data, error } = await supabase.from("reviews").select(REVIEW_COLUMNS).is("deleted_at", null)
    .or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`).order("created_at", { ascending: false }).limit(limit);
  if (error) { console.error(`[searchReviews] query="${sanitized}":`, error.message); return []; }
  return (data ?? []).map((row) => toReview(row as unknown as ReviewRow));
}