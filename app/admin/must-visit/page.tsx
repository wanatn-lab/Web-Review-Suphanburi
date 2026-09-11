import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_SESSION_COOKIE, isAdminSessionValid } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_CANDIDATE_LIMIT } from "@/lib/must-visit";
import { MustVisitManager, type MustVisitItem } from "./must-visit-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "จัดการพิกัดต้องแวะ", robots: { index: false, follow: false } };

export default async function MustVisitAdminPage() {
  const authenticated = isAdminSessionValid(cookies().get(ADMIN_SESSION_COOKIE)?.value);
  if (!authenticated) return <main className="mx-auto max-w-2xl px-4 py-10"><h1 className="text-2xl font-extrabold">เข้าสู่ระบบก่อนจัดการพิกัด</h1><Link href="/admin/manual-content" className="mt-4 inline-flex min-h-11 items-center rounded-lg px-3 font-bold text-[#B62F08] underline">ไปหน้าเข้าสู่ระบบผู้ดูแล</Link></main>;
  const supabase = getSupabaseAdmin();
  const [{ data, error }, { data: availableData, error: availableError }] = await Promise.all([
    supabase.from("reviews").select("id, title, location_text, category, is_must_visit, must_visit_order").is("deleted_at", null).eq("is_must_visit", true).order("must_visit_order", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("reviews").select("id, title, location_text, category").is("deleted_at", null).eq("is_must_visit", false).order("created_at", { ascending: false }).limit(ADMIN_CANDIDATE_LIMIT),
  ]);
  if (error) throw new Error("Could not load reviews");
  if (availableError) throw new Error("Could not load reviews");
  const reviews = (data ?? []) as (MustVisitItem & { is_must_visit: boolean; must_visit_order: number | null })[];
  const pinned = reviews.filter((review) => review.is_must_visit).sort((a, b) => (a.must_visit_order ?? Number.MAX_SAFE_INTEGER) - (b.must_visit_order ?? Number.MAX_SAFE_INTEGER));
  const available = (availableData ?? []) as MustVisitItem[];
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8"><Link href="/admin/manual-content" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-[#B62F08] underline">← กลับหน้าจัดการเนื้อหา</Link><h1 className="mt-3 text-2xl font-extrabold">จัดการ “มาสุพรรณบุรีต้องแวะ”</h1><MustVisitManager pinned={pinned} available={available} /></main>;
}
