import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getReviewBySlug } from "@/lib/supabase";
import { defaultCategoryLabel } from "@/lib/categories";
import { getReviewVideoEmbedUrl, getReviewVideoSource, isMustVisitWatchPageEligible } from "@/lib/video-seo";
import { VideoPlayer } from "@/components/video-player";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.reviewsuphanburi.com";
const SITE_NAME = "รีวิวสุพรรณบุรี";

interface PageProps { params: { slug: string } }

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const review = await getReviewBySlug(params.slug);
  if (!review || !isMustVisitWatchPageEligible(review)) {
    return { title: "ไม่พบวิดีโอนี้", robots: { index: false, follow: true } };
  }
  const url = `${SITE_URL}/videos/${review.slug}`;
  const description = review.description ?? `ชมวิดีโอรีวิว ${review.title} พร้อมข้อมูลสำหรับวางแผนแวะในสุพรรณบุรี`;
  return {
    title: `วิดีโอรีวิว ${review.title}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "video.other",
      url,
      title: `วิดีโอรีวิว ${review.title} | ${SITE_NAME}`,
      description,
      images: [{ url: review.cover_image!, alt: review.title }],
    },
    twitter: { card: "summary_large_image", title: `วิดีโอรีวิว ${review.title}`, description, images: [review.cover_image!] },
  };
}

export default async function MustVisitVideoPage({ params }: PageProps) {
  const review = await getReviewBySlug(params.slug);
  if (!review || !isMustVisitWatchPageEligible(review)) notFound();

  const source = getReviewVideoSource(review)!;
  const playerUrl = getReviewVideoEmbedUrl(source)!;
  const pageUrl = `${SITE_URL}/videos/${review.slug}`;
  const categoryLabel = review.category_label ?? (review.category ? defaultCategoryLabel(review.category) : "สุพรรณบุรี");
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VideoObject",
        "@id": `${pageUrl}#video`,
        name: review.title,
        description: review.description ?? `วิดีโอรีวิว ${review.title} ในจังหวัดสุพรรณบุรี`,
        thumbnailUrl: [review.cover_image],
        uploadDate: review.video_published_at ?? review.created_at,
        embedUrl: playerUrl,
        isFamilyFriendly: true,
        inLanguage: "th-TH",
        mainEntityOfPage: pageUrl,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "หน้าแรก", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "มาสุพรรณบุรีต้องแวะ", item: `${SITE_URL}/must-visit-suphanburi` },
          { "@type": "ListItem", position: 3, name: review.title, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-12 pt-5 sm:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <nav aria-label="breadcrumb" className="mb-5 text-xs text-neutral-500">
        <Link href="/" className="hover:text-[#FF4B12]">หน้าแรก</Link><span aria-hidden="true" className="px-1.5">/</span>
        <Link href="/must-visit-suphanburi" className="hover:text-[#FF4B12]">มาสุพรรณบุรีต้องแวะ</Link><span aria-hidden="true" className="px-1.5">/</span>
        <span aria-current="page">{review.title}</span>
      </nav>

      <article>
        <p className="text-xs font-extrabold tracking-wide text-[#B62F08]">วิดีโอพิกัดที่ต้องแวะ · {categoryLabel}</p>
        <h1 className="mt-2 font-[family-name:var(--font-kanit)] text-3xl font-extrabold leading-tight text-[#3B1C12] sm:text-4xl">{review.title}</h1>
        <p className="mt-3 text-sm leading-7 text-neutral-600">ชมวิดีโอรีวิวแบบเต็มหน้า พร้อมข้อมูลสำหรับวางแผนแวะในสุพรรณบุรี</p>

        <div className="mt-7">
          <VideoPlayer provider={source.provider} url={source.url} title={review.title} poster={review.cover_image} description={review.description} inline />
        </div>

        {review.description && (
          <section className="mt-8 border-t border-neutral-100 pt-6" aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="text-lg font-extrabold text-[#3B1C12]">สรุปจากวิดีโอ</h2>
            <p className="mt-2 text-[0.95rem] leading-[1.8] text-neutral-600">{review.description}</p>
          </section>
        )}

        {review.location_text && (
          <section className="mt-6 border-t border-neutral-100 pt-6" aria-labelledby="location-heading">
            <h2 id="location-heading" className="text-lg font-extrabold text-[#3B1C12]">ข้อมูลพิกัด</h2>
            <p className="mt-2 text-sm leading-7 text-neutral-600">{review.location_text}</p>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/reviews/${review.slug}`} className="inline-flex min-h-11 items-center rounded-xl bg-[#DA3D0D] px-4 text-sm font-extrabold text-white hover:bg-[#B62F08]">อ่านรีวิวฉบับเต็ม</Link>
          <Link href="/must-visit-suphanburi" className="inline-flex min-h-11 items-center rounded-xl border border-[#E5B8A7] px-4 text-sm font-extrabold text-[#8A381F] hover:bg-[#FFF2ED]">ดูพิกัดต้องแวะทั้งหมด</Link>
        </div>
      </article>
    </main>
  );
}
