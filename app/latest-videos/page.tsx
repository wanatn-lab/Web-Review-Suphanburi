import type { Metadata } from "next";
import ReviewCard from "@/components/review-card";
import { getAllReviews } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "วิดีโอรีวิวล่าสุดทั้งหมด",
  description: "รวมวิดีโอรีวิวสุพรรณบุรีทั้งหมด เรียงตามวันที่เพิ่มเข้าระบบล่าสุด",
};

export const revalidate = 60;

export default async function LatestVideosPage() {
  const reviews = await getAllReviews();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12">
      <a href="/" className="mb-5 inline-flex min-h-11 items-center text-sm font-bold text-[#B62F08] underline underline-offset-4 hover:text-[#7E260C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08]">
        กลับหน้าแรก
      </a>
      <h1 className="mb-2 font-[family-name:var(--font-kanit)] text-2xl font-extrabold text-neutral-900 dark:text-neutral-50 sm:text-3xl">
        วิดีโอล่าสุด
      </h1>
      <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-300">
        วิดีโอรีวิวทั้งหมด เรียงจากรายการที่เพิ่มล่าสุด
      </p>
      {reviews.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
          ยังไม่มีรีวิวในระบบ
        </div>
      )}
    </main>
  );
}
