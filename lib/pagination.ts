export const REVIEWS_PER_PAGE = 24;

export function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function pageOffset(page: number, pageSize = REVIEWS_PER_PAGE): number {
  return (page - 1) * pageSize;
}
