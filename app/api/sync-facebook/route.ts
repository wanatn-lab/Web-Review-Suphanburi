import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  buildSeoDescription,
  buildSlugFromPostId,
  buildTitleFromCaption,
  fetchPageVideos,
  guessCategory,
} from "@/lib/facebook-sync";
import { geocodeFromCaption, isGeocodingEnabled } from "@/lib/geocoding";
import { isCronAuthorized } from "@/lib/cron-auth";
import { getActiveToken } from "@/lib/facebook-token";

// app/api/sync-facebook/route.ts
// Route Handler that pulls the latest video clips from the "reviewsuphanburi"
// Facebook Page and upserts them into the Supabase `reviews` table
// automatically, guessing a category and writing an SEO-keyword-injected
// description along the way.
//
// Called via a Vercel Cron Job (see vercel.json) -- Vercel attaches an
//     "Authorization: Bearer ***" header automatically on every scheduled hit.
// Only requests with an Authorization header matching CRON_SECRET are
// accepted.
//
// Designed to "only insert posts that were never pulled before" (checked via
// facebook_post_id) and never touches a row that was already pulled, even if
// the source caption changes later -- this stops the sync from overwriting a
// title/category the marketing team edited by hand afterwards.

export const dynamic = "force-dynamic"; // never cache this route's response

/** delay between each Geocoding call -- avoids hitting Google Maps API rate limits */
const GEOCODE_DELAY_MS = 200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** row shape to insert into the reviews table -- typed explicitly so the
 *  coordinates can be filled in later (letting TS infer the type from an
 *  object literal with latitude: null would lock the field's type to null) */
interface ReviewInsertRow {
  title: string;
  slug: string;
  description: string;
  category: string;
  cover_image: string | null;
  facebook_embed_url: string;
  tiktok_embed_url: string | null;
  google_map_embed_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_text: string | null;
  facebook_post_id: string;
  created_at: string;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pageId = process.env.FB_PAGE_ID;

  if (!pageId) {
    return NextResponse.json({ error: "Missing FB_PAGE_ID environment variable" }, { status: 500 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 0) Read the access token that is actually active right now -- always
    // from the `facebook_tokens` Supabase table first (kept current by
    // /api/refresh-facebook-token). Falls back to the FB_PAGE_ACCESS_TOKEN
    // Vercel env var if that table has never been refreshed yet -- see
    // lib/facebook-token.ts
    const activeToken = await getActiveToken(supabaseAdmin, pageId, process.env.FB_PAGE_ACCESS_TOKEN);

    if (!activeToken) {
      return NextResponse.json(
        { error: "Missing FB_PAGE_ACCESS_TOKEN environment variable and no token stored in Supabase" },
        { status: 500 }
      );
    }

    const accessToken = activeToken.accessToken;

    // 1) Fetch the latest 10 clips from the Facebook Page
    const videos = await fetchPageVideos(pageId, accessToken, 10);

    if (videos.length === 0) {
      return NextResponse.json({ fetched: 0, inserted: 0, skipped: 0, message: "No videos found on the page" });
    }

    // 2) Check which post ids have already been pulled before (dedup + avoid
    // overwriting anything already manually edited)
    const postIds = videos.map((v) => v.id);
    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("reviews")
      .select("facebook_post_id")
      .in("facebook_post_id", postIds);

    if (existingError) {
      throw new Error(`Failed to check existing posts: ${existingError.message}`);
    }

    const existingIds = new Set((existingRows ?? []).map((r) => r.facebook_post_id));
    const newVideos = videos.filter((v) => !existingIds.has(v.id));

    if (newVideos.length === 0) {
      return NextResponse.json({
        fetched: videos.length,
        inserted: 0,
        skipped: videos.length,
        message: "No new clips -- every clip has already been pulled in before",
      });
    }

    // 3) Map to reviews table rows, guessing category + writing an
    // auto-generated SEO description along the way
    const rows: ReviewInsertRow[] = newVideos.map((video) => {
      const caption = video.description ?? "";
      return {
        title: buildTitleFromCaption(video.description, video.id),
        slug: buildSlugFromPostId(video.id),
        description: buildSeoDescription(video.description),
        category: guessCategory(caption),
        cover_image: video.picture,
        facebook_embed_url: video.permalink_url,
        tiktok_embed_url: null,
        google_map_embed_url: null,
        latitude: null,
        longitude: null,
        location_text: null,
        facebook_post_id: video.id,
        created_at: video.created_time,
      };
    });

    // 4) Fill in coordinates automatically from the caption (Geocoding) --
    // strictly best effort. If GEOCODING_API_KEY isn't set, skip this whole
    // block (no point paying the 200ms delay for nothing). If a specific one
    // fails to geocode, just leave latitude/longitude as null -- the sync
    // must never fail because of a coordinate lookup.
    let geocodedCount = 0;

    if (isGeocodingEnabled()) {
      for (let i = 0; i < rows.length; i++) {
        // only delay *between* calls, not before the first or after the last
        if (i > 0) await sleep(GEOCODE_DELAY_MS);

        const geo = await geocodeFromCaption(newVideos[i].description);
        if (!geo) continue;

        rows[i].latitude = geo.lat;
        rows[i].longitude = geo.lng;
        rows[i].location_text = geo.locationText;
        geocodedCount++;
      }
    }

    const { error: insertError } = await supabaseAdmin.from("reviews").insert(rows);

    if (insertError) {
      throw new Error(`Failed to insert into Supabase: ${insertError.message}`);
    }

    return NextResponse.json({
      fetched: videos.length,
      inserted: rows.length,
      skipped: videos.length - rows.length,
      insertedTitles: rows.map((r) => r.title),
      geocodedCount,
      note: !isGeocodingEnabled()
        ? "New reviews still have no coordinates (latitude/longitude) or location_text -- add them manually in the Supabase table for Google Maps + Geo-SEO to work fully (or set GEOCODING_API_KEY for the system to fill them in automatically)"
        : `Auto-geocoded ${geocodedCount}/${rows.length} rows -- any remaining ones need latitude/longitude added manually in the Supabase table | Note: Geocoding coordinates are at district/province level, not the actual storefront -- can be corrected later`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync-facebook]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
