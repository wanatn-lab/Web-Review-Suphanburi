import type { Metadata } from "next";
import Link from "next/link";
import { getAllReviews } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";
import ReviewCard from "@/components/review-card";

// app/page.tsx — Home Page (Server Component, SSR)
// Hero + Search + Category tabs + Trending rail + latest reviews grid.
// All data comes from Supabase server-side so Google Bot sees the full
// list on the first response, matching the approved UI 1:1.

export const metadata: Metadata = {
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
  const reviews = await getAllReviews(12);
  // เดโม: ใช้รีวิวล่าสุด 5 รายการแทน "กำลังมาแรง" ไปก่อน — ถ้าอยากจัดอันดับจริง
  // แนะนำเพิ่มคอลัมน์ view_count แล้วเปลี่ยน order() เป็น view_count desc
  const trending = reviews.slice(0, 5);

  return (
    <main>
      <section className="relative overflow-hidden bg-[#DA3D0D] px-4 py-10 text-white sm:px-8 sm:py-14">
        <span className="mb-3 inline-block -rotate-1 rounded-md bg-[#FFDD00] px-3 py-1 text-xs font-bold text-[#20140D] shadow-sm">
          #ReviewSuphan
        </span>
        <h1 className="max-w-xl font-[family-name:var(--font-kanit)] text-2xl font-extrabold leading-tight sm:text-4xl">
          รวมรีวิวสุพรรณบุรี ที่เที่ยว ร้านอาหาร อัปเดตล่าสุด
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/90 sm:text-base">
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
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                className="whitespace-nowrap rounded-full border border-white/50 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white hover:text-[#DA3D0D]"
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {trending.length > 0 && (
        <section className="px-4 py-8 sm:px-8">
          <h2 className="mb-4 font-[family-name:var(--font-kanit)] text-lg font-bold">กำลังมาแรงตอนนี้</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {trending.map((review) => (
              <ReviewCard key={review.id} review={review} variant="rail" className="w-36 flex-none sm:w-44" />
            ))}
          </div>
        </section>
      )}

      <section className="px-4 py-8 sm:px-8">
        <h2 className="mb-4 font-[family-name:var(--font-kanit)] text-lg font-bold">ฟีดวิดีโอรีวิวล่าสุด</h2>
        {reviews.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
            ยังไม่มีรีวิวในระบบ — เพิ่มข้อมูลในตาราง{" "}
            <code className="rounded bg-neutral-200 px-1 py-0.5 dark:bg-neutral-800">reviews</code> ของ Supabase ได้เลย
          </div>
        )}
      </section>
    </main>
  );
}
