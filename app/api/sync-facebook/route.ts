import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  buildSeoDescription,
  buildSlugFromPostId,
  buildTitleFromCaption,
  fetchPageVideos,
  guessCategory,
} from "@/lib/facebook-sync";
import { geocodeFromCaption, isGeocodingEnabled } from "@/lib/geocoding";

// app/api/sync-facebook/route.ts
// Route Handler ที่ดึงคลิปวิดีโอล่าสุดจาก Facebook Page "รีวิวสุพรรณบุรี" มา
// upsert เข้าตาราง reviews ของ Supabase อัตโนมัติ พร้อมเดาหมวดหมู่ + เขียน
// คำอธิบายที่ฉีด keyword SEO/GEO ให้อัตโนมัติ
//
// เรียกใช้งานได้ 2 ทาง:
//  1. Vercel Cron Job (ดู vercel.json) — Vercel จะแนบ header
//     "Authorization: Bearer <CRON_SECRET>" มาให้เองอัตโนมัติทุกครั้งที่ยิงตามตาราง
//  2. เรียกเองด้วยมือ (เทส/สั่งซิงก์ทันที) — เปิดลิงก์:
//     https://<โดเมนเว็บ>/api/sync-facebook?secret=<CRON_SECRET>
//
// ตั้งใจให้ "insert เฉพาะโพสต์ใหม่ที่ยังไม่เคยดึงมา" เท่านั้น (เช็คจาก
// facebook_post_id) และจะไม่แตะแถวที่เคยดึงมาแล้ว แม้ต้นทางจะแก้แคปชั่นทีหลัง
// — ป้องกันไม่ให้ระบบไปเขียนทับ title/category ที่ทีมการตลาดแก้ไขเองในภายหลัง

export const dynamic = "force-dynamic"; // ห้าม cache response ของ route นี้เด็ดขาด

/** หน่วงระหว่างการยิง Geocoding แต่ละครั้ง — กันชน rate limit ของ Google Maps API */
const GEOCODE_DELAY_MS = 200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** แถวที่จะ insert ลงตาราง reviews — ประกาศ type ไว้ชัดๆ เพื่อให้เติมพิกัดทีหลังได้
 *  (ถ้าปล่อยให้ TS infer จาก object literal ที่มี latitude: null มันจะล็อก type เป็น null) */
interface ReviewInsertRow {
  title: string;
  slug: string;
  description: string;
  category: string;
  cover_image: string | null;
  facebook_embed_url: string;
  tiktok_embed_url: string | null;
  google_map_embed_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_text: string | null;
  facebook_post_id: string;
  created_at: string;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // ไม่ตั้งค่า secret ไว้ = ปิดไม่ให้ใครยิงได้เลย (fail safe)

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pageId = process.env.FB_PAGE_ID;
  const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return NextResponse.json(
      { error: "Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN environment variable" },
      { status: 500 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1) ดึงคลิปล่าสุด 10 รายการจาก Facebook Page
    const videos = await fetchPageVideos(pageId, accessToken, 10);

    if (videos.length === 0) {
      return NextResponse.json({ fetched: 0, inserted: 0, skipped: 0, message: "ไม่พบวิดีโอบนเพจ" });
    }

    // 2) เช็คว่า post id ไหนเคยดึงมาแล้วบ้าง (กันซ้ำ + กันเขียนทับของที่แก้ไขเองแล้ว)
    const postIds = videos.map((v) => v.id);
    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("reviews")
      .select("facebook_post_id")
      .in("facebook_post_id", postIds);

    if (existingError) {
      throw new Error(`ตรวจสอบโพสต์ที่มีอยู่แล้วไม่สำเร็จ: ${existingError.message}`);
    }

    const existingIds = new Set((existingRows ?? []).map((r) => r.facebook_post_id));
    const newVideos = videos.filter((v) => !existingIds.has(v.id));

    if (newVideos.length === 0) {
      return NextResponse.json({
        fetched: videos.length,
        inserted: 0,
        skipped: videos.length,
        message: "ไม่มีคลิปใหม่ — ทุกคลิปเคยถูกดึงเข้าระบบแล้ว",
      });
    }

    // 3) แปลงเป็นแถวสำหรับตาราง reviews พร้อมเดา category + เขียนคำอธิบาย SEO อัตโนมัติ
    const rows: ReviewInsertRow[] = newVideos.map((video) => {
      const caption = video.description ?? "";
      return {
        title: buildTitleFromCaption(video.description, video.id),
        slug: buildSlugFromPostId(video.id),
        description: buildSeoDescription(video.description),
        category: guessCategory(caption),
        cover_image: video.picture,
        facebook_embed_url: video.permalink_url,
        tiktok_embed_url: null,
        google_map_embed_url: null,
        latitude: null,
        longitude: null,
        location_text: null,
        facebook_post_id: video.id,
        created_at: video.created_time,
      };
    });

    // 4) เติมพิกัดอัตโนมัติจากแคปชั่น (Geocoding) — best effort ล้วนๆ
    // ถ้าไม่ได้ตั้ง GEOCODING_API_KEY ก็ข้ามทั้งก้อนไปเลย (ไม่เสียเวลาหน่วง 200ms ฟรีๆ)
    // และถ้าตัวไหน geocode ไม่ผ่าน ก็ปล่อยให้ latitude/longitude เป็น null ตามเดิม
    // — การซิงก์ต้อง "ไม่พังเด็ดขาด" เพราะเรื่องพิกัด
    let geocodedCount = 0;

    if (isGeocodingEnabled()) {
      for (let i = 0; i < rows.length; i++) {
        // หน่วงเฉพาะ "ระหว่าง" การยิงแต่ละครั้ง ไม่หน่วงก่อนตัวแรก/หลังตัวสุดท้าย
        if (i > 0) await sleep(GEOCODE_DELAY_MS);

        const geo = await geocodeFromCaption(newVideos[i].description);
        if (!geo) continue;

        rows[i].latitude = geo.lat;
        rows[i].longitude = geo.lng;
        rows[i].location_text = geo.locationText;
        geocodedCount++;
      }
    }

    const { error: insertError } = await supabaseAdmin.from("reviews").insert(rows);

    if (insertError) {
      throw new Error(`บันทึกลง Supabase ไม่สำเร็จ: ${insertError.message}`);
    }

    return NextResponse.json({
      fetched: videos.length,
      inserted: rows.length,
      skipped: videos.length - rows.length,
      insertedTitles: rows.map((r) => r.title),
      geocodedCount,
      note: !isGeocodingEnabled()
        ? "รีวิวใหม่ยังไม่มีพิกัด (latitude/longitude) และ location_text — เข้าไปเพิ่มเองในตาราง Supabase เพื่อให้ Google Maps + Geo-SEO ทำงานเต็มรูปแบบ (หรือตั้งค่า GEOCODING_API_KEY เพื่อให้ระบบเติมพิกัดให้อัตโนมัติ)"
        : `เติมพิกัดอัตโนมัติสำเร็จ ${geocodedCount}/${rows.length} รายการ — ที่เหลือ (ถ้ามี) ต้องเข้าไปเพิ่ม latitude/longitude เองในตาราง Supabase | หมายเหตุ: พิกัดจาก Geocoding เป็นระดับอำเภอ/จังหวัด ไม่ใช่หน้าร้านจริง แก้ให้แม่นได้ภายหลัง`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync-facebook]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
