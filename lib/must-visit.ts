export const HOME_MUST_VISIT_LIMIT = 6;
export const HOME_FEATURED_LIMIT = 5;
export const HOME_LATEST_LIMIT = 12;
export const MUST_VISIT_COLLECTION_LIMIT = 100;
export const ADMIN_CANDIDATE_LIMIT = 500;

export function buildHomeReviewSections<T extends { id: string }>(
  reviews: T[],
  mustVisitReviews: T[],
  featuredLimit = HOME_FEATURED_LIMIT,
  latestLimit = HOME_LATEST_LIMIT,
) {
  const mustVisitIds = new Set(mustVisitReviews.map((review) => review.id));
  const uniqueReviews = reviews.filter((review) => !mustVisitIds.has(review.id));

  return {
    featuredReviews: uniqueReviews.slice(0, featuredLimit),
    latestReviews: uniqueReviews.slice(featuredLimit, featuredLimit + latestLimit),
  };
}

export function filterMustVisitCandidates<
  T extends { title: string; location_text: string | null; category: string | null },
>(items: T[], query: string): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");
  if (!normalizedQuery) return items;

  return items.filter((item) =>
    [item.title, item.location_text, item.category]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase("th-TH").includes(normalizedQuery)),
  );
}
