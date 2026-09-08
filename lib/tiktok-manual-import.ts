import "server-only";

import { buildTitleFromCaption, guessCategory } from "@/lib/facebook-sync";
import { extractLocationFromCaption } from "@/lib/geocoding";
import type { ManualContentCategory } from "@/lib/manual-content";

const TIKTOK_OEMBED_ENDPOINT = "https://www.tiktok.com/oembed";
const TIKTOK_HOST_SUFFIX = ".tiktok.com";

interface TikTokOEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

export interface TikTokImportDraft {
  category: ManualContentCategory;
  placeName: string;
  reviewContent: string;
  referenceUrl: string;
  imageUrl: string;
  address: string;
  notice: string;
}

function isTikTokUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || (hostname !== "tiktok.com" && !hostname.endsWith(TIKTOK_HOST_SUFFIX))) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function cleanText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, 6_000);
}

function validHttpsUrl(value: string | undefined): string {
  if (!value) return "";

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/**
 * Fallback for when TikTok's oEmbed endpoint returns an empty/short `title`
 * (this has become common -- oEmbed no longer reliably echoes the full
 * caption for many videos). Scrapes the public video page's own embedded
 * JSON (the same data TikTok's web app hydrates from) for the real
 * description. Returns null on any failure so the caller can fall back to
 * the oEmbed-only error message instead of throwing a confusing one.
 */
async function fetchCaptionFromVideoPage(sourceUrl: URL): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: "text/html",
        // TikTok's server-rendered HTML (with the hydration JSON below) is
        // only served to requests that look like a browser; without a UA it
        // falls back to a near-empty shell.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    if (!response.ok) return null;

    const html = await response.text();
    const match = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (!match) return null;

    const data = JSON.parse(match[1]) as {
      __DEFAULT_SCOPE__?: { "webapp.video-detail"?: { itemInfo?: { itemStruct?: { desc?: string } } } };
};
    const desc = data.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct?.desc;
    return desc ? cleanText(desc) : null;
} catch (error) {
    console.warn(
      "[tiktok-manual-import] Video-page caption fallback failed:",
      error instanceof Error ? error.message : error
    );
    return null;
}
}

/** Gets an editable draft from TikTok's public oEmbed metadata, falling back
 *  to scraping the video page itself when oEmbed doesn't return a caption
 *  (increasingly common -- oEmbed's `title` field often comes back empty). */
export async function importTikTokPostDraft(rawUrl: string): Promise<TikTokImportDraft> {
  const sourceUrl = isTikTokUrl(rawUrl);
  if (!sourceUrl) {
    throw new Error("ใช้ลิงก์ TikTok แบบ https://www.tiktok.com/... หรือ https://vm.tiktok.com/... เท่านั้น");
  }

  const oembedUrl = new URL(TIKTOK_OEMBED_ENDPOINT);
  oembedUrl.searchParams.set("url", sourceUrl.toString());

  let response: Response;
  try {
    response = await fetch(oembedUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error("เชื่อมต่อ TikTok ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }

  const payload = (await response.json().catch(() => null)) as TikTokOEmbedResponse | null;
  if (!response.ok || !payload) {
    throw new Error("TikTok ไม่คืนข้อมูลของลิงก์นี้ อาจเป็นวิดีโอส่วนตัว ถูกลบ หรือจำกัดการเข้าถึง");
  }

let caption = cleanText(payload.title);
  if (!caption) {
      caption = cleanText((await fetchCaptionFromVideoPage(sourceUrl)) ?? "");
  }
  if (!caption) {
      throw new Error("TikTok ไม่คืนข้อความสำหรับวิดีโอนี้ กรุณาวางแคปชั่นด้วยตัวเอง");
  }
  
  const category = guessCategory(caption) === "trip" ? "attraction" : "restaurant";
  const location = extractLocationFromCaption(caption) ?? "สุพรรณบุรี";
  const id = sourceUrl.pathname.split("/").filter(Boolean).at(-1) ?? "tiktok";

  return {
    category,
    placeName: buildTitleFromCaption(caption, id),
    reviewContent: caption,
    referenceUrl: sourceUrl.toString(),
    imageUrl: validHttpsUrl(payload.thumbnail_url),
    address: location,
    notice: `ดึงข้อความ${payload.author_name ? `และรูปหน้าปกจาก TikTok ของ ${payload.author_name}` : "และรูปหน้าปกจาก TikTok"} แล้ว กรุณาตรวจแก้ก่อนเผยแพร่`,
  };
}
