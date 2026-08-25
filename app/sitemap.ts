import type { MetadataRoute } from "next";
import { getAllReviews } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";

// app/sitemap.ts — Next.js auto-serves this at /sitemap.xml
// ดึงรีวิวทั้งหมดจาก Supabase มาขึ้น sitemap อัตโนมัติ ไม่ต้องอัปเดตมือ

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphan.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const reviews = await getAllReviews(500);

  const reviewEntries: MetadataRoute.Sitemap = reviews.map((review) => ({
    url: `${SITE_URL}/reviews/${review.slug}`,
    lastModified: review.created_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [{ url: SITE_URL, changeFrequency: "daily", priority: 1 }, ...categoryEntries, ...reviewEntries];
}
