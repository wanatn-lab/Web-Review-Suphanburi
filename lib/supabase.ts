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
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(`[getReviewBySlug] slug="${slug}":`, error.message);
    return null;
  }

  return data;
}

/** ดึงรีวิวล่าสุด สำหรับ Home Page (Trending rail + ฟีดรีวิวล่าสุด) */
export async function getAllReviews(limit = 24): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getAllReviews]:", error.message);
    return [];
  }

  return data ?? [];
}

/** ดึงรีวิวตามหมวดหมู่ สำหรับ Category Page */
export async function getReviewsByCategory(category: string, limit = 24): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[getReviewsByCategory] category="${category}":`, error.message);
    return [];
  }

  return data ?? [];
}

/** ค้นหารีวิวจาก title/description สำหรับช่อง Search บน Home Page */
export async function searchReviews(query: string, limit = 24): Promise<Review[]> {
  // กัน comma/parenthesis หลุดเข้าไปเปลี่ยนความหมายของ .or() filter ของ PostgREST
  const sanitized = query.trim().replace(/[,()]/g, "");
  if (!sanitized) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[searchReviews] query="${sanitized}":`, error.message);
    return [];
  }

  return data ?? [];
}
