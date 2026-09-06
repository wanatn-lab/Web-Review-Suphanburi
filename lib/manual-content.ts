export type ManualContentCategory = "restaurant" | "attraction";

interface CategoryConfig {
  databaseCategory: "food" | "trip";
  keyword: "ร้านอาหารสุพรรณบุรี" | "ที่เที่ยวสุพรรณบุรี";
  thaiLabel: string;
}

export const MANUAL_CATEGORY_CONFIG: Record<ManualContentCategory, CategoryConfig> = {
  restaurant: {
    databaseCategory: "food",
    keyword: "ร้านอาหารสุพรรณบุรี",
    thaiLabel: "ร้านอาหาร",
  },
  attraction: {
    databaseCategory: "trip",
    keyword: "ที่เที่ยวสุพรรณบุรี",
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
  // Keep ASCII letters/numbers only. `\p{Letter}` also matches Thai script, and a
  // Thai-character slug crashes Next.js's `revalidatePath`/internal header handling
  // (HTTP header values must be Latin1/ByteString) — place names here are almost
  // always Thai, so this reliably empties out to the category word, which is fine:
  // callers already disambiguate collisions by appending a random suffix.
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");

  return slug || "review-suphan-buri";
}
