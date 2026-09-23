import type { Metadata } from "next";
import Link from "next/link";
import ReviewCard from "@/components/review-card";
import { getAllReviews } from "@/lib/supabase";
import { shuffleItems } from "@/lib/must-visit";

export const metadata: Metadata = {
  title: "วิดีโอแนะนำทั้งหมด",
  description: "เลือกชมวิดีโอรีวิวสุพรรณบุรีทั้งหมด เรียงแบบสุ่ม",
};

export const dynamic = "force-dynamic";

export default async function FeaturedVideosPage() {
  const reviews = shuffleItems(await getAllReviews());

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12">
      <Link href="/" className="mb-5 inline-flex min-h-11 items-center text-sm font-bold text-[#B62F08] underline underline-offset-4 hover:text-[#7E260C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08]">
        กลับหน้าแรก
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-kanit)] text-2xl font-extrabold text-neutral-900 dark:text-neutral-50 sm:text-3xl">
            วิดีโอแนะนำ
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            วิดีโอรีวิวทั้งหมด เรียงแบบสุ่ม
          </p>
        </div>
        <Link href="/latest-videos" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-[#B62F08] underline underline-offset-4 hover:bg-white hover:text-[#7E260C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08]">
          เรียงตามวันที่เพิ่ม
        </Link>
      </div>
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
