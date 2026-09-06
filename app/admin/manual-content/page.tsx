import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAllowedAdminEmails, getAuthenticatedAdminEmail } from "@/lib/supabase-auth";
import { loginAdmin, logoutAdmin } from "./actions";
import { ManualContentForm, type EditableManualReview } from "./manual-content-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manual Content Entry",
  robots: { index: false, follow: false },
};

interface AdminPageProps {
  searchParams: { created?: string; updated?: string; edit?: string; error?: string; sent?: string };
}

interface ManualReviewListItem {
  slug: string;
  title: string;
  location_text: string | null;
}

const inputClass =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#DA3D0D] focus:ring-2 focus:ring-[#DA3D0D]/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

const errorMessages: Record<string, string> = {
  database: "บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบ migration และการเชื่อมต่อ Supabase แล้วลองใหม่",
  session: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",
  validation: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ ใช้ลิงก์ http/https และใช้ URL รูปที่โปรเจกต์รองรับ",
  "auth-config": "ยังไม่ได้กำหนด ADMIN_EMAILS ใน Environment Variables ของเซิร์ฟเวอร์",
  "auth-email": "กรุณากรอกอีเมลให้ถูกต้อง",
  "auth-unauthorized": "อีเมลนี้ไม่ได้รับสิทธิ์เข้าหน้าจัดการเนื้อหา",
  "auth-send": "ส่งลิงก์เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า Email ของ Supabase แล้วลองใหม่",
  "auth-link": "ลิงก์เข้าสู่ระบบไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว กรุณาขอลิงก์ใหม่",
};

async function getManualReview(slug: string): Promise<EditableManualReview | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .select("slug, title, description, category, cover_image, facebook_embed_url, tiktok_embed_url, location_text")
    .eq("slug", slug)
    .eq("source", "manual")
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

async function getRecentManualReviews(): Promise<ManualReviewListItem[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .select("slug, title, location_text")
    .eq("source", "manual")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[manual-content] Failed to load manual review list:", error.message);
    return [];
  }

  return data ?? [];
}

export default async function ManualContentAdminPage({ searchParams }: AdminPageProps) {
  const adminEmail = await getAuthenticatedAdminEmail();
  const authenticated = adminEmail !== null;
  const configured = getAllowedAdminEmails().length > 0;
  const errorMessage = searchParams.error ? errorMessages[searchParams.error] : null;

  if (!authenticated) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
        <section className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-bold uppercase tracking-wider text-[#DA3D0D]">Admin</p>
          <h1 className="mt-1 text-2xl font-extrabold">เข้าสู่ระบบจัดการเนื้อหา</h1>
          <p className="mt-2 text-sm text-neutral-500">กรอกอีเมลผู้ดูแล แล้วเปิดลิงก์ยืนยันที่ส่งไปยังอีเมลนั้น</p>

          {!configured && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              ยังไม่ได้ตั้งค่า ADMIN_EMAILS ระบบจึงปิดการเข้าสู่ระบบไว้
            </div>
          )}
          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</div>
          )}
          {searchParams.sent === "1" && (
            <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
              ส่งลิงก์เข้าสู่ระบบแล้ว กรุณาเปิดอีเมลและกดลิงก์ภายใน 1 ชั่วโมง
            </div>
          )}

          <form action={loginAdmin} className="mt-5">
            <label htmlFor="email" className="text-sm font-semibold">อีเมลผู้ดูแล</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              disabled={!configured}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={!configured}
              className="mt-4 w-full rounded-xl bg-[#DA3D0D] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#B62F08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ส่งลิงก์เข้าสู่ระบบ
            </button>
          </form>
        </section>
      </main>
    );
  }

  const [editReview, recentReviews] = await Promise.all([
    searchParams.edit ? getManualReview(searchParams.edit) : Promise.resolve(null),
    getRecentManualReviews(),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#DA3D0D]">Admin · {adminEmail}</p>
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

      <ManualContentForm initialReview={editReview} />

      <section className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <h2 className="text-lg font-extrabold">รายการที่เพิ่มเองล่าสุด</h2>
        {recentReviews.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">ยังไม่มีรายการ Manual</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {recentReviews.map((review) => (
              <li key={review.slug} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold">{review.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{review.location_text ?? "ไม่ระบุพื้นที่"}</p>
                </div>
                <Link href={`/admin/manual-content?edit=${encodeURIComponent(review.slug)}`} className="text-sm font-bold text-[#B62F08] underline">
                  แก้ไข
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
