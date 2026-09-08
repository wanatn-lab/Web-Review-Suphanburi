import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminSessionValid } from "@/lib/admin-auth";

const ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";
const MAX_RESULTS = 5;

export async function GET(request: Request) {
  // Read cookies through Next's request store rather than manually parsing the
  // Cookie header. Vercel/proxy formatting is not guaranteed to use "; " and
  // could otherwise reject a valid admin session.
  const sessionToken = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAdminSessionValid(sessionToken)) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลก่อนค้นหาสถานที่" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 160) {
    return NextResponse.json({ error: "คำค้นหาต้องมี 3–160 ตัวอักษร" }, { status: 400 });
  }

  const apiKey = process.env.GEOCODING_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า GEOCODING_API_KEY" }, { status: 503 });
  }

  const address = /สุพรรณบุรี/u.test(query) ? query : `${query} สุพรรณบุรี`;
  const url = new URL(ENDPOINT);
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "th");
  url.searchParams.set("region", "TH");

  try {
    const response = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const payload = await response.json() as {
      status?: string;
      results?: Array<{ formatted_address?: string; geometry?: { location?: { lat?: number; lng?: number } } }>;
    };

    if (!response.ok || payload.status !== "OK") {
      return NextResponse.json({ results: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const results = (payload.results ?? []).flatMap((result) => {
      const latitude = result.geometry?.location?.lat;
      const longitude = result.geometry?.location?.lng;
      if (!result.formatted_address || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
      return [{ label: result.formatted_address, latitude: latitude as number, longitude: longitude as number }];
    }).slice(0, MAX_RESULTS);

    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "เชื่อมต่อ Google Maps ไม่สำเร็จ" }, { status: 502 });
  }
}
