import type { Metadata } from "next";
import { searchReviews } from "@/lib/supabase";
import ReviewCard from "@/components/review-card";

// app/search/page.tsx — ปลายทางของช่องค้นหาบน Home Page
// ไม่ index หน้านี้ (กัน duplicate content จาก query string ต่างๆ)

interface PageProps {
  searchParams: { q?: string };
}

export function generateMetadata({ searchParams }: PageProps): Metadata {
  const q = searchParams.q?.trim() ?? "";
  return {
    title: q ? `ผลค้นหา "${q}"` : "ค้นหารีวิว",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const q = searchParams.q?.trim() ?? "";
  const results = q ? await searchReviews(q, 24) : [];

  return (
    <main className="px-4 py-8 sm:px-8">
      <h1 className="mb-1 font-[family-name:var(--font-kanit)] text-2xl font-extrabold">
        {q ? `ผลการค้นหา "${q}"` : "ค้นหารีวิว"}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        {q
          ? `พบ ${results.length} รายการ`
          : "พิมพ์คำค้นหาจากหน้าแรกเพื่อดูรีวิวร้านอาหาร คาเฟ่ หรือที่เที่ยวในสุพรรณบุรี"}
      </p>

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : q ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
          ไม่พบผลลัพธ์สำหรับ &quot;{q}&quot; ลองคำค้นหาอื่นดูนะ
        </div>
      ) : null}
    </main>
  );
}
