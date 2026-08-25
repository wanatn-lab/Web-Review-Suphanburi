import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReviewsByCategory } from "@/lib/supabase";
import { CATEGORY_LABEL, isValidCategory } from "@/lib/categories";
import ReviewCard from "@/components/review-card";

// app/category/[category]/page.tsx — Category Page (Server Component, SSR)
// e.g. /category/food -> "ร้านอาหารสุพรรณบุรี"

// revalidate = 60: กันปัญหาหน้า static ค้างข้อมูลเก่า (ดูคำอธิบายเต็มใน app/page.tsx)
export const revalidate = 60;

interface PageProps {
  params: { category: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!isValidCategory(params.category)) {
    return { title: "ไม่พบหมวดหมู่นี้", robots: { index: false, follow: true } };
  }

  const label = CATEGORY_LABEL[params.category];
  return {
    title: `${label}สุพรรณบุรี รวมรีวิวล่าสุด`,
    description: `รวมรีวิว${label}สุพรรณบุรี พร้อมคลิปวิดีโอจาก Facebook และ TikTok อัปเดตล่าสุด | ร้านอาหารสุพรรณบุรี, ที่เที่ยวสุพรรณบุรี`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  if (!isValidCategory(params.category)) {
    notFound();
  }

  const label = CATEGORY_LABEL[params.category];
  const reviews = await getReviewsByCategory(params.category, 24);

  return (
    <main className="px-4 py-8 sm:px-8">
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-neutral-400">
          <li>
            <a href="/" className="hover:text-[#FF4B12]">
              หน้าแรก
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-neutral-600 dark:text-neutral-300">
            {label}สุพรรณบุรี
          </li>
        </ol>
      </nav>

      <h1 className="mb-1 font-[family-name:var(--font-kanit)] text-2xl font-extrabold">{label}สุพรรณบุรี</h1>
      <p className="mb-6 text-sm text-neutral-500">
        รวมรีวิว{label}ในจังหวัดสุพรรณบุรี อัปเดตล่าสุดจากคลิปวิดีโอจริง
      </p>

      {reviews.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
          ยังไม่มีรีวิวในหมวดหมู่นี้
        </div>
      )}
    </main>
  );
}
