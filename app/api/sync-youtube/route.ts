import { NextResponse } from "next/server";
import { buildSeoDescription, guessCategory } from "@/lib/facebook-sync";
import { isCronAuthorized } from "@/lib/cron-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildSlugFromYouTubeVideoId, fetchChannelVideos } from "@/lib/youtube-sync";

export const dynamic = "force-dynamic";

const DEFAULT_CHANNEL_ID = "UCa0RGWD2my60NoN2RM04_Xw";

interface ReviewInsertRow {
  title: string;
  slug: string;
  description: string;
  category: string;
  cover_image: string | null;
  facebook_embed_url: null;
  tiktok_embed_url: null;
  youtube_embed_url: string;
  google_map_embed_url: null;
  latitude: null;
  longitude: null;
  location_text: null;
  facebook_post_id: null;
  youtube_video_id: string;
  source: "youtube_auto";
  created_at: string;
}

/**
 * Pulls the newest public videos from the configured YouTube channel into
 * reviews. Vercel Cron sends CRON_SECRET as an Authorization header; the same
 * shared secret protects the existing Facebook synchronisation route.
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
    const videos = await fetchChannelVideos(channelId, apiKey, 10);
    if (videos.length === 0) {
      return NextResponse.json({ fetched: 0, inserted: 0, skipped: 0, message: "No public videos found on the channel" });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const videoIds = videos.map((video) => video.id);
    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("reviews")
      .select("youtube_video_id")
      .in("youtube_video_id", videoIds);

    if (existingError) {
      throw new Error(`Failed to check existing YouTube videos: ${existingError.message}`);
    }

    const existingIds = new Set((existingRows ?? []).map((row) => row.youtube_video_id));
    const newVideos = videos.filter((video) => !existingIds.has(video.id));
    if (newVideos.length === 0) {
      return NextResponse.json({
        fetched: videos.length,
        inserted: 0,
        skipped: videos.length,
        message: "No new clips -- every YouTube video has already been pulled in before",
      });
    }

    const rows: ReviewInsertRow[] = newVideos.map((video) => {
      const text = video.description || video.title;
      return {
        title: video.title,
        slug: buildSlugFromYouTubeVideoId(video.id),
        description: buildSeoDescription(text),
        category: guessCategory(`${video.title}\n${text}`),
        cover_image: video.thumbnailUrl,
        facebook_embed_url: null,
        tiktok_embed_url: null,
        youtube_embed_url: video.permalinkUrl,
        google_map_embed_url: null,
        latitude: null,
        longitude: null,
        location_text: null,
        facebook_post_id: null,
        youtube_video_id: video.id,
        source: "youtube_auto",
        created_at: video.publishedAt,
      };
    });

    const { error: insertError } = await supabaseAdmin.from("reviews").insert(rows);
    if (insertError) {
      throw new Error(`Failed to insert YouTube videos into Supabase: ${insertError.message}`);
    }

    return NextResponse.json({
      channelId,
      fetched: videos.length,
      inserted: rows.length,
      skipped: videos.length - rows.length,
      insertedTitles: rows.map((row) => row.title),
      note: "ตรวจหมวดหมู่และพิกัดของคลิปใหม่ในหน้าแอดมินก่อนนำไปใช้เป็นข้อมูลสถานที่โดยละเอียด",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-youtube]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
