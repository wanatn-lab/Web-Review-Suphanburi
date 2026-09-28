import type { MetadataRoute } from "next";
import { reviewVideo } from "@/lib/video-metadata";
import { SITE_URL } from "@/lib/site";
import { getAllReviews } from "@/lib/supabase";
import { getCategories } from "@/lib/categories";

// app/sitemap.ts — Next.js auto-serves this at /sitemap.xml
// ดึงรีวิวทั้งหมดจาก Supabase มาขึ้น sitemap อัตโนมัติ ไม่ต้องอัปเดตมือ


export const revalidate = 60;
// The public data source is available at runtime in Vercel but deliberately
// absent from GitHub's build job. Generate this metadata route at request time
// so CI never publishes an empty sitemap or fails before deployment.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [reviews, categories] = await Promise.all([getAllReviews(undefined, { failOnError: true }), getCategories()]);

  const reviewEntries: MetadataRoute.Sitemap = reviews.map((review) => ({
    url: `${SITE_URL}/reviews/${review.slug}`,
    lastModified: review.updated_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/must-visit-suphanburi`, changeFrequency: "weekly", priority: 0.9 },
    ...["/about", "/contact", "/latest-videos", "/featured-videos"].map((path) => ({ url: `${SITE_URL}${path}` })),
  ];
  const watchEntries: MetadataRoute.Sitemap = reviews.filter((review) => reviewVideo(review)).map((review) => ({
    url: `${SITE_URL}/watch/${encodeURIComponent(review.slug)}`,
    lastModified: review.updated_at,
  }));
  return [...staticEntries, ...categoryEntries, ...reviewEntries, ...watchEntries];
}
