export type ManualContentCategory = "restaurant" | "attraction";

interface CategoryConfig {
  databaseCategory: "food" | "trip";
  keyword: "Suphan Buri restaurants" | "Suphan Buri attractions";
  thaiLabel: string;
}

export const MANUAL_CATEGORY_CONFIG: Record<ManualContentCategory, CategoryConfig> = {
  restaurant: {
    databaseCategory: "food",
    keyword: "Suphan Buri restaurants",
    thaiLabel: "ร้านอาหาร",
  },
  attraction: {
    databaseCategory: "trip",
    keyword: "Suphan Buri attractions",
    thaiLabel: "สถานที่ท่องเที่ยว",
  },
};

export function isManualContentCategory(value: string): value is ManualContentCategory {
  return value === "restaurant" || value === "attraction";
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function createManualSeoContent(
  category: ManualContentCategory,
  placeName: string,
  reviewContent: string
) {
  const config = MANUAL_CATEGORY_CONFIG[category];
  const normalizedName = normalizeText(placeName);
  const normalizedContent = normalizeText(reviewContent);
  const hasKeywordInName = normalizedName.toLowerCase().includes(config.keyword.toLowerCase());
  const hasKeywordInContent = normalizedContent.toLowerCase().includes(config.keyword.toLowerCase());

  const title = hasKeywordInName ? normalizedName : `${normalizedName} | ${config.keyword}`;
  const keywordSentence = `รีวิว${config.thaiLabel} ${normalizedName} สำหรับผู้ที่กำลังค้นหา ${config.keyword} ในจังหวัดสุพรรณบุรี`;
  const description = hasKeywordInContent
    ? normalizedContent
    : `${normalizedContent} ${keywordSentence}`;

  return {
    title,
    description,
    slugBase: createSlug(`${normalizedName}-${config.databaseCategory}`),
  };
}

export function createSlug(value: string): string {
  const slug = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");

  return slug || "review-suphan-buri";
}
