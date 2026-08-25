// lib/categories.ts
// Shared category taxonomy — single source of truth for Home page tabs,
// category pages, review cards, and the detail page badge.

export type ReviewCategory = "food" | "cafe" | "trip" | "stay" | "market";

export const CATEGORIES: { slug: ReviewCategory; label: string }[] = [
  { slug: "food", label: "ร้านอาหาร" },
  { slug: "cafe", label: "คาเฟ่" },
  { slug: "trip", label: "ที่เที่ยว" },
  { slug: "stay", label: "ที่พัก" },
  { slug: "market", label: "ตลาด" },
];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.label])
);

export const CATEGORY_BADGE_CLASS: Record<string, string> = {
  food: "bg-[#FFE3D6] text-[#B62F08]",
  cafe: "bg-[#FFF3C4] text-[#8A6A00]",
  trip: "bg-[#FBDCD8] text-[#E5342A]",
  stay: "bg-[#FBDCD8] text-[#E5342A]",
  market: "bg-[#FFE3D6] text-[#B62F08]",
};

export function isValidCategory(value: string): value is ReviewCategory {
  return CATEGORIES.some((c) => c.slug === value);
}
