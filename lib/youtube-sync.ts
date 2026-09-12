import "server-only";

import { youtubeThumbnailCandidates } from "@/lib/youtube-thumbnails";

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

interface VideosListResponse extends YouTubeApiError {
  items?: Array<{
    id?: string;
    contentDetails?: { duration?: string };
  }>;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string | null;
  permalinkUrl: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  /** Duration from videos.list, in seconds. The public API has no definitive
   * `isShort` attribute, so the caller should treat this as a Shorts candidate
   * and still let an editor decide whether to publish it. */
  durationSeconds: number;
}

function errorMessage(payload: YouTubeApiError | null, fallback: string): string {
  return payload?.error?.message?.trim() || fallback;
}

function thumbnailUrl(videoId: string, thumbnails: YouTubeThumbnails | undefined): string | null {
  const apiThumbnail = thumbnails?.maxres?.url;
  if (apiThumbnail) return apiThumbnail;

  // maxresdefault is usually 1280px wide and is available even when the API
  // only reports a smaller `high`/`standard` thumbnail. The UI retries the
  // API-style fallbacks for videos that do not expose a max-resolution file.
  return youtubeThumbnailCandidates(videoId)[0]
    ?? thumbnails?.standard?.url
    ?? thumbnails?.high?.url
    ?? thumbnails?.medium?.url
    ?? thumbnails?.default?.url
    ?? null;
}

/** Converts the ISO 8601 duration returned by YouTube, e.g. PT1M30S, to seconds. */
export function durationToSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match) return null;

  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);
  const total = hours * 3_600 + minutes * 60 + seconds;
  return Number.isFinite(total) ? total : null;
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

  const videos = (playlistPayload.items ?? []).flatMap((item) => {
    const id = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
    const title = item.snippet?.title?.trim();
    if (!id || !title || title === "Private video" || title === "Deleted video") return [];

    return [{
      id,
      title,
      description: item.snippet?.description?.trim() || null,
      permalinkUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
      publishedAt: item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? new Date().toISOString(),
      thumbnailUrl: thumbnailUrl(id, item.snippet?.thumbnails),
    }];
  });

  if (videos.length === 0) return [];

  const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
  detailsUrl.searchParams.set("part", "contentDetails");
  detailsUrl.searchParams.set("id", videos.map((video) => video.id).join(","));
  detailsUrl.searchParams.set("key", apiKey);

  let detailsResponse: Response;
  try {
    detailsResponse = await fetch(detailsUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new Error("เชื่อมต่อ YouTube Data API ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }

  const detailsPayload = (await detailsResponse.json().catch(() => null)) as VideosListResponse | null;
  if (!detailsResponse.ok || !detailsPayload) {
    throw new Error(`YouTube Data API error: ${errorMessage(detailsPayload, detailsResponse.statusText)}`);
  }

  const durations = new Map<string, number>();
  for (const item of detailsPayload.items ?? []) {
    const seconds = durationToSeconds(item.contentDetails?.duration);
    if (item.id && seconds !== null) durations.set(item.id, seconds);
  }

  // YouTube treats eligible vertical/square uploads up to three minutes as
  // Shorts. The public Data API only gives us duration, not a trustworthy
  // public Shorts/portrait flag, therefore duration is the conservative
  // machine-checkable filter and the admin queue is the final approval step.
  return videos.flatMap((video) => {
    const durationSeconds = durations.get(video.id);
    if (!durationSeconds || durationSeconds > 180) return [];
    return [{ ...video, durationSeconds }];
  });
}

export function buildSlugFromYouTubeVideoId(videoId: string): string {
  return `yt-${videoId}`;
}
