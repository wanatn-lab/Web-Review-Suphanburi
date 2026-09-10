import Link from "next/link";

interface PaginationProps {
  page: number;
  hasNextPage: boolean;
  pathname: string;
  query?: string;
}

function hrefForPage(pathname: string, page: number, query?: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

export default function Pagination({ page, hasNextPage, pathname, query }: PaginationProps) {
  if (page === 1 && !hasNextPage) return null;

  return (
    <nav aria-label="เปลี่ยนหน้ารายการรีวิว" className="mt-8 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link
          href={hrefForPage(pathname, page - 1, query)}
          className="inline-flex min-h-11 items-center rounded-xl border border-neutral-300 px-4 py-2 text-sm font-bold text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          ก่อนหน้า
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center rounded-xl border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-400 dark:border-neutral-800">
          ก่อนหน้า
        </span>
      )}
      <span className="text-sm text-neutral-700 dark:text-neutral-200">หน้า {page}</span>
      {hasNextPage ? (
        <Link
          href={hrefForPage(pathname, page + 1, query)}
          className="inline-flex min-h-11 items-center rounded-xl bg-[#B62F08] px-4 py-2 text-sm font-bold text-white hover:bg-[#8F2506]"
        >
          ถัดไป
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center rounded-xl border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-400 dark:border-neutral-800">
          ถัดไป
        </span>
      )}
    </nav>
  );
}
