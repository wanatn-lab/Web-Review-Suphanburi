import type { Review } from "@/lib/supabase";

export type ReviewVideoProvider = "facebook" | "tiktok" | "youtube";

export interface ReviewVideoSource {
  provider: ReviewVideoProvider;
  url: string;
}

/** Select the single video source that the site displays for a review. */
export function getReviewVideoSource(review: Review): ReviewVideoSource | null {
  if (review.facebook_embed_url) return { provider: "facebook", url: review.facebook_embed_url };
  if (review.tiktok_embed_url) return { provider: "tiktok", url: review.tiktok_embed_url };
  if (review.youtube_embed_url || review.youtube_video_id) {
    return { provider: "youtube", url: review.youtube_embed_url ?? `https://www.youtube.com/watch?v=${review.youtube_video_id}` };
  }
  return null;
}

function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const candidate = hostname === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : hostname.endsWith("youtube.com")
        ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1]
        : null;
    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

/** URL of the player itself, suitable for VideoObject.embedUrl/player_loc. */
export function getReviewVideoEmbedUrl(source: ReviewVideoSource): string | null {
  if (source.provider === "facebook") {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(source.url)}&show_text=false&width=476`;
  }
  if (source.provider === "tiktok") {
    const match = source.url.match(/video\/(\d+)/);
    return match ? `https://www.tiktok.com/player/v1/${match[1]}?controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&timestamp=1` : null;
  }
  const id = youtubeVideoId(source.url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}

/** Pilot scope: only must-visit reviews with a poster get a watch page. */
export function isMustVisitWatchPageEligible(review: Review): boolean {
  const source = getReviewVideoSource(review);
  return Boolean(review.is_must_visit && review.cover_image && source && getReviewVideoEmbedUrl(source));
}
