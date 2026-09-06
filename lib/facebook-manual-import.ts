import "server-only";

import { buildTitleFromCaption, fetchPageVideos, guessCategory, type FacebookVideo } from "@/lib/facebook-sync";
import { extractLocationFromCaption } from "@/lib/geocoding";
import type { ManualContentCategory } from "@/lib/manual-content";

const GRAPH_API_VERSION = "v26.0";
const GRAPH_FIELDS =
  "id,message,description,permalink_url,created_time,full_picture,attachments{media,type,url,subattachments{media,type,url}}";
const FACEBOOK_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"]);

interface FacebookAttachment {
  media?: { image?: { src?: string; uri?: string } };
  subattachments?: { data?: FacebookAttachment[] };
}

interface FacebookGraphObject {
  id?: string;
  message?: string;
  description?: string;
  permalink_url?: string;
  created_time?: string;
  full_picture?: string;
  attachments?: { data?: FacebookAttachment[] };
  error?: { message?: string; code?: number };
}

export interface FacebookImportDraft {
  category: ManualContentCategory;
  placeName: string;
  reviewContent: string;
  referenceUrl: string;
  imageUrl: string;
  address: string;
  importedAt: string;
  notice: string;
}

function isFacebookUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !FACEBOOK_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url;
  } catch {
    return null;
  }
}

/** Direct post, Reel, video and permalink URLs are supported. */
function extractFacebookObjectId(url: URL): string | null {
  const storyId = url.searchParams.get("story_fbid");
  const pageId = url.searchParams.get("id");
  if (storyId && pageId) return `${pageId}_${storyId}`;

  const parts = url.pathname.split("/").filter(Boolean);
  const directType = parts.findIndex((part) => ["reel", "videos", "posts"].includes(part.toLowerCase()));
  if (directType >= 0) {
    const candidate = parts[directType + 1];
    if (candidate && /^\d{6,}$/.test(candidate)) return candidate;
  }

  return parts.find((part) => /^\d{6,}$/.test(part)) ?? null;
}

function findAttachmentImage(attachments: FacebookAttachment[] | undefined): string | null {
  for (const attachment of attachments ?? []) {
    const image = attachment.media?.image?.src ?? attachment.media?.image?.uri;
    if (image) return image;

    const nested = findAttachmentImage(attachment.subattachments?.data);
    if (nested) return nested;
  }

  return null;
}

function trimCaption(caption: string): string {
  return caption.replace(/\s+/g, " ").trim();
}

function draftFromFacebookData({
  caption,
  id,
  permalinkUrl,
  imageUrl,
  createdTime,
}: {
  caption: string;
  id: string;
  permalinkUrl: string;
  imageUrl: string | null;
  createdTime: string;
}): FacebookImportDraft {
  const category = guessCategory(caption) === "trip" ? "attraction" : "restaurant";
  const location = extractLocationFromCaption(caption) ?? "สุพรรณบุรี";

  return {
    category,
    placeName: buildTitleFromCaption(caption, id),
    reviewContent: caption || "ยังไม่มีคำบรรยายจากโพสต์นี้ กรุณาเติมรายละเอียดก่อนเผยแพร่",
    referenceUrl: permalinkUrl,
    imageUrl: imageUrl ?? "",
    address: location,
    importedAt: createdTime,
    notice:
      "ดึงคำบรรยายและรูปหน้าปกจากโพสต์ Facebook แล้ว ระบบยังไม่ถอดเสียงหรือสรุปเนื้อหาภายในวิดีโออัตโนมัติ กรุณาตรวจแก้ก่อนเผยแพร่",
  };
}

async function findVideoFromPageFeed(
  pageId: string,
  accessToken: string,
  requestedId: string
): Promise<FacebookVideo | null> {
  try {
    const recentVideos = await fetchPageVideos(pageId, accessToken, 50);
    return (
      recentVideos.find(
        (video) => video.id.includes(requestedId) || video.permalink_url.includes(requestedId)
      ) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Fetches public metadata for one Facebook post using a server-only Page token.
 * It never publishes; the caller receives an editable draft.
 */
export async function importFacebookPostDraft(rawUrl: string): Promise<FacebookImportDraft> {
  const url = isFacebookUrl(rawUrl);
  if (!url) {
    throw new Error("ใช้ลิงก์ Facebook แบบ https://www.facebook.com/... เท่านั้น");
  }

  const objectId = extractFacebookObjectId(url);
  if (!objectId) {
    throw new Error("รองรับลิงก์โพสต์, Reel หรือวิดีโอโดยตรงเท่านั้น กรุณาเปิด Share แล้วคัดลอกลิงก์ต้นฉบับ");
  }

  const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("ยังไม่ได้ตั้งค่า FB_PAGE_ACCESS_TOKEN ที่ใช้ดึงโพสต์นี้ได้");
  }

  const graphUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${objectId}`);
  graphUrl.searchParams.set("fields", GRAPH_FIELDS);
  graphUrl.searchParams.set("access_token", accessToken);

  let response: Response;
  try {
    response = await fetch(graphUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new Error("เชื่อมต่อ Facebook ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }

  const payload = (await response.json()) as FacebookGraphObject;
  if (!response.ok || payload.error) {
    // Facebook Reels often reject a direct object lookup even when the same
    // Page token can read the Page feed. Match only against recent Page videos
    // to avoid ever importing a different public post by mistake.
    const pageId = process.env.FB_PAGE_ID;
    const fallbackVideo = pageId ? await findVideoFromPageFeed(pageId, accessToken, objectId) : null;
    if (fallbackVideo) {
      return draftFromFacebookData({
        caption: trimCaption(fallbackVideo.description ?? ""),
        id: fallbackVideo.id,
        permalinkUrl: fallbackVideo.permalink_url || url.toString(),
        imageUrl: fallbackVideo.picture,
        createdTime: fallbackVideo.created_time,
      });
    }

    throw new Error(
      "Facebook ยังไม่อนุญาตให้ token ของเพจอ่านโพสต์หรือ Reel นี้ กรุณาต่ออายุ FB_PAGE_ACCESS_TOKEN ที่มีสิทธิ์อ่านเนื้อหาเพจ แล้วลองใหม่"
    );
  }

  return draftFromFacebookData({
    caption: trimCaption(payload.message ?? payload.description ?? ""),
    id: payload.id ?? objectId,
    permalinkUrl: payload.permalink_url ?? url.toString(),
    imageUrl: payload.full_picture ?? findAttachmentImage(payload.attachments?.data),
    createdTime: payload.created_time ?? new Date().toISOString(),
  });
}
