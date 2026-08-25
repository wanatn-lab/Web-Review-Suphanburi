import "server-only";

// lib/facebook-sync.ts
// ฟังก์ชันล้วน (pure functions) ที่ใช้โดย app/api/sync-facebook/route.ts:
//  1. ดึงคลิปวิดีโอล่าสุดจาก Facebook Page ผ่าน Graph API
//  2. เดาหมวดหมู่ (category) จากข้อความแคปชั่น
//  3. แปลงแคปชั่นดิบให้เป็นชื่อเรื่อง + คำอธิบายที่ฉีด keyword SEO/GEO เข้าไป
// แยกออกมาจาก route.ts เพื่อให้ทดสอบ/แก้ไข logic การ "เขียน SEO อัตโนมัติ"
// ได้ง่ายๆ ในที่เดียว โดยไม่ต้องแตะเรื่อง auth/upsert ของ route handler

export interface FacebookVideo {
  id: string;
  description: string | null;
  permalink_url: string;
  created_time: string;
  /** thumbnail URL ของคลิป — Graph API คืนเป็น string ตรงๆ สำหรับ field นี้ */
  picture: string | null;
}

interface FacebookVideosResponse {
  data: FacebookVideo[];
  error?: { message: string; type: string; code: number };
}

const GRAPH_API_VERSION = "v19.0";

/** ดึงคลิปวิดีโอล่าสุด `limit` รายการจาก Facebook Page */
export async function fetchPageVideos(
  pageId: string,
  accessToken: string,
  limit = 10
): Promise<FacebookVideo[]> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/videos`);
  url.searchParams.set("fields", "id,description,permalink_url,created_time,picture");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as FacebookVideosResponse;

  if (!res.ok || json.error) {
    throw new Error(
      `Facebook Graph API error: ${json.error?.message ?? res.statusText} (code: ${json.error?.code ?? res.status})`
    );
  }

  return json.data ?? [];
}

// คำสำคัญไว้เดาหมวดหมู่จากแคปชั่น — เรียงลำดับตรวจก่อน-หลังตามความเจาะจง
// (เช็ค "ตลาด"/"ที่พัก"/"คาเฟ่" ก่อน เพราะเจาะจงกว่า "เที่ยว" ที่กว้างและชนกันบ่อย)
const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  { category: "market", keywords: ["ตลาด", "market"] },
  { category: "stay", keywords: ["ที่พัก", "รีสอร์ท", "resort", "โรงแรม", "hotel", "โฮมสเตย์", "homestay"] },
  { category: "cafe", keywords: ["คาเฟ่", "cafe", "coffee", "กาแฟ", "ลาเต้", "เบเกอรี่", "bakery"] },
  {
    category: "trip",
    keywords: ["ที่เที่ยว", "เที่ยว", "วัด", "น้ำตก", "แหล่งท่องเที่ยว", "จุดเช็คอิน", "จุดถ่ายรูป"],
  },
];

/** เดาหมวดหมู่จากแคปชั่น — ถ้าไม่เจอคำที่ตรงเลย fallback เป็น "food" (ร้านอาหาร) */
export function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return category;
    }
  }
  return "food";
}

/** ตัด hashtag (#คำ) ทั้งหมด + ยุบขึ้นบรรทัดใหม่/ช่องว่างซ้ำให้เหลือช่องว่างเดียว */
function stripHashtagsAndCollapse(text: string): string {
  return text
    .replace(/#\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** สร้างชื่อเรื่องจากบรรทัดแรกของแคปชั่น (ตัดไม่เกิน 70 ตัวอักษร) */
export function buildTitleFromCaption(description: string | null, postId: string): string {
  const cleaned = description ? stripHashtagsAndCollapse(description) : "";
  if (!cleaned) return `คลิปรีวิวสุพรรณบุรี #${postId}`;

  const truncated = cleaned.length > 70 ? `${cleaned.slice(0, 67)}...` : cleaned;
  return truncated;
}

/** สร้างคำอธิบาย SEO/GEO: เนื้อหาแคปชั่นที่ทำความสะอาดแล้ว + suffix keyword มาตรฐานของเว็บ */
export function buildSeoDescription(description: string | null): string {
  const cleaned = description ? stripHashtagsAndCollapse(description) : "";
  const base = cleaned || "คลิปรีวิวจากเพจ Facebook รีวิวสุพรรณบุรี อัปเดตล่าสุดพร้อมพิกัดร้าน";
  return `${base} | ร้านอาหารสุพรรณบุรี, ที่เที่ยวสุพรรณบุรี, รีวิวสุพรรณบุรี`;
}

/** สร้าง slug ที่ไม่ชนกันแน่นอน จาก Facebook post id (ภาษาไทยแปลงเป็น URL slug ตรงๆ ได้ไม่สวย
 *  เลยใช้ id เป็นหลัก — ชื่อเรื่อง/SEO title ยังเป็นภาษาไทยเต็มอยู่แล้วในคอลัมน์ title) */
export function buildSlugFromPostId(postId: string): string {
  return `fb-${postId}`;
}
