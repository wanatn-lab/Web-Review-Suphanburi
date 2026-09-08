import "server-only";

// lib/geocoding.ts
// แปลง "ข้อความสถานที่" ที่อยู่ในแคปชั่น Facebook ให้กลายเป็นพิกัด lat/lng
// อัตโนมัติ ผ่าน Google Maps Geocoding API — ใช้โดย app/api/sync-facebook
// เพื่อให้รีวิวใหม่ที่ซิงก์เข้ามามีหมุดแผนที่ + Geo-SEO (LocalBusiness schema)
// ตั้งแต่วินาทีแรก โดยไม่ต้องรอทีมงานมากรอกพิกัดเองในตาราง Supabase
//
// Turn the location wording inside a Facebook caption into lat/lng coordinates
// via the Google Maps Geocoding API. Used by the Facebook sync route.
//
// ⚠️ ไฟล์นี้เป็น server-only (ใช้ API key จาก env ที่ไม่มี NEXT_PUBLIC_ นำหน้า)
// ห้าม import จาก Client Component เด็ดขาด — "server-only" ด้านบนจะทำให้ build
// พังทันทีถ้ามีใคร import ผิดที่ ป้องกัน key หลุดไปอยู่ใน JS bundle ฝั่ง browser
//
// หลักการสำคัญ: "ห้าม throw เด็ดขาด" — ทุกฟังก์ชันคืน null เมื่อพลาด เพราะการซิงก์
// คลิปจาก Facebook ต้องสำเร็จเสมอ แม้ Geocoding จะล่ม/โควตาหมด/ไม่ได้ตั้ง API key

const GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

/** timeout กัน Google ค้าง แล้วลาก Route Handler ไปชน timeout ของ Vercel ทั้งเส้น */
const GEOCODE_TIMEOUT_MS = 8000;

