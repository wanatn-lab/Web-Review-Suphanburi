// lib/seo-text.ts
// Small text-shaping helpers used to build safe <meta name="description">
// values for review pages. Pulled out of app/reviews/[slug]/page.tsx so they
// can be unit-tested directly (that file is a Next.js Server Component and
// pulls in next/navigation + Supabase, which node:test can't import cleanly).

export const MAX_META_DESCRIPTION_LENGTH = 155;

/**
 * Truncates `text` to at most `maxLength` characters WITHOUT cutting a
 * surrogate pair (emoji, etc.) or a word in half. Iterates by Unicode code
 * point (via the string spread operator, not `.slice`/`.length`, which
 * count UTF-16 code units and can split an emoji in two) and backs off to
 * the last whitespace boundary when one is reasonably close to the limit.
 */
export function truncateDescription(text: string, maxLength: number): string {
    const codePoints = [...text.trim()];
    if (codePoints.length <= maxLength) {
          return codePoints.join("");
    }

  // Reserve 1 code point for the "…" we're about to add, so the FINAL
  // result (content + ellipsis) never exceeds maxLength.
  const budget = Math.max(0, maxLength - 1);
    let cut = codePoints.slice(0, budget).join("");
    const lastSpace = cut.lastIndexOf(" ");
    // Only back off to the space if it doesn't throw away most of the text.
  if (lastSpace > budget * 0.6) {
        cut = cut.slice(0, lastSpace);
  }
    return `${cut.trimEnd()}…`;
}

/**
 * Builds a meta description capped at ~155 characters (Google's practical
 * SEO limit; the old code always appended a full boilerplate keyword
 * sentence on top of an already-long caption, producing 400-500 character
 * descriptions that repeated the same wording on every review page).
 * The real caption/description always wins; the short keyword suffix is
 * appended only if it still fits within the limit, and is dropped rather
 * than forcibly squeezed in.
 */
export function buildMetaDescription(rawDescription: string, keywordSuffix: string, maxLength: number): string {
    const trimmedRaw = rawDescription.trim();
    const withSuffix = `${trimmedRaw} ${keywordSuffix}`;
    if ([...withSuffix].length <= maxLength) {
          return withSuffix;
    }
    return truncateDescription(trimmedRaw, maxLength);
}
