import type { Metadata } from "next";
import Link from "next/link";
import { getMustVisitReviews } from "@/lib/supabase";
import ReviewCard from "@/components/review-card";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphanburi.com";
const PAGE_URL = `${SITE_URL}/must-visit-suphanburi`;

export const revalidate = 60;
export const metadata: Metadata = {
  alternates: { canonical: "/must-visit-suphanburi" },
  title: "มาสุพรรณบุรีต้องแวะ: ที่กิน ที่เที่ยว คาเฟ่ และตลาดน่าไป",
  description: "วางแผนเที่ยวสุพรรณบุรีด้วยพิกัดคัดสรร ร้านอาหาร คาเฟ่ ที่เที่ยว และตลาดที่ควรแวะ พร้อมคลิปรีวิวจริงและแผนที่",
};

export default async function MustVisitSuphanburiPage() {
  const reviews = await getMustVisitReviews(48);
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "หน้าแรก", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "มาสุพรรณบุรีต้องแวะ", item: PAGE_URL }] },
    { "@type": "CollectionPage", name: "มาสุพรรณบุรีต้องแวะ", description: "พิกัดคัดสรรร้านอาหาร คาเฟ่ ที่เที่ยว และตลาดในจังหวัดสุพรรณบุรี", url: PAGE_URL, inLanguage: "th-TH", about: { "@type": "AdministrativeArea", name: "จังหวัดสุพรรณบุรี" } },
    { "@type": "ItemList", name: "พิกัดมาสุพรรณบุรีต้องแวะ", numberOfItems: reviews.length, itemListElement: reviews.map((review, index) => ({ "@type": "ListItem", position: index + 1, name: review.title, url: `${SITE_URL}/reviews/${review.slug}` })) },
  ] };
  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <section className="bg-[#FFF2ED] px-4 py-9 sm:px-8 sm:py-12"><div className="mx-auto max-w-5xl"><nav aria-label="breadcrumb" className="mb-5 text-xs text-[#9A3D22]"><Link href="/" className="hover:underline">หน้าแรก</Link><span aria-hidden="true" className="px-1.5">/</span><span aria-current="page">มาสุพรรณบุรีต้องแวะ</span></nav><span className="inline-flex rounded-full bg-[#FFDD00] px-3 py-1 text-xs font-extrabold text-[#3B2500]">SUPHANBURI LOCAL PICKS</span><h1 className="mt-3 max-w-3xl font-[family-name:var(--font-kanit)] text-3xl font-extrabold leading-tight text-[#7E260C] sm:text-5xl">มาสุพรรณบุรีต้องแวะ</h1><p className="mt-3 max-w-2xl text-base leading-relaxed text-[#672A19]">รวมพิกัดที่กิน ที่เที่ยว คาเฟ่ และตลาดน่าไปในสุพรรณบุรี คัดเลือกจากรีวิวจริง พร้อมเปิดแผนที่ไปตามรอยได้ทันที</p></div></section>
    <section className="mx-auto max-w-5xl px-4 py-9 sm:px-8 sm:py-12"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-[family-name:var(--font-kanit)] text-2xl font-extrabold">พิกัดคัดสรร</h2><p className="mt-1 text-sm text-neutral-500">เรียงลำดับโดยทีมรีวิวสุพรรณบุรี</p></div><Link href="/search" className="text-sm font-bold text-[#B62F08] underline underline-offset-4">ค้นหาพิกัดอื่น</Link></div>{reviews.length > 0 ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <div className="rounded-2xl border border-dashed border-[#E5B8A7] bg-[#FFF8F5] p-10 text-center text-sm text-[#8A4A35]">กำลังคัดเลือกพิกัดที่ต้องแวะ เพิ่มรายการแรกได้จากหลังบ้าน</div>}<div className="mt-10 max-w-3xl border-t border-neutral-200 pt-7 text-base leading-8 text-neutral-600"><h2 className="font-[family-name:var(--font-kanit)] text-xl font-extrabold text-neutral-900">เที่ยวสุพรรณบุรี เริ่มจากพิกัดที่ใช่</h2><p className="mt-2">สุพรรณบุรีมีทั้งร้านอร่อย คาเฟ่ริมทาง วัดและแหล่งท่องเที่ยว รวมถึงตลาดท้องถิ่นในหลายอำเภอ รายการนี้ช่วยให้เลือกจุดแวะที่เหมาะกับทริปของคุณก่อนลงรายละเอียดของแต่ละสถานที่</p></div></section>
  </main>;
}
