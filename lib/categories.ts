import { supabase } from "./supabase";

export interface Category {
  slug: string;
  label: string;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_active: boolean;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { slug: "food", label: "ร้านอาหาร", seo_title: "ร้านอาหารสุพรรณบุรี รวมรีวิวล่าสุด", seo_description: null, sort_order: 10, is_active: true },
  { slug: "cafe", label: "คาเฟ่", seo_title: "คาเฟ่สุพรรณบุรี รวมรีวิวล่าสุด", seo_description: null, sort_order: 20, is_active: true },
  { slug: "trip", label: "ที่เที่ยว", seo_title: "ที่เที่ยวสุพรรณบุรี รวมรีวิวล่าสุด", seo_description: null, sort_order: 30, is_active: true },
  { slug: "stay", label: "ที่พัก", seo_title: "ที่พักสุพรรณบุรี รวมรีวิวล่าสุด", seo_description: null, sort_order: 40, is_active: true },
  { slug: "market", label: "ตลาด", seo_title: "ตลาดสุพรรณบุรี รวมรีวิวล่าสุด", seo_description: null, sort_order: 50, is_active: true },
];

export const CATEGORY_BADGE_CLASS: Record<string, string> = {
  food: "bg-[#FFE3D6] text-[#B62F08]",
  cafe: "bg-[#FFF3C4] text-[#8A6A00]",
  trip: "bg-[#FBDCD8] text-[#E5342A]",
  stay: "bg-[#E0F2FE] text-[#075985]",
  market: "bg-[#DCFCE7] text-[#166534]",
};

export function defaultCategoryLabel(slug: string): string {
  return DEFAULT_CATEGORIES.find((category) => category.slug === slug)?.label ?? slug;
}

const CATEGORY_COLUMNS = "slug, label, seo_title, seo_description, sort_order, is_active";

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select(CATEGORY_COLUMNS)
    .eq("is_active", true).order("sort_order", { ascending: true }).order("label", { ascending: true });
  if (error) { console.error("[getCategories]:", error.message); return DEFAULT_CATEGORIES; }
  return (data ?? []) as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const { data, error } = await supabase.from("categories").select(CATEGORY_COLUMNS)
    .eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) {
    console.error(`[getCategoryBySlug] slug="${slug}":`, error.message);
    return DEFAULT_CATEGORIES.find((category) => category.slug === slug) ?? null;
  }
  return (data as Category | null) ?? null;
}
