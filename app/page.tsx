import type { Metadata } from "next";
import Link from "next/link";
import { getAllReviews, getMustVisitReviews } from "@/lib/supabase";
import { getCategories } from "@/lib/categories";
import {
  buildHomeReviewSections,
  HOME_FEATURED_LIMIT,
  HOME_LATEST_LIMIT,
  HOME_MUST_VISIT_LIMIT,
} from "@/lib/must-visit";
import ReviewCard from "@/components/review-card";
import { MustVisitCard } from "@/components/must-visit-card";
import TrendingVideoCard from "@/components/trending-video-card";

// app/page.tsx — Home Page (Server Component, SSR)
// Hero + Search + Category tabs + Trending rail + latest reviews grid.
// All data comes from Supabase server-side so Google Bot sees the full
// list on the first response, matching the approved UI 1:1.

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "รวมรีวิวสุพรรณบุรี ที่เที่ยว ร้านอาหาร อัปเดตล่าสุด",
  description:
    "รวมรีวิวร้านอาหารสุพรรณบุรี ที่เที่ยวสุพรรณบุรี คาเฟ่ และที่พัก จากคลิปวิดีโอ Facebook และ TikTok ครบทุกอำเภอ อัปเดตทุกสัปดาห์",
};

// สำคัญ: หน้านี้เป็น Server Component ไม่มี dynamic API (cookies/headers/searchParams)
// เลย Next.js จะ prerender เป็นไฟล์ static ตอน build ครั้งเดียวแล้วใช้ซ้ำตลอด
// (ตอนนั้นตาราง reviews ยังว่างอยู่ หน้าเว็บเลยค้างโชว์ "ยังไม่มีรีวิว" แม้จะเพิ่มข้อมูลใน
// Supabase ไปแล้วก็ตาม) revalidate = 60 สั่งให้ Next.js สร้างหน้าใหม่จาก Supabase
// อัตโนมัติทุก 60 วินาที — เร็วเหมือน static เดิม แต่ข้อมูลไม่ค้าง
export const revalidate = 60;

export default async function HomePage() {
  const reviewFetchLimit = HOME_MUST_VISIT_LIMIT + HOME_FEATURED_LIMIT + HOME_LATEST_LIMIT;
  const [reviews, categories, mustVisitReviews] = await Promise.all([
    getAllReviews(reviewFetchLimit),
    getCategories(),
    getMustVisitReviews(HOME_MUST_VISIT_LIMIT),
  ]);
  const { featuredReviews, latestReviews } = buildHomeReviewSections(reviews, mustVisitReviews);

  return (
    <main>
      <section className="relative overflow-hidden bg-[#DA3D0D] px-4 py-10 text-white sm:px-8 sm:py-14">
        <span className="mb-3 inline-block -rotate-1 rounded-md bg-[#FFDD00] px-3 py-1 text-xs font-bold text-[#20140D] shadow-sm">
          #ReviewSuphan
        </span>
        <h1 className="max-w-xl font-[family-name:var(--font-kanit)] text-2xl font-extrabold leading-tight sm:text-4xl">
          รวมรีวิวสุพรรณบุรี ที่เที่ยว ร้านอาหาร อัปเดตล่าสุด
        </h1>
        <p className="mt-3 max-w-md text-sm text-white sm:text-base">
          คลิปรีวิวจาก TikTok และ Facebook ครบทุกอำเภอเมือง สามชุก อู่ทอง และศรีประจันต์ อัปเดตทุกสัปดาห์
        </p>

        <form action="/search" method="GET" className="mt-6 flex max-w-lg gap-2">
          <label htmlFor="q" className="sr-only">
            ค้นหาร้านอาหาร คาเฟ่ หรือที่เที่ยวในสุพรรณบุรี
          </label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="ค้นหาร้าน คาเฟ่ หรือที่เที่ยว..."
            className="flex-1 rounded-xl border-0 px-4 py-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
          />
          <button
            type="submit"
            className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-black"
          >
            ค้นหา
          </button>
        </form>

        <ul className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-white/50 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white hover:text-[#DA3D0D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-[#FFF2ED] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold tracking-wide text-[#B62F08]">LOCAL PICKS</span>
              <h2 className="font-[family-name:var(--font-kanit)] text-2xl font-extrabold text-[#7E260C]">มาสุพรรณบุรีต้องแวะ</h2>
              <p className="mt-1 text-sm text-[#7E4A3B]">พิกัดคัดสรรสำหรับเริ่มวางแผนเที่ยว</p>
            </div>
            <Link href="/must-visit-suphanburi" className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-bold text-[#B62F08] underline underline-offset-4 hover:bg-white/70 hover:text-[#7E260C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08]">ดูทั้งหมด</Link>
          </div>
          {mustVisitReviews.length > 0 ? (
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
              {mustVisitReviews.map((review, index) => (
                <MustVisitCard key={review.id} review={review} rank={index + 1} className="w-44 flex-none snap-start sm:w-52" />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-[#E5B8A7] bg-white/70 p-5 text-sm text-[#8A4A35]">กำลังคัดเลือกพิกัดที่ต้องแวะ</p>
          )}
        </div>
      </section>

      {featuredReviews.length > 0 && (
        <section className="bg-[#FFF8F5] px-4 py-10 sm:px-8 sm:py-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold tracking-[0.12em] text-[#B62F08]">WATCH &amp; GO</span>
                <h2 className="font-[family-name:var(--font-kanit)] text-2xl font-extrabold text-neutral-900 sm:text-3xl">วิดีโอแนะนำ</h2>
                <p className="mt-1 text-sm text-neutral-600">คลิปคัดมาให้ดูง่าย พร้อมเปิดพิกัดร้านและที่เที่ยวได้ทันที</p>
              </div>
              <a href="#latest-videos" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-[#B62F08] underline underline-offset-4 transition hover:bg-white hover:text-[#7E260C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08]">
                ดูวิดีโอล่าสุด
              </a>
            </div>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible lg:grid-cols-5">
              {featuredReviews.map((review) => (
                <TrendingVideoCard key={review.id} review={review} className="w-36 flex-none snap-start sm:w-auto sm:flex-none" />
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="latest-videos" className="px-4 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-5 font-[family-name:var(--font-kanit)] text-2xl font-extrabold text-neutral-900">ฟีดวิดีโอรีวิวล่าสุด</h2>
          {latestReviews.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {latestReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
              รีวิวล่าสุดทั้งหมดแสดงอยู่ในส่วนแนะนำด้านบนแล้ว
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
              ยังไม่มีรีวิวในระบบ — เพิ่มข้อมูลในตาราง{" "}
              <code className="rounded bg-neutral-200 px-1 py-0.5 dark:bg-neutral-800">reviews</code> ของ Supabase ได้เลย
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
