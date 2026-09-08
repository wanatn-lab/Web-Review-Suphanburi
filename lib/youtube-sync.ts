import "server-only";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS = 50;

interface YouTubeApiError {
  error?: { message?: string };
}

interface ChannelListResponse extends YouTubeApiError {
  items?: Array<{
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
}

interface YouTubeThumbnails {
  maxres?: { url?: string };
  standard?: { url?: string };
  high?: { url?: string };
  medium?: { url?: string };
  default?: { url?: string };
}

interface PlaylistItemsResponse extends YouTubeApiError {
  items?: Array<{
    contentDetails?: { videoId?: string; videoPublishedAt?: string };
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      resourceId?: { kind?: string; videoId?: string };
      thumbnails?: YouTubeThumbnails;
    };
  }>;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string | null;
  permalinkUrl: string;
  publishedAt: string;
  thumbnailUrl: string | null;
}

function errorMessage(payload: YouTubeApiError | null, fallback: string): string {
  return payload?.error?.message?.trim() || fallback;
}

function thumbnailUrl(thumbnails: YouTubeThumbnails | undefined): string | null {
  if (!thumbnails) return null;
  return thumbnails.maxres?.url ?? thumbnails.standard?.url ?? thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url ?? null;
}

/**
 * Reads the latest public uploads from one YouTube channel. This intentionally
 * uses the channel's uploads playlist instead of search.list: the two calls
 * cost one quota unit each, return uploads in reverse chronological order, and
 * do not need OAuth for a public channel when called with an API key.
 */
export async function fetchChannelVideos(channelId: string, apiKey: string, limit = 10): Promise<YouTubeVideo[]> {
  const safeLimit = Math.max(1, Math.min(limit, MAX_RESULTS));
  const channelUrl = new URL(`${YOUTUBE_API_BASE}/channels`);
  channelUrl.searchParams.set("part", "contentDetails");
  channelUrl.searchParams.set("id", channelId);
  channelUrl.searchParams.set("key", apiKey);

  let channelResponse: Response;
  try {
    channelResponse = await fetch(channelUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new Error("เชื่อมต่อ YouTube Data API ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }

  const channelPayload = (await channelResponse.json().catch(() => null)) as ChannelListResponse | null;
  if (!channelResponse.ok || !channelPayload) {
    throw new Error(`YouTube Data API error: ${errorMessage(channelPayload, channelResponse.statusText)}`);
  }

  const uploadsPlaylistId = channelPayload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error("ไม่พบ uploads playlist ของช่อง YouTube นี้");
  }

  const playlistUrl = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
  playlistUrl.searchParams.set("part", "snippet,contentDetails");
  playlistUrl.searchParams.set("playlistId", uploadsPlaylistId);
  playlistUrl.searchParams.set("maxResults", String(safeLimit));
  playlistUrl.searchParams.set("key", apiKey);

  let playlistResponse: Response;
  try {
    playlistResponse = await fetch(playlistUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new Error("เชื่อมต่อ YouTube Data API ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }

  const playlistPayload = (await playlistResponse.json().catch(() => null)) as PlaylistItemsResponse | null;
  if (!playlistResponse.ok || !playlistPayload) {
    throw new Error(`YouTube Data API error: ${errorMessage(playlistPayload, playlistResponse.statusText)}`);
  }

  return (playlistPayload.items ?? []).flatMap((item) => {
    const id = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
    const title = item.snippet?.title?.trim();
    if (!id || !title || title === "Private video" || title === "Deleted video") return [];

    return [{
      id,
      title,
      description: item.snippet?.description?.trim() || null,
      permalinkUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
      publishedAt: item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? new Date().toISOString(),
      thumbnailUrl: thumbnailUrl(item.snippet?.thumbnails),
    }];
  });
}

export function buildSlugFromYouTubeVideoId(videoId: string): string {
  return `yt-${videoId}`;
}
