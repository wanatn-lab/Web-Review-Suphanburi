export interface ManualSeoCategory { slug: string; label: string; }

function normalizeText(value: string): string { return value.trim().replace(/\s+/g, " "); }

export function createManualSeoContent(category: ManualSeoCategory, placeName: string, reviewContent: string) {
  const normalizedName = normalizeText(placeName);
  const normalizedContent = normalizeText(reviewContent);
  const keyword = category.label.includes("สุพรรณบุรี") ? category.label : `${category.label}สุพรรณบุรี`;
  const hasKeywordInName = normalizedName.toLowerCase().includes(keyword.toLowerCase());
  const hasKeywordInContent = normalizedContent.toLowerCase().includes(keyword.toLowerCase());
  const title = hasKeywordInName ? normalizedName : `${normalizedName} | ${keyword}`;
  const keywordSentence = `รีวิว${category.label} ${normalizedName} สำหรับผู้ที่กำลังค้นหา ${keyword} ในจังหวัดสุพรรณบุรี`;
  return {
    title,
    description: hasKeywordInContent ? normalizedContent : `${normalizedContent} ${keywordSentence}`,
    slugBase: createSlug(`${normalizedName}-${category.slug}`),
  };
}

export function createSlug(value: string): string {
  const slug = value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 120).replace(/-+$/g, "");
  return slug || "review-suphan-buri";
}
