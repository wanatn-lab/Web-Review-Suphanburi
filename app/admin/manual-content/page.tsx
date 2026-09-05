import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  isAdminSessionValid,
} from "@/lib/admin-auth";
import { createManualReview, loginAdmin, logoutAdmin } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manual Content Entry",
  robots: { index: false, follow: false },
};

interface AdminPageProps {
  searchParams: { created?: string; error?: string };
}

const inputClass =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#DA3D0D] focus:ring-2 focus:ring-[#DA3D0D]/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

const errorMessages: Record<string, string> = {
  config: "ยังไม่ได้ตั้งค่า ADMIN_PASSWORD ใน Environment Variables ของเซิร์ฟเวอร์",
  database: "บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบ migration และการเชื่อมต่อ Supabase แล้วลองใหม่",
  login: "รหัสผ่านไม่ถูกต้อง",
  session: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",
  validation:
    "กรุณากรอกข้อมูลที่จำเป็นให้ครบ ใช้ลิงก์ http/https และใช้ URL รูปจาก CDN ที่โปรเจกต์รองรับ",
};

export default function ManualContentAdminPage({ searchParams }: AdminPageProps) {
  const authenticated = isAdminSessionValid(cookies().get(ADMIN_SESSION_COOKIE)?.value);
  const configured = isAdminConfigured();
  const errorMessage = searchParams.error ? errorMessages[searchParams.error] : null;

  if (!authenticated) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
        <section className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-bold uppercase tracking-wider text-[#DA3D0D]">Admin</p>
          <h1 className="mt-1 text-2xl font-extrabold">เข้าสู่ระบบจัดการเนื้อหา</h1>
          <p className="mt-2 text-sm text-neutral-500">ใช้รหัสผ่านที่ตั้งไว้ในตัวแปร ADMIN_PASSWORD บนเซิร์ฟเวอร์</p>

          {!configured && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              ยังไม่ได้ตั้งค่า ADMIN_PASSWORD ระบบจึงปิดการเข้าสู่ระบบไว้
            </div>
          )}
          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</div>
          )}

          <form action={loginAdmin} className="mt-5">
            <label htmlFor="password" className="text-sm font-semibold">
              รหัสผ่านผู้ดูแล
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={256}
              required
              disabled={!configured}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={!configured}
              className="mt-4 w-full rounded-xl bg-[#DA3D0D] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#B62F08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              เข้าสู่ระบบ
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#DA3D0D]">Admin</p>
          <h1 className="mt-1 text-2xl font-extrabold">เพิ่มเนื้อหาแบบ Manual</h1>
          <p className="mt-2 text-sm text-neutral-500">
            ระบบจะสร้าง slug, H1 และข้อมูล SEO ให้ตามหมวดหมู่โดยอัตโนมัติ
          </p>
        </div>
        <form action={logoutAdmin}>
          <button type="submit" className="text-sm font-semibold text-neutral-500 underline hover:text-neutral-900">
            ออกจากระบบ
          </button>
        </form>
      </div>

      {searchParams.created && (
        <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          บันทึกเรียบร้อยแล้ว — {" "}
          <Link href={`/reviews/${searchParams.created}`} className="font-bold underline">
            เปิดหน้ารีวิว
          </Link>
        </div>
      )}
      {errorMessage && (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
      )}

      <form action={createManualReview} className="mt-6 space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <label htmlFor="category" className="text-sm font-semibold">หมวดหมู่</label>
          <select id="category" name="category" required className={inputClass} defaultValue="restaurant">
            <option value="restaurant">ร้านอาหาร (Restaurant)</option>
            <option value="attraction">สถานที่ท่องเที่ยว (Attraction)</option>
          </select>
        </div>

        <div>
          <label htmlFor="place_name" className="text-sm font-semibold">ชื่อสถานที่</label>
          <input id="place_name" name="place_name" type="text" required maxLength={160} className={inputClass} />
        </div>

        <div>
          <label htmlFor="review_content" className="text-sm font-semibold">รายละเอียด / เนื้อหารีวิว</label>
          <textarea id="review_content" name="review_content" required maxLength={6000} rows={8} className={inputClass} />
          <p className="mt-1 text-xs text-neutral-500">ระบบจะเพิ่มคีย์เวิร์ดตามหมวดหมู่ให้อย่างเป็นธรรมชาติหนึ่งครั้ง</p>
        </div>

        <div>
          <label htmlFor="reference_url" className="text-sm font-semibold">ลิงก์โพสต์ Facebook หรือลิงก์อ้างอิง</label>
          <input id="reference_url" name="reference_url" type="url" inputMode="url" className={inputClass} placeholder="https://..." />
        </div>

        <div>
          <label htmlFor="image_url" className="text-sm font-semibold">URL รูปภาพ</label>
          <input id="image_url" name="image_url" type="url" inputMode="url" className={inputClass} placeholder="https://..." />
          <p className="mt-1 text-xs text-neutral-500">
            ใช้วิธี URL เดิมของโปรเจกต์ โดยรองรับ Facebook CDN และ TikTok CDN ที่ตั้งค่าไว้แล้ว
          </p>
        </div>

        <div>
          <label htmlFor="address" className="text-sm font-semibold">ที่อยู่</label>
          <textarea id="address" name="address" required maxLength={500} rows={3} className={inputClass} />
          <p className="mt-1 text-xs text-neutral-500">หากตั้งค่า GEOCODING_API_KEY ระบบจะเติมพิกัดให้อัตโนมัติ</p>
        </div>

        <button type="submit" className="w-full rounded-xl bg-[#DA3D0D] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#B62F08]">
          บันทึกและเผยแพร่
        </button>
      </form>
    </main>
  );
}
