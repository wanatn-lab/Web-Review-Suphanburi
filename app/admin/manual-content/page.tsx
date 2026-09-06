import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  isAdminSessionValid,
  isEmailLoginConfigured,
} from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { loginAdmin, loginAdminWithEmail, logoutAdmin } from "./actions";
import { ManualContentForm, type EditableManualReview } from "./manual-content-form";
import { DeleteReviewButton } from "./delete-review-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manual Content Entry",
  robots: { index: false, follow: false },
};

interface AdminPageProps {
  searchParams: { created?: string; updated?: string; deleted?: string; edit?: string; error?: string };
}

interface ManualReviewListItem {
  slug: string;
  title: string;
  location_text: string | null;
}

const inputClass =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#DA3D0D] focus:ring-2 focus:ring-[#DA3D0D]/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

const errorMessages: Record<string, string> = {
  config: "ยังไม่ได้ตั้งค่า ADMIN_PASSWORD ใน Environment Variables ของเซิร์ฟเวอร์",
  database: "บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบ migration และการเชื่อมต่อ Supabase แล้วลองใหม่",
  login: "เข้าสู่ระบบไม่สำเร็จ ตรวจสอบรหัสผ่าน หรืออีเมล/รหัสผ่านอีกครั้ง",
  session: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",
  validation: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ ใช้ลิงก์ http/https และใช้ URL รูปที่โปรเจกต์รองรับ",
};

async function getManualReview(slug: string): Promise<EditableManualReview | null> {
  // ไม่กรอง source ตรงนี้ — รีวิวที่ดึงจาก Facebook อัตโนมัติ (source: "facebook_auto")
  // ต้องแก้ไขได้จากหน้านี้เช่นกัน ไม่ใช่แค่รายการที่พิมพ์เพิ่มเอง (source: "manual")
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .select("slug, title, description, category, cover_image, facebook_embed_url, tiktok_embed_url, location_text")
    .is("deleted_at", null)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[manual-content] Failed to load review for editing:", error.message);
    return null;
  }

  return {
    slug: data.slug,
    category: data.category === "trip" ? "attraction" : "restaurant",
    placeName: data.title.replace(/ \| Suphan Buri (restaurants|attractions)$/i, ""),
    reviewContent: data.description ?? "",
    referenceUrl: data.tiktok_embed_url ?? data.facebook_embed_url ?? "",
    imageUrl: data.cover_image ?? "",
    address: data.location_text ?? "สุพรรณบุรี",
  };
}

async function getRecentReviews(): Promise<ManualReviewListItem[]> {
  // แสดงรีวิวล่าสุดทุกแหล่งที่มา (ทั้งพิมพ์เพิ่มเองและดึงจาก Facebook อัตโนมัติ)
  // เพื่อให้กดแก้ไขคลิปที่อัปโหลดไปแล้วได้จากหน้านี้จุดเดียว
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .select("slug, title, location_text")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[manual-content] Failed to load recent review list:", error.message);
    return [];
  }

  return data ?? [];
}

