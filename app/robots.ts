import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// app/robots.ts — Next.js auto-serves this at /robots.txt


export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/search", "/admin", "/api/"] }],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/video-sitemap.xml`],
  };
}
