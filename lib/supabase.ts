// lib/supabase.ts
// Supabase client + data access for the "reviews" table.
// Uses only the public anon key (read-only, RLS-protected) so this file is
// safe to import from Server Components for SSR data fetching — Google Bot
// gets the fully-rendered HTML on the very first response, no client fetch.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — ตรวจสอบไฟล์ .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

/**
 * Used when Supabase is reachable but cannot serve a query, or when the
 * network request itself fails. This differs from a genuine missing record:
 * callers render a retry screen instead of a false 404 or empty feed.
 */
export class ReviewsDataUnavailableError extends Error {
  constructor() {
    super("Reviews data is temporarily unavailable");
    this.name = "ReviewsDataUnavailableError";
  }
}

function throwDataUnavailable(operation: string, error: unknown): never {
  // Keep technical details in server logs; the UI only shows a safe retry message.
  console.error(`[${operation}] Supabase request failed:`, error);
  throw new ReviewsDataUnavailableError();
}

export interface Review {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  /** เพิ่มจาก supabase/002_add_category_cover_image.sql — จำเป็นสำหรับ Home/Category page */
  category: string | null;
  cover_image: string | null;
  facebook_embed_url: string | null;
  tiktok_embed_url: string | null;
  google_map_embed_url: string | null;
  latitude: number | null;
  longitude: number | null;
  /** เพิ่มจาก supabase/003_add_location_text.sql — ข้อความสถานที่สั้นๆ เช่น "อ.เมือง สุพรรณบุรี" ใช้โชว์บนการ์ด + hashtag */
  location_text: string | null;
  /** เพิ่มจาก supabase/004_add_facebook_post_id.sql — กัน insert ซ้ำตอน sync จาก Facebook อัตโนมัติ */
  facebook_post_id: string | null;
  created_at: string;
}

const REVIEW_COLUMNS =
  "id, title, slug, description, category, cover_image, facebook_embed_url, tiktok_embed_url, google_map_embed_url, latitude, longitude, location_text, facebook_post_id, created_at";

/** ดึงรีวิว 1 รายการจาก slug สำหรับหน้า Dynamic Route */
export async function getReviewBySlug(slug: string): Promise<Review | null> {
  let data: Review | null;
  let error: unknown;

  try {
    ({ data, error } = await supabase
      .from("reviews")
      .select(REVIEW_COLUMNS)
      .eq("slug", slug)
      .maybeSingle());
  } catch (requestError) {
    return throwDataUnavailable(`getReviewBySlug slug=${slug}`, requestError);
  }

  if (error) {
    return throwDataUnavailable(`getReviewBySlug slug=${slug}`, error);
  }

  return data;
}

/** ดึงรีวิวล่าสุด สำหรับ Home Page (Trending rail + ฟีดรีวิวล่าสุด) */
export async function getAllReviews(limit = 24, offset = 0): Promise<Review[]> {
  let data: Review[] | null;
  let error: unknown;

  try {
    ({ data, error } = await supabase
      .from("reviews")
      .select(REVIEW_COLUMNS)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1));
  } catch (requestError) {
    return throwDataUnavailable("getAllReviews", requestError);
  }

  if (error) {
    return throwDataUnavailable("getAllReviews", error);
  }

  return data ?? [];
}

/** ดึงรีวิวตามหมวดหมู่ สำหรับ Category Page */
export async function getReviewsByCategory(category: string, limit = 24, offset = 0): Promise<Review[]> {
  let data: Review[] | null;
  let error: unknown;

  try {
    ({ data, error } = await supabase
      .from("reviews")
      .select(REVIEW_COLUMNS)
      .eq("category", category)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1));
  } catch (requestError) {
    return throwDataUnavailable(`getReviewsByCategory category=${category}`, requestError);
  }

  if (error) {
    return throwDataUnavailable(`getReviewsByCategory category=${category}`, error);
  }

  return data ?? [];
}

/** ค้นหารีวิวจาก title/description สำหรับช่อง Search บน Home Page */
export async function searchReviews(query: string, limit = 24, offset = 0): Promise<Review[]> {
  // PostgREST .or() uses raw filter syntax. Remove its separators and SQL ILIKE
  // wildcard characters so a search for "%" or "_" cannot enumerate every row.
  const sanitized = query.trim().replace(/[,()%_]/g, "");
  if (!sanitized) return [];

  let data: Review[] | null;
  let error: unknown;

  try {
    ({ data, error } = await supabase
      .from("reviews")
      .select(REVIEW_COLUMNS)
      .or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1));
  } catch (requestError) {
    return throwDataUnavailable(`searchReviews query=${sanitized}`, requestError);
  }

  if (error) {
    return throwDataUnavailable(`searchReviews query=${sanitized}`, error);
  }

  return data ?? [];
}
