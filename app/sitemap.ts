import type { MetadataRoute } from "next";
import { getAllReviews } from "@/lib/supabase";
import { getCategories } from "@/lib/categories";

// app/sitemap.ts — Next.js auto-serves this at /sitemap.xml
// ดึงรีวิวทั้งหมดจาก Supabase มาขึ้น sitemap อัตโนมัติ ไม่ต้องอัปเดตมือ

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphanburi.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [reviews, categories] = await Promise.all([getAllReviews(500), getCategories()]);

  const reviewEntries: MetadataRoute.Sitemap = reviews.map((review) => ({
    url: `${SITE_URL}/reviews/${review.slug}`,
    lastModified: review.created_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [{ url: SITE_URL, changeFrequency: "daily", priority: 1 }, { url: `${SITE_URL}/must-visit-suphanburi`, changeFrequency: "weekly", priority: 0.9 }, ...categoryEntries, ...reviewEntries];
}
