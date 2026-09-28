import { getAllReviews } from "@/lib/supabase";
import { buildVideoSitemap } from "@/lib/video-metadata";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(buildVideoSitemap(await getAllReviews(undefined, { failOnError: true })), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
