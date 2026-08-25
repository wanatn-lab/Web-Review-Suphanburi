import type { MetadataRoute } from "next";

// app/robots.ts — Next.js auto-serves this at /robots.txt

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphan.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/search"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
