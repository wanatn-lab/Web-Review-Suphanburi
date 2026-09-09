import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { syncYouTubeImports } from "@/lib/youtube-import-sync";

export const dynamic = "force-dynamic";

/**
 * Pulls public Shorts candidates into a private moderation queue. Nothing from
 * this route is public until an authenticated editor presses "publish" in the
 * admin page. Vercel Cron sends CRON_SECRET as an Authorization header.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await syncYouTubeImports());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-youtube]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
