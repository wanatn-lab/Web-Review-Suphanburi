import { NextResponse } from "next/server";
import { guessCategory } from "@/lib/facebook-sync";
import { geocodeFromCaption } from "@/lib/geocoding";
import { isCronAuthorized } from "@/lib/cron-auth";
import { createEnhancedSeoContent, type ManualSeoCategory } from "@/lib/manual-content";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { fetchChannelVideos } from "@/lib/youtube-sync";

export const dynamic = "force-dynamic";

const DEFAULT_CHANNEL_ID = "UCa0RGWD2my60NoN2RM04_Xw";
const UPLOADS_TO_CHECK = 50;
const MAX_NEW_IMPORTS_PER_RUN = 10;

interface YouTubeImportInsertRow {
  video_id: string;
  video_url: string;
  original_title: string;
  original_description: string | null;
  seo_title: string;
  seo_description: string;
  category: string;
  cover_image: string | null;
  duration_seconds: number;
  video_published_at: string;
  latitude: number | null;
  longitude: number | null;
  location_text: string | null;
  ai_generated: boolean;
}

/**
 * Pulls public Shorts candidates into a private moderation queue. Nothing from
 * this route is public until an authenticated editor presses "publish" in the
 * admin page. Vercel Cron sends CRON_SECRET as an Authorization header.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing YOUTUBE_API_KEY environment variable" }, { status: 500 });
  }

  const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID;

  try {
    // fetchChannelVideos obtains duration with videos.list and keeps only
    // uploads no longer than three minutes. Public Data API has no reliable
    // isShort flag, so portrait/square verification happens in the queue.
    const shortCandidates = await fetchChannelVideos(channelId, apiKey, UPLOADS_TO_CHECK);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from("categories")
      .select("slug, label")
      .eq("is_active", true);
    if (categoriesError || !categories?.length) {
      throw new Error(`Failed to load active categories: ${categoriesError?.message ?? "none configured"}`);
    }

    if (shortCandidates.length === 0) {
      return NextResponse.json({
        channelId,
        shortCandidates: 0,
        queued: 0,
        skipped: 0,
        message: "No public Shorts candidates found in the latest uploads",
      });
    }

    const videoIds = shortCandidates.map((video) => video.id);
    const [{ data: existingImports, error: importError }, { data: existingReviews, error: reviewError }] = await Promise.all([
      supabaseAdmin.from("youtube_imports").select("video_id").in("video_id", videoIds),
      supabaseAdmin.from("reviews").select("youtube_video_id").in("youtube_video_id", videoIds),
    ]);
    if (importError || reviewError) {
      throw new Error(`Failed to check existing YouTube videos: ${importError?.message ?? reviewError?.message}`);
    }

    const existingIds = new Set([
      ...(existingImports ?? []).map((row) => row.video_id),
      ...(existingReviews ?? []).flatMap((row) => row.youtube_video_id ? [row.youtube_video_id] : []),
    ]);
    const newVideos = shortCandidates
      .filter((video) => !existingIds.has(video.id))
      .slice(0, MAX_NEW_IMPORTS_PER_RUN);

    if (newVideos.length === 0) {
      return NextResponse.json({
        channelId,
        shortCandidates: shortCandidates.length,
        queued: 0,
        skipped: shortCandidates.length,
        message: "Every Shorts candidate has already been reviewed or queued",
      });
    }

    const categoryBySlug = new Map((categories as ManualSeoCategory[]).map((category) => [category.slug, category]));
    const fallbackCategory = categoryBySlug.get("food") ?? categories[0] as ManualSeoCategory;

    const rows = await Promise.all(newVideos.map(async (video): Promise<YouTubeImportInsertRow> => {
      const rawContent = video.description || video.title;
      const category = categoryBySlug.get(guessCategory(`${video.title}\n${rawContent}`)) ?? fallbackCategory;
      const [seo, geo] = await Promise.all([
        createEnhancedSeoContent(category, video.title, rawContent),
        geocodeFromCaption(`${video.title}\n${rawContent}`),
      ]);

      return {
        video_id: video.id,
        video_url: video.permalinkUrl,
        original_title: video.title,
        original_description: video.description,
        seo_title: seo.title,
        seo_description: seo.description,
        category: category.slug,
        cover_image: video.thumbnailUrl,
        duration_seconds: video.durationSeconds,
        video_published_at: video.publishedAt,
        latitude: geo?.lat ?? null,
        longitude: geo?.lng ?? null,
        location_text: geo?.locationText ?? null,
        ai_generated: seo.aiGenerated,
      };
    }));

    const { error: insertError } = await supabaseAdmin.from("youtube_imports").insert(rows);
    if (insertError) {
      throw new Error(`Failed to queue YouTube videos: ${insertError.message}`);
    }

    return NextResponse.json({
      channelId,
      shortCandidates: shortCandidates.length,
      queued: rows.length,
      skipped: shortCandidates.length - rows.length,
      queuedTitles: rows.map((row) => row.seo_title),
      note: "Shorts candidates are private until an editor publishes them from the admin queue.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-youtube]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
