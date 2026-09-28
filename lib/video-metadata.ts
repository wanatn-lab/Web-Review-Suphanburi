import type { Review } from "./supabase";
import { SITE_URL } from "./site";

export type VideoProvider = "facebook" | "tiktok" | "youtube";

export function videoEmbedUrl(provider: VideoProvider, value: string, autoplay = false): string | null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (provider === "facebook") {
    if (!(host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch")) return null;
    const embed = new URL("https://www.facebook.com/plugins/video.php");
    embed.searchParams.set("href", url.toString());
    embed.searchParams.set("show_text", "false");
    embed.searchParams.set("width", "476");
    embed.searchParams.set("autoplay", String(autoplay));
    return embed.toString();
  }
  if (provider === "youtube") {
    const candidate = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0]
      : ["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"].includes(host)
        ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] : null;
    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate)
      ? `https://www.youtube-nocookie.com/embed/${candidate}?autoplay=${autoplay ? 1 : 0}&rel=0` : null;
  }
  if (!["www.tiktok.com", "tiktok.com", "m.tiktok.com"].includes(host)) return null;
  const id = url.pathname.match(/\/video\/(\d{10,25})\/?$/)?.[1];
  return id ? `https://www.tiktok.com/player/v1/${id}?autoplay=${autoplay ? 1 : 0}&controls=1&rel=0` : null;
}

export function reviewVideo(review: Pick<Review, "facebook_embed_url" | "tiktok_embed_url" | "youtube_embed_url">) {
  const sources: [VideoProvider, string | null][] = [
    ["facebook", review.facebook_embed_url], ["tiktok", review.tiktok_embed_url], ["youtube", review.youtube_embed_url],
  ];
  for (const [provider, sourceUrl] of sources) {
    if (!sourceUrl) continue;
    const embedUrl = videoEmbedUrl(provider, sourceUrl);
    if (embedUrl) return { provider, sourceUrl, embedUrl };
  }
  return null;
}

export function videoSchema(review: Review) {
  const video = reviewVideo(review);
  if (!video || !review.cover_image) return null;
  const pageUrl = `${SITE_URL}/watch/${encodeURIComponent(review.slug)}`;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": `${pageUrl}#video`,
    name: review.title,
    description: review.description || `วิดีโอรีวิว ${review.title}`,
    thumbnailUrl: [review.cover_image],
    uploadDate: review.created_at,
    embedUrl: video.embedUrl,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    inLanguage: "th-TH",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

function xml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[char]!));
}

export function buildVideoSitemap(reviews: Review[]): string {
  const entries = reviews.flatMap((review) => {
    const schema = videoSchema(review);
    if (!schema) return [];
    return [`<url><loc>${xml(schema.url)}</loc><video:video><video:thumbnail_loc>${xml(schema.thumbnailUrl[0])}</video:thumbnail_loc><video:title>${xml(schema.name.slice(0, 100))}</video:title><video:description>${xml(schema.description.slice(0, 2048))}</video:description><video:player_loc>${xml(schema.embedUrl)}</video:player_loc><video:publication_date>${xml(schema.uploadDate)}</video:publication_date></video:video></url>`];
  });
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${entries.join("")}</urlset>`;
}
