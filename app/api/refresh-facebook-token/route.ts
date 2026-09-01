import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isCronAuthorized } from "@/lib/cron-auth";
import { exchangeForLongLivedToken, getActiveToken, needsRefresh, saveToken } from "@/lib/facebook-token";

// app/api/refresh-facebook-token/route.ts
// Route Handler that automatically renews the Facebook Page Access Token
// before it expires -- Facebook long-lived tokens only last ~60 days. Without
// this route, someone has to manually click "Generate Access Token" again in
// Graph API Explorer every 60 days.
//
// Called by Vercel Cron every week (see vercel.json), but only actually
// exchanges for a new token when the current one is close to expiring
// (within REFRESH_THRESHOLD_DAYS days) -- avoids hitting the Facebook API
// unnecessarily every single week.
//
// Requires an Authorization header matching CRON_SECRET (same secret as
// /api/sync-facebook -- no need for a separate one).
//
// Requires FB_APP_ID and FB_APP_SECRET in addition to the existing vars (see
// Facebook Developer Dashboard > "Suphan Review Sync" app > Settings > Basic
// -- viewing the App Secret requires re-entering the Facebook password).

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pageId = process.env.FB_PAGE_ID;
  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const envFallbackToken = process.env.FB_PAGE_ACCESS_TOKEN;

  if (!pageId || !appId || !appSecret) {
    return NextResponse.json(
      { error: "Missing FB_PAGE_ID, FB_APP_ID or FB_APP_SECRET environment variable" },
      { status: 500 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const current = await getActiveToken(supabaseAdmin, pageId, envFallbackToken);

    if (!current) {
      return NextResponse.json(
        {
          error:
            "No token to refresh at all -- request a Page Access Token via Graph API Explorer at least once first, then set it as FB_PAGE_ACCESS_TOKEN in Vercel",
        },
        { status: 500 }
      );
    }

    if (!needsRefresh(current.expiresAt)) {
      return NextResponse.json({
        refreshed: false,
        message: "Current token is not close to expiring yet -- skipping this run",
        expiresAt: current.expiresAt.toISOString(),
      });
    }

    const next = await exchangeForLongLivedToken(current.accessToken, appId, appSecret);
    await saveToken(supabaseAdmin, pageId, next.accessToken, next.expiresAt);

    return NextResponse.json({
      refreshed: true,
      message: "Facebook Page Access Token refreshed successfully",
      expiresAt: next.expiresAt.toISOString(),
    });
  } catch (error) {
    // Logs the full error to Vercel Logs -- a request that returns 500 shows
    // up as a "failed invocation" in Vercel's Cron Jobs tab immediately (a
    // basic form of alerting; a Slack/LINE/Email notification would need a
    // separate webhook integration on top of this later).
    console.error("[refresh-facebook-token] refresh failed:", error);
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: `Token refresh failed: ${message}` }, { status: 500 });
  }
}