/** Supports the original Vercel variable name while standardising new setups on GEOCODING_API_KEY. */
export function getGeocodingApiKey(): string | null {
  return process.env.GEOCODING_API_KEY?.trim() || process.env.Geocoding_API_Key?.trim() || null;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeocodeResult extends GeoPoint {
  /** ข้อความสถานที่ที่ถอดได้จากแคปชั่น — เอาไปลงคอลัมน์ location_text ต่อได้เลย */
  locationText: string;
}

// รายชื่ออำเภอของสุพรรณบุรี + คำที่แคปชั่นมักเขียนกันจริง (aliases)
// เรียง "เจาะจงก่อน-กว้างทีหลัง" แบบเดียวกับ CATEGORY_KEYWORDS ใน lib/facebook-sync.ts
// canonical = วลีที่จะส่งเข้า Geocoding API และเก็บลงคอลัมน์ location_text
const DISTRICT_PATTERNS: { canonical: string; aliases: string[] }[] = [
  // "เมือง" เป็นคำกว้างมาก (เจอใน "ในเมือง"/"เมืองเก่า") จึงรับเฉพาะรูปที่มีคำนำหน้าอำเภอชัดเจน
  { canonical: "อำเภอเมืองสุพรรณบุรี", aliases: ["อำเภอเมือง", "อ.เมือง", "อ. เมือง"] },
  { canonical: "เดิมบางนางบวช สุพรรณบุรี", aliases: ["เดิมบางนางบวช"] },
  { canonical: "ศรีประจันต์ สุพรรณบุรี", aliases: ["ศรีประจันต์"] },
  { canonical: "หนองหญ้าไซ สุพรรณบุรี", aliases: ["หนองหญ้าไซ"] },
  { canonical: "สองพี่น้อง สุพรรณบุรี", aliases: ["สองพี่น้อง"] },
  { canonical: "บางปลาม้า สุพรรณบุรี", aliases: ["บางปลาม้า"] },
  { canonical: "ดอนเจดีย์ สุพรรณบุรี", aliases: ["ดอนเจดีย์"] },
  { canonical: "ด่านช้าง สุพรรณบุรี", aliases: ["ด่านช้าง"] },
  { canonical: "สามชุก สุพรรณบุรี", aliases: ["สามชุก"] },
  { canonical: "อู่ทอง สุพรรณบุรี", aliases: ["อู่ทอง"] },
];

/** ห้ามใช้ชื่อจังหวัดอย่างเดียวเป็นพิกัด: ผลลัพธ์จะเป็นจุดกึ่งกลางจังหวัด ไม่ใช่ร้านจริง */
const GENERIC_SUPHANBURI_LOCATION = /^(?:จังหวัด)?สุพรรณบุรี(?:\s+ประเทศไทย)?$/u;

/**
 * ถอด "ชื่ออำเภอ" ออกจากแคปชั่น แล้วคืนเป็นวลีเต็มที่พร้อมส่งเข้า Geocoding
 * เช่น "ร้านนี้อยู่ อ.เมือง นะ" -> "อำเภอเมืองสุพรรณบุรี"
 * ถ้าไม่เจออำเภอที่ชัดเจน ให้คืน null เพื่อไม่สร้างหมุดระดับจังหวัดที่ทำให้ข้อมูล GEO ผิด
 *
 * Extract a Suphanburi district name from a caption and return the full search
 * phrase. Returns null when no district can be identified.
 */
export function extractLocationFromCaption(caption: string): string | null {
  if (!caption) return null;

  for (const { canonical, aliases } of DISTRICT_PATTERNS) {
    if (aliases.some((alias) => caption.includes(alias))) {
      return canonical;
    }
  }

  return null;
}

/**
 * ยิง Google Maps Geocoding API เพื่อแปลงข้อความสถานที่ให้เป็นพิกัด lat/lng
 * คืน null ทุกกรณีที่พลาด (ไม่ได้ตั้ง key / เน็ตล่ม / โควตาหมด / หาไม่เจอ)
 *
 * Geocode a free-text location. Returns null on any failure — never throws.
 */
export async function geocodeLocation(locationText: string): Promise<GeoPoint | null> {
  const apiKey = getGeocodingApiKey();
  const normalizedLocation = locationText.trim();
  // A province-only query resolves to a generic centroid, never a storefront.
  if (!apiKey || !normalizedLocation || GENERIC_SUPHANBURI_LOCATION.test(normalizedLocation)) return null;

  try {
    const url = new URL(GEOCODE_ENDPOINT);
    // ต่อท้าย "จังหวัดสุพรรณบุรี ประเทศไทย" เสมอ กัน Google ไปเจอชื่อซ้ำในจังหวัดอื่น
    // (เช่น "สองพี่น้อง" มีในหลายจังหวัด) — บีบผลลัพธ์ให้อยู่ในพื้นที่ที่เรารีวิวจริง
    url.searchParams.set("address", `${normalizedLocation} จังหวัดสุพรรณบุรี ประเทศไทย`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("language", "th");
    url.searchParams.set("region", "TH");

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(`[geocodeLocation] HTTP ${res.status} ${res.statusText} — "${locationText}"`);
      return null;
    }

    const json = (await res.json()) as {
      status?: string;
      error_message?: string;
      results?: { geometry?: { location?: { lat?: number; lng?: number } } }[];
    };

    // status ของ Google: OK / ZERO_RESULTS / OVER_QUERY_LIMIT / REQUEST_DENIED / ...
    // ZERO_RESULTS เป็นเรื่องปกติ (แค่หาไม่เจอ) เลยไม่ต้อง log ให้รก
    if (json.status !== "OK") {
      if (json.status !== "ZERO_RESULTS") {
        console.error(
          `[geocodeLocation] status=${json.status ?? "unknown"} ${json.error_message ?? ""} — "${locationText}"`
        );
      }
      return null;
    }

    const location = json.results?.[0]?.geometry?.location;
    const lat = location?.lat;
    const lng = location?.lng;

    // กันเคส Google คืน payload แปลกๆ แล้วเราเผลอเขียน NaN/undefined ลงคอลัมน์พิกัด
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return null;
    }

    return { lat, lng };
  } catch (err) {
    // รวมถึง AbortError ตอน timeout — กลืนไว้ทั้งหมด ห้ามให้การซิงก์พังเพราะเรื่องนี้
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[geocodeLocation] "${locationText}":`, message);
    return null;
  }
}

/** ตั้งค่า GEOCODING_API_KEY ไว้หรือยัง — ให้ฝั่งที่เรียกใช้ข้าม loop ทั้งก้อนได้ถ้ายังไม่ได้ตั้ง */
export function isGeocodingEnabled(): boolean {
  return getGeocodingApiKey() !== null;
}

/**
 * ทางลัดที่ route ซิงก์เรียกใช้จริง: แคปชั่นดิบ -> พิกัด + ข้อความสถานที่
 * ทำงานเฉพาะเมื่อมี GEOCODING_API_KEY เท่านั้น — ถ้าไม่มีก็คืน null เงียบๆ
 * ระบบซิงก์ยังทำงานได้ตามปกติ แค่ไม่มีพิกัดอัตโนมัติ (เหมือนพฤติกรรมเดิม)
 *
 * Caption in, coordinates out. No-ops (returns null) when the API key is unset.
 */
export async function geocodeFromCaption(caption: string | null): Promise<GeocodeResult | null> {
  if (!isGeocodingEnabled()) return null;

  try {
    const locationText = extractLocationFromCaption(caption ?? "");
    if (!locationText) return null;

    const point = await geocodeLocation(locationText);
    if (!point) return null;

    return { ...point, locationText };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[geocodeFromCaption]:", message);
    return null;
  }
}
