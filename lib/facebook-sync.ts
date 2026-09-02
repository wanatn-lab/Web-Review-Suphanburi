import "server-only";

// lib/facebook-sync.ts
// Pure functions used by app/api/sync-facebook/route.ts:
//  1. fetch the latest video clips from a Facebook Page via the Graph API
//  2. guess a category from the caption text
//  3. turn the raw caption into a title + an SEO/GEO-keyword-injected description
// Split out from route.ts so the "auto-generated SEO" logic can be tested and
// tweaked in one place, without touching the route handler's auth/upsert code.

export interface FacebookVideo {
  id: string;
  description: string | null;
  permalink_url: string;
  created_time: string;
  /** clip thumbnail URL -- the Graph API returns this field as a plain string */
  picture: string | null;
}

interface FacebookAttachment {
  type?: string;
  url?: string;
  media?: {
    type?: string;
    image?: { src?: string; uri?: string };
    source?: string;
  };
  subattachments?: { data?: FacebookAttachment[] };
}

interface FacebookPost {
  id?: string;
  message?: string;
  permalink_url?: string;
  created_time?: string;
  attachments?: { data?: FacebookAttachment[] };
}

interface FacebookPostsResponse {
  data?: FacebookPost[];
  /** Facebook attaches paging.next when older posts remain -- followed when
   *  the first page doesn't yield enough videos to satisfy `limit` (e.g. the
   *  page mixes in a lot of photo posts) */
  paging?: { next?: string };
  error?: { message: string; type: string; code: number };
}

const GRAPH_API_VERSION = "v26.0";
const POST_FIELDS =
  "id,message,permalink_url,created_time,attachments{media,type,url,subattachments{media,type,url}}";

/** cap on how many pages a single fetchPageVideos call will follow -- avoids
 *  an unbounded loop against the Facebook API if a page has dozens of
 *  photo/text posts in a row with no videos at all (in that extreme case
 *  we accept getting fewer videos than `limit` rather than never stopping) */
const MAX_PAGES = 5;

function isVideoAttachment(attachment: FacebookAttachment): boolean {
  return attachment.type?.toLowerCase().startsWith("video") || attachment.media?.type?.toLowerCase() === "video";
}

function findVideoAttachment(attachments: FacebookAttachment[] | undefined): FacebookAttachment | undefined {
  for (const attachment of attachments ?? []) {
    if (isVideoAttachment(attachment)) return attachment;
    const nested = findVideoAttachment(attachment.subattachments?.data);
    if (nested) return nested;
  }
  return undefined;
}

function thumbnailFromAttachment(attachment: FacebookAttachment): string | null {
  return attachment.media?.image?.src ?? attachment.media?.image?.uri ?? null;
}

/**
 * Fetches the page's posts and keeps only the ones with a video attached --
 * if the first page (of `limit` posts) doesn't filter down to `limit` videos
 * (e.g. the page has photo/text posts mixed in), automatically follows the
 * next page (via Facebook's `paging.next`) until `limit` videos are
 * collected, there are no more pages, or MAX_PAGES is hit -- whichever comes
 * first.
 */
export async function fetchPageVideos(
  pageId: string,
  accessToken: string,
  limit = 10
): Promise<FacebookVideo[]> {
  const firstUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/posts`);
  firstUrl.searchParams.set("fields", POST_FIELDS);
  firstUrl.searchParams.set("limit", String(limit));
  firstUrl.searchParams.set("access_token", accessToken);

  const videos: FacebookVideo[] = [];
  let nextUrl: string | undefined = firstUrl.toString();
  let pagesFetched = 0;

  while (nextUrl && videos.length < limit && pagesFetched < MAX_PAGES) {
    const res = await fetch(nextUrl, { cache: "no-store" });
    const json = (await res.json()) as FacebookPostsResponse;
    pagesFetched++;

    if (!res.ok || json.error) {
      throw new Error(
        `Facebook Graph API error: ${json.error?.message ?? res.statusText} (code: ${json.error?.code ?? res.status})`
      );
    }

    for (const post of json.data ?? []) {
      if (!post.id || !post.created_time) continue;
      const attachment = findVideoAttachment(post.attachments?.data);
      if (!attachment) continue;

      videos.push({
        id: post.id,
        description: post.message ?? null,
        permalink_url: post.permalink_url ?? attachment.url ?? "",
        created_time: post.created_time,
        picture: thumbnailFromAttachment(attachment),
      });

      if (videos.length >= limit) break;
    }

    nextUrl = json.paging?.next;
  }

  return videos;
}

// keywords used to guess a category from the caption -- checked in order
// from most specific to least (check "market"/"stay"/"cafe" before the
// broad "trip" keywords, which collide with them often)
const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  { category: "market", keywords: ["ตลาด", "market"] },
  { category: "stay", keywords: ["ที่พัก", "รีสอร์ท", "resort", "โรงแรม", "hotel", "โฮมสเตย์", "homestay"] },
  { category: "cafe", keywords: ["คาเฟ่", "cafe", "coffee", "กาแฟ", "ลาเต้", "เบเกอรี่", "bakery"] },
  {
    category: "trip",
    keywords: ["ที่เที่ยว", "เที่ยว", "วัด", "น้ำตก", "แหล่งท่องเที่ยว", "จุดเช็คอิน", "จุดถ่ายรูป"],
  },
];

/** guesses a category from the caption -- falls back to "food" if nothing matches */
export function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return category;
    }
  }
  return "food";
}

/** strips all hashtags (#word) and collapses newlines/repeated whitespace to a single space */
function stripHashtagsAndCollapse(text: string): string {
  return text
    .replace(/#\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** builds a title from the caption's first line (truncated to 70 chars) */
export function buildTitleFromCaption(description: string | null, postId: string): string {
  const cleaned = description ? stripHashtagsAndCollapse(description) : "";
  if (!cleaned) return `คลิปรีวิวสุพรรณบุรี #${postId}`;

  const truncated = cleaned.length > 70 ? `${cleaned.slice(0, 67)}...` : cleaned;
  return truncated;
}

/** builds an SEO/GEO description: the cleaned caption + the site's standard keyword suffix */
export function buildSeoDescription(description: string | null): string {
  const cleaned = description ? stripHashtagsAndCollapse(description) : "";
  const base = cleaned || "คลิปรีวิวจากเพจ Facebook รีวิวสุพรรณบุรี อัปเดตล่าสุดพร้อมพิกัดร้าน";
  return `${base} | ร้านอาหารสุพรรณบุรี, ที่เที่ยวสุพรรณบุรี, รีวิวสุพรรณบุรี`;
}

/** builds a slug guaranteed not to collide, from the Facebook post id (Thai
 *  text doesn't convert into a nice URL slug directly, so the id is used
 *  instead -- the title/SEO title column already keeps the full Thai text) */
export function buildSlugFromPostId(postId: string): string {
  return `fb-${postId}`;
}