export default async function ManualContentAdminPage({ searchParams }: AdminPageProps) {
  const authenticated = isAdminSessionValid(cookies().get(ADMIN_SESSION_COOKIE)?.value);
  const configured = isAdminConfigured();
  const emailLoginConfigured = isEmailLoginConfigured();
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
            <label htmlFor="password" className="text-sm font-semibold">รหัสผ่านผู้ดูแล</label>
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

          {/*
            แสดงฟอร์ม login ด้วยอีเมลเฉพาะตอนตั้งค่า ADMIN_ALLOWED_EMAILS ไว้แล้วเท่านั้น —
            ก่อนตั้งค่า หน้านี้จะเหมือนเดิมทุกประการ ไม่มีอะไรเปลี่ยนสำหรับคนที่ยังใช้แค่
            รหัสผ่านกลาง (ADMIN_PASSWORD) ตามปกติ
          */}
          {emailLoginConfigured && (
            <>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                <span className="text-xs font-semibold text-neutral-400">หรือ</span>
                <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
              </div>

              <form action={loginAdminWithEmail} className="mt-5 space-y-3">
                <div>
                  <label htmlFor="email" className="text-sm font-semibold">อีเมล</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={256}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="email_password" className="text-sm font-semibold">รหัสผ่าน</label>
                  <input
                    id="email_password"
                    name="email_password"
                    type="password"
                    autoComplete="current-password"
                    maxLength={256}
                    required
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-[#DA3D0D] px-4 py-3 text-sm font-bold text-[#DA3D0D] transition hover:bg-[#DA3D0D]/10"
                >
                  เข้าสู่ระบบด้วยอีเมล
                </button>
                <p className="text-xs text-neutral-500">
                  ยังไม่มีรหัสผ่าน? ให้ผู้ดูแลระบบกด &quot;Invite user&quot; ในหน้า Supabase Dashboard ให้อีเมลนี้ก่อน ระบบจะส่งลิงก์ให้ตั้งรหัสผ่านเอง
                </p>
              </form>
            </>
          )}
        </section>
      </main>
    );
  }

  const [editReview, recentReviews] = await Promise.all([
    searchParams.edit ? getManualReview(searchParams.edit) : Promise.resolve(null),
    getRecentReviews(),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#DA3D0D]">Admin</p>
          <h1 className="mt-1 text-2xl font-extrabold">{editReview ? "แก้ไขเนื้อหา" : "เพิ่มเนื้อหา"}</h1>
          <p className="mt-2 text-sm text-neutral-500">
            ระบบจะสร้าง slug, H1 และข้อมูล SEO/GEO ให้ตามหมวดหมู่โดยอัตโนมัติ คุณตรวจแก้ก่อนเผยแพร่ได้
          </p>
        </div>
        <form action={logoutAdmin}>
          <button type="submit" className="text-sm font-semibold text-neutral-500 underline hover:text-neutral-900">ออกจากระบบ</button>
        </form>
      </div>

      {searchParams.created && (
        <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          บันทึกเรียบร้อยแล้ว — <Link href={`/reviews/${searchParams.created}`} className="font-bold underline">เปิดหน้ารีวิว</Link>
        </div>
      )}
      {searchParams.updated && (
        <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          แก้ไขเรียบร้อยแล้ว — <Link href={`/reviews/${searchParams.updated}`} className="font-bold underline">เปิดหน้ารีวิว</Link>
        </div>
      )}
      {searchParams.deleted && (
        <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          ลบออกจากหน้าเว็บแล้ว — ข้อมูลถูกเก็บไว้ในฐานข้อมูลเพื่อความปลอดภัย
        </div>
      )}
      {searchParams.edit && !editReview && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          ไม่พบรายการ Manual ที่ต้องการแก้ไข
        </div>
      )}
      {errorMessage && (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
      )}

      {editReview && (
        <Link href="/admin/manual-content" className="mt-6 inline-block text-sm font-semibold text-[#B62F08] underline">
          เพิ่มรายการใหม่แทน
        </Link>
      )}

      {/*
        key แยกตาม slug (หรือ "new" ตอนไม่ได้แก้ไข) — บังคับให้ React mount ฟอร์มใหม่ทุกครั้งที่
        สลับรายการที่แก้ไข หรือสลับไปมาระหว่างโหมด "เพิ่มใหม่" กับ "แก้ไข" เพราะ ManualContentForm
        เก็บค่าฟอร์มไว้ใน useState ของตัวเอง (initialReview ใช้แค่ตอน mount ครั้งแรกเท่านั้น) — ถ้าไม่มี
        key ตัวนี้ การกดลิงก์ "แก้ไข" จากหน้าเดิม (Next.js client-side navigation ไม่ reload หน้า) จะทำให้
        ฟอร์มค้างค่าง่างเดิม/ว่างเปล่า ดูเหมือนฟีเจอร์แก้ไขใช้งานไม่ได้ทั้งที่ข้อมูลจริงถูกโหลดมาแล้ว
      */}
      <ManualContentForm key={editReview?.slug ?? "new"} initialReview={editReview} />

      <section className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <h2 className="text-lg font-extrabold">รีวิวล่าสุด (แก้ไขได้ทุกรายการ)</h2>
        <p className="mt-1 text-xs text-neutral-500">
          รวมทั้งรายการที่พิมพ์เพิ่มเองและรายการที่ระบบดึงจาก Facebook อัตโนมัติ
        </p>
        {recentReviews.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">ยังไม่มีรีวิวในระบบ</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {recentReviews.map((review) => (
              <li key={review.slug} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold">{review.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{review.location_text ?? "ไม่ระบุพื้นที่"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/admin/manual-content?edit=${encodeURIComponent(review.slug)}`} className="text-sm font-bold text-[#B62F08] underline">
                    แก้ไข
                  </Link>
                  <DeleteReviewButton slug={review.slug} title={review.title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
