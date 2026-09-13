import type { MetadataRoute } from "next";

// app/robots.ts — Next.js auto-serves this at /robots.txt

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphanburi.com";

export default function robots(): MetadataRoute.Robots {
  return {
    // Search results send `noindex, follow` from app/search/page.tsx. Keep the
    // URL crawlable so Google can see that directive; robots.txt must not be
    // used as the indexation control for a page that should be excluded.
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/video-sitemap.xml`],
  };
}
