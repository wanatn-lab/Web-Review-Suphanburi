import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionValid,
} from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { CategoryManager, type ManagedCategory } from "../manual-content/category-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage Categories",
  robots: { index: false, follow: false },
};

async function getManagedCategories(): Promise<ManagedCategory[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .select("slug, label, seo_title, seo_description, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    console.error("[admin/categories] Failed to load categories:", error.message);
    return [];
  }

  return (data ?? []) as ManagedCategory[];
}

export default async function CategoriesAdminPage() {
  const authenticated = isAdminSessionValid(cookies().get(ADMIN_SESSION_COOKIE)?.value);
  if (!authenticated) {
    redirect("/admin/manual-content");
  }

  const categories = await getManagedCategories();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <Link href="/admin/manual-content" className="text-sm font-semibold text-[#B62F08] underline">
        ← กลับไปเพิ่มเนื้อหา / ถอดเสียง
      </Link>
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-[#DA3D0D]">Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold">จัดการหมวดหมู่</h1>
      </div>
      <CategoryManager categories={categories} />
    </main>
  );
}
