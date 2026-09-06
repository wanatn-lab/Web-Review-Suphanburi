import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// lib/cover-image-mirror.ts
// ดาวน์โหลดภาพปกจาก CDN ชั่วคราว (TikTok/Facebook ที่มี query param หมดอายุ เช่น
// x-expires ของ TikTok) มาเก็บถาวรไว้ที่ Supabase Storage bucket "review-covers"
// แล้วคืนลิงก์ถาวรแทน — กันปัญหา "ภาพหาย" ตอนลิงก์ CDN ต้นทางหมดอายุ ซึ่งกระทบ
// ทั้งภาพปกที่โชว์บนเว็บเอง, Open Graph image ตอนแชร์ลิงก์, และ Twitter Card
//
// ออกแบบตามแนวเดียวกับ lib/geocoding.ts (geocodeLocation) — "ห้าม throw เด็ดขาด":
// ถ้าดาวน์โหลด/อัปโหลดไม่สำเร็จ (เน็ตหลุด, CDN บล็อก, บั๊กชั่วคราว, bucket ยังไม่ได้
// สร้าง) ให้ fallback กลับไปใช้ลิงก์เดิมที่ผู้ใช้กรอกไว้ แทนที่จะทำให้บันทึกรีวิว
// ไม่สำเร็จทั้งอัน

const COVER_IMAGE_BUCKET = "review-covers";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 8 * 1024 * 1024; // 8MB — ตรงกับ file_size_limit ของ bucket

const CONTENT_TYPE_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** true ถ้า URL นี้เป็นลิงก์ที่มิเรอร์ไว้ใน Supabase Storage ของเราแล้ว (จากรอบก่อนหน้า) */
function isOwnStorageUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const own = new URL(supabaseUrl);
    const target = new URL(url);
    return (
      target.hostname === own.hostname &&
      target.pathname.includes(`/storage/v1/object/public/${COVER_IMAGE_BUCKET}/`)
    );
  } catch {
    return false;
  }
}

/**
 * มิเรอร์ภาพปกจาก `sourceUrl` มาเก็บถาวรไว้ที่ Supabase Storage แล้วคืน URL ถาวร
 * ถ้ามิเรอร์ไม่ได้ (ด้วยเหตุผลใดก็ตาม) จะคืน `sourceUrl` เดิมกลับไปเสมอ — ไม่ throw
 *
 * @param sourceUrl URL ภาพต้นทาง (หรือ null ถ้าไม่มีภาพ)
 * @param slug      slug ของรีวิว ใช้เป็นชื่อไฟล์ถาวร (1 รีวิว = 1 ไฟล์ภาพปก, upsert
 *                  ทับของเดิมได้เวลาแก้ไขรีวิวแล้วเปลี่ยนภาพ)
 */
export async function mirrorCoverImage(sourceUrl: string | null, slug: string): Promise<string | null> {
  if (!sourceUrl) return sourceUrl;

  // ลิงก์ placeholder ทดสอบ หรือมิเรอร์ไว้แล้วในรอบก่อนหน้า -> ใช้ตามเดิม ไม่ต้องดึงซ้ำ
  if (sourceUrl.includes("://example.com/") || isOwnStorageUrl(sourceUrl)) {
    return sourceUrl;
  }

  try {
    const response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`[cover-image-mirror] ดาวน์โหลดภาพไม่สำเร็จ (${response.status}): ${sourceUrl}`);
      return sourceUrl;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    const extension = CONTENT_TYPE_EXTENSION[contentType];
    if (!extension) {
      console.warn(`[cover-image-mirror] ไม่รองรับชนิดไฟล์ "${contentType}": ${sourceUrl}`);
      return sourceUrl;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_BYTES) {
      console.warn(`[cover-image-mirror] ขนาดไฟล์ผิดปกติ (${arrayBuffer.byteLength} bytes): ${sourceUrl}`);
      return sourceUrl;
    }

    const path = `covers/${slug}.${extension}`;
    const supabaseAdmin = getSupabaseAdmin();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(COVER_IMAGE_BUCKET)
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (uploadError) {
      console.warn(`[cover-image-mirror] อัปโหลดขึ้น Supabase Storage ไม่สำเร็จ: ${uploadError.message}`);
      return sourceUrl;
    }

    const { data } = supabaseAdmin.storage.from(COVER_IMAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl || sourceUrl;
  } catch (error) {
    console.warn(
      `[cover-image-mirror] มิเรอร์ภาพไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`
    );
    return sourceUrl;
  }
}
