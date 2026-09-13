import { getAllReviews } from "@/lib/supabase";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.reviewsuphanburi.com";

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] ?? character);
}

function videoEntry(review: Awaited<ReturnType<typeof getAllReviews>>[number]): string | null {
  const youtubePlayer = review.youtube_video_id
    ? `https://www.youtube.com/embed/${encodeURIComponent(review.youtube_video_id)}`
    : null;
  const playerLoc = youtubePlayer ?? review.facebook_embed_url ?? review.tiktok_embed_url ?? review.youtube_embed_url;
  const thumbnail = review.cover_image ?? (review.youtube_video_id
    ? `https://i.ytimg.com/vi/${encodeURIComponent(review.youtube_video_id)}/hqdefault.jpg`
    : null);
  if (!playerLoc || !thumbnail) return null;

  const title = (review.title || "วิดีโอรีวิวสุพรรณบุรี").trim();
  const description = (review.description || title).replace(/\s+/g, " ").trim().slice(0, 500);
  const publicationDate = review.video_published_at ?? review.created_at;

  return [
    "  <url>",
    `    <loc>${escapeXml(`${SITE_URL}/reviews/${review.slug}`)}</loc>`,
    "    <video:video>",
    `      <video:thumbnail_loc>${escapeXml(thumbnail)}</video:thumbnail_loc>`,
    `      <video:title>${escapeXml(title)}</video:title>`,
    `      <video:description>${escapeXml(description)}</video:description>`,
    `      <video:player_loc>${escapeXml(playerLoc)}</video:player_loc>`,
    `      <video:publication_date>${escapeXml(publicationDate)}</video:publication_date>`,
    "    </video:video>",
    "  </url>",
  ].join("\n");
}

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const reviews = await getAllReviews(500);
  const entries = reviews.map(videoEntry).filter((entry): entry is string => Boolean(entry));
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    ...entries,
    "</urlset>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
