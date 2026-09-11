import type { Metadata } from "next";
import Link from "next/link";
import { getMustVisitReviews } from "@/lib/supabase";
import { MUST_VISIT_COLLECTION_LIMIT } from "@/lib/must-visit";
import { MustVisitCard, MustVisitSpotlight } from "@/components/must-visit-card";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphanburi.com";
const PAGE_URL = `${SITE_URL}/must-visit-suphanburi`;
const PAGE_TITLE = "มาสุพรรณบุรีต้องแวะ | ที่กิน ที่เที่ยว คาเฟ่น่าไป";
const PAGE_DESCRIPTION = "วางแผนเที่ยวสุพรรณบุรีด้วยพิกัดคัดสรร ร้านอาหาร คาเฟ่ ที่เที่ยว และตลาดที่ควรแวะ พร้อมคลิปรีวิวจริงและแผนที่";

export const revalidate = 60;
export const metadata: Metadata = {
  alternates: { canonical: "/must-visit-suphanburi" },
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  openGraph: {
    type: "website",
    url: "/must-visit-suphanburi",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "มาสุพรรณบุรีต้องแวะ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default async function MustVisitSuphanburiPage() {
  const reviews = await getMustVisitReviews(MUST_VISIT_COLLECTION_LIMIT);
  const [spotlight, ...moreReviews] = reviews;
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "หน้าแรก", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "มาสุพรรณบุรีต้องแวะ", item: PAGE_URL }] },
    { "@type": "CollectionPage", name: "มาสุพรรณบุรีต้องแวะ", description: "พิกัดคัดสรรร้านอาหาร คาเฟ่ ที่เที่ยว และตลาดในจังหวัดสุพรรณบุรี", url: PAGE_URL, inLanguage: "th-TH", about: { "@type": "AdministrativeArea", name: "จังหวัดสุพรรณบุรี" } },
    { "@type": "ItemList", name: "พิกัดมาสุพรรณบุรีต้องแวะ", numberOfItems: reviews.length, itemListElement: reviews.map((review, index) => ({ "@type": "ListItem", position: index + 1, name: review.title, url: `${SITE_URL}/reviews/${review.slug}` })) },
  ] };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />

      <section className="relative overflow-hidden bg-[#FFF2ED] px-4 py-9 sm:px-8 sm:py-14">
        <div aria-hidden="true" className="absolute -right-16 top-0 h-64 w-64 rounded-full bg-[#FFDD00]/35 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <nav aria-label="breadcrumb" className="mb-6 text-xs text-[#9A3D22]">
            <Link href="/" className="rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08]">หน้าแรก</Link>
            <span aria-hidden="true" className="px-1.5">/</span>
            <span aria-current="page">มาสุพรรณบุรีต้องแวะ</span>
          </nav>
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-end">
            <div>
              <span className="inline-flex rounded-full bg-[#FFDD00] px-3 py-1 text-xs font-extrabold text-[#3B2500]">SUPHANBURI LOCAL PICKS · {reviews.length} พิกัด</span>
              <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-kanit)] text-4xl font-extrabold leading-tight text-[#7E260C] sm:text-5xl">มาสุพรรณบุรีต้องแวะ</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#672A19]">เลือกพิกัดน่าแวะได้ง่ายขึ้น จากสถานที่ที่ทีมรีวิวสุพรรณบุรีคัดมาแล้ว พร้อมดูวิดีโอและเปิดแผนที่ต่อได้ทันที</p>
            </div>
            <form action="/search" method="GET" className="rounded-2xl border border-[#E8BCAA] bg-white/85 p-3 shadow-sm backdrop-blur">
              <label htmlFor="must-visit-search" className="block px-1 pb-2 text-xs font-extrabold text-[#7E260C]">หาพิกัดที่ตรงกับทริปของคุณ</label>
              <div className="flex gap-2">
                <input id="must-visit-search" name="q" type="search" placeholder="ร้าน คาเฟ่ หรือที่เที่ยว" className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#E8BCAA] bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#B62F08] focus:outline-none focus:ring-2 focus:ring-[#B62F08]/25" />
                <button type="submit" className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-[#DA3D0D] px-4 text-sm font-extrabold text-white transition hover:bg-[#B62F08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08] focus-visible:ring-offset-2">ค้นหา</button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-9 sm:px-8 sm:py-12">
        {spotlight ? (
          <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold tracking-wide text-[#B62F08]">เริ่มทริปจากพิกัดนี้</p>
                <h2 className="mt-1 font-[family-name:var(--font-kanit)] text-2xl font-extrabold text-[#3B1C12]">พิกัดเด่นที่ต้องแวะ</h2>
              </div>
              <span className="text-sm text-[#7E4A3B]">ดูวิดีโอ · อ่านรีวิว · เปิดพิกัด</span>
            </div>
            <MustVisitSpotlight review={spotlight} />

            {moreReviews.length > 0 && (
              <div className="mt-12">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold tracking-wide text-[#B62F08]">เลือกเพิ่มตามแผนของคุณ</p>
                    <h2 className="mt-1 font-[family-name:var(--font-kanit)] text-2xl font-extrabold text-[#3B1C12]">พิกัดถัดไปที่น่าแวะ</h2>
                  </div>
                  <Link href="/search" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-extrabold text-[#B62F08] underline underline-offset-4 hover:bg-[#FFF2ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08]">ค้นหาพิกัดอื่น</Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {moreReviews.map((review, index) => <MustVisitCard key={review.id} review={review} rank={index + 2} />)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#E5B8A7] bg-[#FFF8F5] p-10 text-center text-sm text-[#8A4A35]">กำลังคัดเลือกพิกัดที่ต้องแวะ เพิ่มรายการแรกได้จากหลังบ้าน</div>
        )}

        <aside className="mt-12 rounded-3xl bg-[#FFF2ED] p-6 sm:p-8">
          <p className="text-xs font-extrabold tracking-wide text-[#B62F08]">หาเพิ่มตามสไตล์ทริป</p>
          <h2 className="mt-1 font-[family-name:var(--font-kanit)] text-2xl font-extrabold text-[#3B1C12]">วันนี้อยากแวะที่ไหน?</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {[{ href: "/category/food", label: "ร้านอาหาร" }, { href: "/category/cafe", label: "คาเฟ่" }, { href: "/category/trip", label: "ที่เที่ยว" }, { href: "/category/market", label: "ตลาด" }].map((item) => (
              <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center rounded-full border border-[#E5B8A7] bg-white px-4 text-sm font-bold text-[#7E260C] transition hover:border-[#B62F08] hover:bg-[#FFF8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08]">{item.label}</Link>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
