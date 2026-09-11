import "server-only";

import { buildTitleFromCaption, fetchPageVideos, guessCategory, type FacebookVideo } from "@/lib/facebook-sync";
import { extractLocationFromCaption } from "@/lib/geocoding";
import type { ManualContentCategory } from "@/lib/manual-content";
import { downloadMediaBytes, transcribeAudio } from "@/lib/audio-transcription";

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
  /** true when lib/audio-transcription.ts successfully transcribed the
   *  clip's narration and it was folded into reviewContent below. */
  transcribed: boolean;
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

/**
 * Best-effort: asks the Graph API for this video's direct, downloadable file
 * URL (the `source` field on a Video node), then downloads it and transcribes
 * the narration via lib/audio-transcription.ts. Returns null on any failure
 * -- a missing permission, an id that isn't a Video node, a download error,
 * or Cloudflare credentials not being configured yet -- so the caller always
 * has a safe path back to caption-only content.
 *
 * NEEDS LIVE VERIFICATION: this project's own comments elsewhere (see
 * findVideoFromPageFeed below) note that Facebook Reels/videos don't always
 * resolve at the same id used for the surrounding post -- so this may need
 * to target a different id once a real FB_PAGE_ACCESS_TOKEN is available to
 * test against. Until then this fails closed (returns null) rather than
 * guessing, which only costs a missing transcript, never a broken import.
 */
async function tryTranscribeFacebookVideo(videoId: string, accessToken: string): Promise<string | null> {
  try {
    const sourceUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${videoId}`);
    sourceUrl.searchParams.set("fields", "source");
    sourceUrl.searchParams.set("access_token", accessToken);

    const response = await fetch(sourceUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const payload = (await response.json().catch(() => null)) as { source?: string; error?: unknown } | null;
    if (!response.ok || !payload?.source) return null;

    const mediaBytes = await downloadMediaBytes(payload.source);
    if (!mediaBytes) return null;

    return await transcribeAudio(mediaBytes);
  } catch (error) {
    console.error(
      "[facebook-manual-import] tryTranscribeFacebookVideo failed:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/** Combines the caption with a transcript (when one was produced) into a
 *  single editable field, clearly separated so the human editor can tell
 *  which part came from where before publishing. */
function combineCaptionAndTranscript(caption: string, transcript: string | null): string {
  if (!transcript) {
    return caption || "ยังไม่มีคำบรรยายจากโพสต์นี้ กรุณาเติมรายละเอียดก่อนเผยแพร่";
  }
  const captionPart = caption || "(โพสต์นี้ไม่มีแคปชั่น)";
  return `${captionPart}\n\n[ถอดเสียงจากคลิปอัตโนมัติ]\n${transcript}`;
}

async function draftFromFacebookData({
  caption,
  id,
  permalinkUrl,
  imageUrl,
  createdTime,
  accessToken,
}: {
  caption: string;
  id: string;
  permalinkUrl: string;
  imageUrl: string | null;
  createdTime: string;
  accessToken: string;
}): Promise<FacebookImportDraft> {
  const category = guessCategory(caption) === "trip" ? "attraction" : "restaurant";
  const location = extractLocationFromCaption(caption) ?? "สุพรรณบุรี";
  const transcript = await tryTranscribeFacebookVideo(id, accessToken);

  return {
    category,
    placeName: buildTitleFromCaption(caption, id),
    reviewContent: combineCaptionAndTranscript(caption, transcript),
    referenceUrl: permalinkUrl,
    imageUrl: imageUrl ?? "",
    address: location,
    importedAt: createdTime,
    transcribed: transcript !== null,
    notice: transcript
      ? "ดึงคำบรรยายและถอดเสียงจากคลิปแล้ว กรุณาตรวจเนื้อหา จากนั้นกดบันทึกเพื่อสร้างคำโปรย SEO ก่อนเผยแพร่"
      : "ดึงคำบรรยายและรูปหน้าปกจากโพสต์ Facebook แล้ว ระบบถอดเสียงคลิปไม่สำเร็จ (ยังไม่ได้ตั้งค่า Cloudflare หรือดึงไฟล์วิดีโอไม่ได้) กรุณาตรวจแก้ก่อนเผยแพร่",
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
        accessToken,
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
    accessToken,
  });
}
