import "server-only";

import { buildTitleFromCaption, guessCategory } from "@/lib/facebook-sync";
import { extractLocationFromCaption } from "@/lib/geocoding";
import type { ManualContentCategory } from "@/lib/manual-content";

const ALLOWED_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]);
const VIDEO_PATH = /\/video\/(\d{10,25})\/?$/;
const MAX_PAGE_BYTES = 2_000_000;

export interface TikTokImportDraft {
  category: ManualContentCategory;
  placeName: string;
  reviewContent: string;
  referenceUrl: string;
  imageUrl: string;
  address: string;
  notice: string;
}

function tikTokUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("กรุณาใช้ลิงก์วิดีโอ TikTok แบบ https://www.tiktok.com/... หรือ https://vm.tiktok.com/..."); }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname) || url.username || url.password || url.port) {
    throw new Error("กรุณาใช้ลิงก์วิดีโอจาก TikTok แบบ HTTPS เท่านั้น");
  }
  url.hash = "";
  return url;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 6_000) : "";
}

function httpsUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : "";
  } catch { return ""; }
}

async function readPage(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_PAGE_BYTES) { await reader.cancel(); return ""; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}

// Validate every hop before following a short-link redirect.
async function fetchVideoPage(source: URL, signal: AbortSignal): Promise<{ url: URL; html: string }> {
  let url = source;
  for (let hop = 0; hop < 6; hop++) {
    const response = await fetch(url, {
      cache: "no-store", redirect: "manual", signal,
      headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("TikTok ไม่คืนลิงก์ปลายทาง กรุณาใช้ลิงก์เต็มของวิดีโอ");
      url = tikTokUrl(new URL(location, url).toString());
      continue;
    }
    return { url, html: response.ok ? await readPage(response) : "" };
  }
  throw new Error("ลิงก์ TikTok เปลี่ยนเส้นทางมากเกินไป กรุณาใช้ลิงก์เต็มของวิดีโอ");
}

function pageMetadata(html: string, videoId: string): { caption: string; image: string } {
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const id = script[1].match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
    if (id !== "__UNIVERSAL_DATA_FOR_REHYDRATION__" && id !== "SIGI_STATE") continue;
    try {
      const data = JSON.parse(script[2]);
      const item = id === "SIGI_STATE"
        ? data.ItemModule?.[videoId]
        : data.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;
      if (!item || (item.id && String(item.id) !== videoId)) continue;
      const caption = text(item.desc);
      const image = httpsUrl(item.video?.originCover) || httpsUrl(item.video?.cover);
      if (caption || image) return { caption, image };
    } catch { /* Try the other supported hydration format. */ }
  }
  return { caption: "", image: "" };
}

// Display API reads only videos belonging to the account that authorized
// video.list. This is the supported path when public metadata is blocked.
async function accountMetadata(videoId: string, signal: AbortSignal) {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) return null;
  const response = await fetch("https://open.tiktokapis.com/v2/video/query/?fields=id,title,video_description,cover_image_url", {
    method: "POST", cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ filters: { video_ids: [videoId] } }),
  });
  const payload = await response.json();
  if (!response.ok || payload?.error?.code !== "ok") return null;
  const item = Array.isArray(payload?.data?.videos) ? payload.data.videos.find((video: { id?: unknown }) => video.id === videoId) : undefined;
  return item ? { caption: text(item.video_description) || text(item.title), image: httpsUrl(item.cover_image_url) } : null;
}

export async function importTikTokPostDraft(rawUrl: string): Promise<TikTokImportDraft> {
  let source = tikTokUrl(rawUrl);
  const signal = AbortSignal.timeout(20_000);
  let page: { url: URL; html: string } | undefined;
  if (!VIDEO_PATH.test(source.pathname)) {
    try { page = await fetchVideoPage(source, signal); }
    catch { throw new Error("เปิดลิงก์สั้น TikTok ไม่สำเร็จ กรุณาใช้ลิงก์เต็มที่มี /video/ จากหน้าวิดีโอ"); }
    source = page.url;
  }
  const videoId = source.pathname.match(VIDEO_PATH)?.[1];
  if (!videoId) throw new Error("ลิงก์นี้ไม่ใช่หน้าวิดีโอ หรือ TikTok ไม่เปิดลิงก์สั้นให้ระบบ กรุณาคัดลอกลิงก์เต็มที่มี /video/ จากหน้าวิดีโอ");
  source.search = "";
  const endpoint = new URL("https://www.tiktok.com/oembed");
  endpoint.searchParams.set("url", source.toString());
  let caption = "";
  let image = "";
  try {
    const account = await accountMetadata(videoId, signal);
    caption = account?.caption || "";
    image = account?.image || "";
  } catch { /* Public metadata can still be used if the account token fails. */ }
  if (!caption || !image) try {
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]), headers: { Accept: "application/json" } });
    if (response.ok) {
      const payload = await response.json();
      caption ||= text(payload?.title);
      image ||= httpsUrl(payload?.thumbnail_url);
    }
  } catch { /* Try the public page even when oEmbed fails. */ }
  if (!caption || !image) {
    try {
      page ??= await fetchVideoPage(source, signal);
      const fallback = pageMetadata(page.html, videoId);
      caption ||= fallback.caption;
      image ||= fallback.image;
    } catch { /* Keep usable partial metadata. */ }
  }
  if (!caption && !image) {
    const blocked = /SlardarWAF|_wafchallenge|captcha/i.test(page?.html || "");
    throw new Error(blocked
      ? "TikTok ปิดกั้นการอ่านข้อมูลอัตโนมัติของลิงก์นี้ กรุณาวางแคปชั่นและรูปเองด้านล่าง การดึงคลิปของบัญชีเราอัตโนมัติต้องเชื่อมบัญชี TikTok ก่อน"
      : "TikTok ไม่คืนข้อความหรือรูปของวิดีโอนี้ให้ระบบ กรุณาลองใหม่ หรือวางแคปชั่นและรูปเองในฟอร์มด้านล่าง");
  }
  const missing = [!caption && "แคปชั่น", !image && "รูปหน้าปก"].filter(Boolean).join("และ");
  return {
    category: guessCategory(caption) === "trip" ? "attraction" : "restaurant",
    placeName: caption ? buildTitleFromCaption(caption, videoId) : "",
    reviewContent: caption,
    referenceUrl: source.toString(),
    imageUrl: image,
    address: caption ? extractLocationFromCaption(caption) ?? "" : "",
    notice: missing
      ? `ดึงข้อมูลได้บางส่วน ยังขาด${missing} กรุณาเติมและตรวจแก้ก่อนเผยแพร่`
      : "ดึงข้อความและรูปหน้าปกจาก TikTok แล้ว กรุณาตรวจชื่อสถานที่ หมวดหมู่ และที่อยู่ก่อนเผยแพร่",
  };
}
