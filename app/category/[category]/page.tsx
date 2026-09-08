import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReviewsByCategory } from "@/lib/supabase";
import { getCategoryBySlug } from "@/lib/categories";
import ReviewCard from "@/components/review-card";
import { buildMetaDescription, MAX_META_DESCRIPTION_LENGTH } from "@/lib/seo-text";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphanburi.com";

export const revalidate = 60;
interface PageProps { params: { category: string }; }

// SEO fix (Sep 2026): this fallback description used to always append the
// fixed suffix "| ร้านอาหารสุพรรณบุรี, ที่เที่ยวสุพรรณบุรี" to EVERY category
// -- wrong keywords for a non-food/trip category like ตลาด, ที่พัก, or
// คาเฟ่ -- and had no length cap at all. Same class of bug as the one fixed
// on review pages in PR #14, just in this file. Fix: the keyword suffix now
// matches the category itself, and the whole description goes through the
// same buildMetaDescription() helper (lib/seo-text.ts) so it never exceeds
// MAX_META_DESCRIPTION_LENGTH. An admin-provided category.seo_description is
// used exactly as entered -- it isn't the templated fallback this bug was
// about, so it's left untouched.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const category = await getCategoryBySlug(params.category);
  if (!category) return { title: "ไม่พบหมวดหมู่นี้", robots: { index: false, follow: true } };
  const label = category.label;
  const description =
    category.seo_description?.trim() ||
    buildMetaDescription(
      `รวมรีวิว${label}สุพรรณบุรี พร้อมคลิปวิดีโอจาก Facebook และ TikTok อัปเดตล่าสุด`,
      `${label}สุพรรณบุรี, รีวิวสุพรรณบุรี`,
      MAX_META_DESCRIPTION_LENGTH
    );
  return {
    alternates: { canonical: `/category/${category.slug}` },
    title: category.seo_title?.trim() || `${label}สุพรรณบุรี รวมรีวิวล่าสุด`,
    description,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const category = await getCategoryBySlug(params.category);
  if (!category) notFound();
  const reviews = await getReviewsByCategory(category.slug, 24);
  const label = category.label;
  const categoryUrl = `${SITE_URL}/category/${category.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "หน้าแรก", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: `${label}สุพรรณบุรี`, item: categoryUrl },
        ],
      },
      {
        "@type": "CollectionPage",
        name: `${label}สุพรรณบุรี`,
        url: categoryUrl,
        inLanguage: "th-TH",
        isPartOf: { "@type": "WebSite", name: "รีวิวสุพรรณบุรี", url: SITE_URL },
      },
    ],
  };
  return (
    <main className="px-4 py-8 sm:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <nav aria-label="breadcrumb" className="mb-4"><ol className="flex flex-wrap items-center gap-1 text-xs text-neutral-400"><li><a href="/" className="hover:text-[#FF4B12]">หน้าแรก</a></li><li aria-hidden="true">/</li><li aria-current="page" className="text-neutral-600 dark:text-neutral-300">{label}สุพรรณบุรี</li></ol></nav>
      <h1 className="mb-1 font-[family-name:var(--font-kanit)] text-2xl font-extrabold">{label}สุพรรณบุรี</h1>
      <p className="mb-6 text-sm text-neutral-500">{category.seo_description?.trim() || `รวมรีวิว${label}ในจังหวัดสุพรรณบุรี อัปเดตล่าสุดจากคลิปวิดีโอจริง`}</p>
      {reviews.length > 0 ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">ยังไม่มีรีวิวในหมวดหมู่นี้</div>}
    </main>
  );
}
