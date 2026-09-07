import { generateSeoCopy } from "./seo-content-generator";

export interface ManualSeoCategory { slug: string; label: string; }

// Pre-existing bug fixed in passing: this type was dropped from this file by
// the "manage review categories from admin" commit (which moved SEO-content
// generation over to dynamic {slug,label} categories via ManualSeoCategory
// above), but lib/facebook-manual-import.ts and lib/tiktok-manual-import.ts
// still import it for the coarse "restaurant"/"attraction" guess they make
// before a human picks the real category in the form -- without this export,
// `npx tsc --noEmit` and `next build` both fail on main (verified: reproduced
// on a clean checkout of this commit before this fix).
export type ManualContentCategory = "restaurant" | "attraction";

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

export interface EnhancedSeoContent {
  title: string;
  description: string;
  slugBase: string;
  /** true when Cloudflare's Llama model wrote this copy; false means the
   *  plain keyword-template fallback above was used instead (Cloudflare
   *  credentials missing, the request failed, or the reply wasn't valid
   *  JSON). Surfaced to the admin form so the editor knows whether to give
   *  the description a closer read before publishing. */
  aiGenerated: boolean;
}

/**
 * Same job as createManualSeoContent, but tries Cloudflare Workers AI first
 * to write a longer, naturally-worded title + description from the raw
 * caption (and transcript, when lib/audio-transcription.ts produced one)
 * instead of the fixed "<content> | <keyword>" template. Always falls back
 * to createManualSeoContent's template on any failure, so saving a review
 * never depends on Cloudflare being configured or reachable.
 */
export async function createEnhancedSeoContent(
  category: ManualSeoCategory,
  placeName: string,
  reviewContent: string,
  transcript?: string | null
): Promise<EnhancedSeoContent> {
  const fallback = createManualSeoContent(category, placeName, reviewContent);

  const generated = await generateSeoCopy({
    categoryLabel: category.label,
    placeName,
    caption: reviewContent,
    transcript,
  });

  if (!generated) {
    return { ...fallback, aiGenerated: false };
  }

  return {
    title: generated.title,
    description: generated.description,
    // slugBase is always derived from the place name + category, never from
    // AI-written text -- URLs must stay stable and predictable regardless of
    // whether the AI copy step ran.
    slugBase: fallback.slugBase,
    aiGenerated: true,
  };
}

export function createSlug(value: string): string {
  const slug = value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 120).replace(/-+$/g, "");
  return slug || "review-suphan-buri";
}
