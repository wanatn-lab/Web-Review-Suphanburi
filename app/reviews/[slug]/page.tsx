import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getReviewBySlug } from "@/lib/supabase";
import { defaultCategoryLabel } from "@/lib/categories";
import { VideoPlayer } from "@/components/video-player";
import { buildMetaDescription, MAX_META_DESCRIPTION_LENGTH } from "@/lib/seo-text";
import { isSuphanBuriCoordinate } from "@/lib/location-validation";

// app/reviews/[slug]/page.tsx
// Review Detail Page — Server Component (SSR), Dynamic Route.
// Fetches from Supabase on the server, builds generateMetadata + JSON-LD
// (LocalBusiness, Geo-SEO) server-side, and lazy-loads every embed
// (Facebook video, TikTok video, Google Map) so first paint stays fast.
//
// NOTE (Next.js 15+): `params` becomes a Promise in Next 15 — change every
// `params.slug` below to `const { slug } = await params;` if you're on 15.
// This file targets the Next.js 14 App Router baseline.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphanburi.com";
const SITE_NAME = "รีวิวสุพรรณบุรี";

function seoKeywordSuffix(category: string | null): string {
  const suffixByCategory: Record<string, string> = {
    food: "ร้านอาหารสุพรรณบุรี",
    cafe: "คาเฟ่สุพรรณบุรี",
    trip: "ที่เที่ยวสุพรรณบุรี",
    stay: "ที่พักสุพรรณบุรี",
    market: "ตลาดสุพรรณบุรี",
    temple: "วัดสุพรรณบุรี",
    "street-food": "สตรีทฟู้ดสุพรรณบุรี",
    education: "โรงเรียนสุพรรณบุรี",
    property: "บ้านสุพรรณบุรี",
    event: "งานประจำจังหวัดสุพรรณบุรี",
  };

  return (category && suffixByCategory[category]) ?? "รีวิวสุพรรณบุรี";
}

// SEO fix (Sep 2026): app/layout.tsx already defines `title.template =
// "%s | รีวิวสุพรรณบุรี"`, which Next.js applies automatically to every
// page's `metadata.title`. This file used to build `title` as
// `${review.title} | ${SITE_NAME}` itself, so the template appended the
// site name a *second* time -> "...ชื่อรีวิว | รีวิวสุพรรณบุรี | รีวิวสุพรรณบุรี".
// Fix: `metadata.title` below is now the bare review title only (the
// template adds the site name once). `openGraph.title` / `twitter.title`
// are NOT covered by `title.template` (Next only applies it to
// `metadata.title`), so those still get the full "title | site name" form
// built separately as `socialTitle`.
//
// The meta-description truncation helpers (`buildMetaDescription`,
// `MAX_META_DESCRIPTION_LENGTH`) live in lib/seo-text.ts, not here, so they
// can be unit-tested without pulling in next/navigation + Supabase.

// revalidate = 60: กันปัญหาหน้า static ค้างข้อมูลเก่า (ดูคำอธิบายเต็มใน app/page.tsx)
// สำคัญมากสำหรับหน้านี้ เพราะรีวิวใหม่จาก Facebook auto-sync ต้องขึ้นหน้าเว็บได้เอง
export const revalidate = 60;

interface PageProps {
    params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const review = await getReviewBySlug(params.slug);
  
    if (!review) {
          return {
                  // Bare title -- root layout's title.template adds " | รีวิวสุพรรณบุรี".
                  title: "ไม่พบรีวิวนี้",
                  description:
                            "ไม่พบข้อมูลรีวิวที่คุณค้นหา กรุณาเลือกดูรีวิวร้านอาหารสุพรรณบุรี และที่เที่ยวสุพรรณบุรีอื่นๆ ของเราแทนได้",
                  robots: { index: false, follow: true },
          };
    }
  
    const rawDescription =
          review.description ?? `รีวิว ${review.title} อัปเดตล่าสุด พร้อมพิกัดและวิดีโอรีวิวจริงจากสุพรรณบุรี`;
    const description = buildMetaDescription(
          rawDescription,
          seoKeywordSuffix(review.category),
          MAX_META_DESCRIPTION_LENGTH
        );
    // Bare title -- root layout's title.template adds " | รีวิวสุพรรณบุรี" once.
    const title = review.title;
    // openGraph/twitter titles are NOT run through title.template, so they
    // keep the full "review title | site name" form for social shares.
    const socialTitle = `${review.title} | ${SITE_NAME}`;
    const canonicalUrl = `${SITE_URL}/reviews/${review.slug}`;
  
    return {
          title,
          description,
          alternates: { canonical: canonicalUrl },
          openGraph: {
                  title: socialTitle,
                  description,
                  url: canonicalUrl,
                  siteName: SITE_NAME,
                  locale: "th_TH",
                  type: "article",
                  images: review.cover_image
                            ? [{ url: review.cover_image, width: 1200, height: 630, alt: review.title }]
                            : [],
          },
          twitter: {
                  card: review.cover_image ? "summary_large_image" : "summary",
                  title: socialTitle,
                  description,
                  images: review.cover_image ? [review.cover_image] : [],
          },
    };
}

export default async function ReviewDetailPage({ params }: PageProps) {
  const review = await getReviewBySlug(params.slug);

  if (!review) {
    // ไม่พบข้อมูล -> Next.js render app/not-found.tsx (โทนส้ม/ขาวตรงแบรนด์)
    notFound();
  }

  const canonicalUrl = `${SITE_URL}/reviews/${review.slug}`;
  const hasGeo = isSuphanBuriCoordinate(review.latitude, review.longitude);

  // โชว์วิดีโอ "ช่องทางเดียว" — เลือก Facebook ก่อน ตามด้วย TikTok หรือ YouTube เพราะ
  // ในทางปฏิบัติมีแค่ช่องทางเดียวที่ถูก sync/กรอกไว้อยู่แล้ว ต่อให้มีทั้งคู่ก็ไม่ต้อง
  // โชว์ 2 กล่อง — ไม่มีวิดีโอเลยก็ไม่ต้องมีกล่อง placeholder หลอกๆ
  const videoProvider: "facebook" | "tiktok" | "youtube" | null = review.facebook_embed_url
    ? "facebook"
    : review.tiktok_embed_url
      ? "tiktok"
      : review.youtube_embed_url
        ? "youtube"
        : null;
  const videoUrl =
    videoProvider === "facebook"
      ? review.facebook_embed_url
      : videoProvider === "tiktok"
        ? review.tiktok_embed_url
        : videoProvider === "youtube"
          ? review.youtube_embed_url
          : null;

  // Use a direct Maps link instead of an embedded map. It gives the reader a
  // clear next action and avoids repeating a long address inside the article.
  const directionsUrl = hasGeo
    ? `https://maps.google.com/?q=${review.latitude},${review.longitude}`
    : review.location_text
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(review.location_text)}`
      : null;

  // Use the most specific place type the visible category supports.  A temple,
  // market, or attraction is not a LocalBusiness, and misleading markup is
  // less useful to Google than a smaller but accurate entity description.
  const placeType =
    review.category === "food"
      ? "Restaurant"
      : review.category === "cafe"
        ? "CafeOrCoffeeShop"
        : review.category === "stay"
          ? "LodgingBusiness"
          : review.category === "market"
            ? "ShoppingCenter"
            : review.category === "trip"
              ? "TouristAttraction"
              : review.category === "temple"
                ? "PlaceOfWorship"
                : "Place";
  const placeId = `${canonicalUrl}#place`;
  const placeSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@id": placeId,
    "@type": placeType,
    name: review.title,
    description: review.description ?? `รีวิว ${review.title} จังหวัดสุพรรณบุรี`,
    url: canonicalUrl,
    image: review.cover_image ?? undefined,
  };
  if (review.location_text) {
    placeSchema.address = {
      "@type": "PostalAddress",
      streetAddress: review.location_text,
      addressRegion: "สุพรรณบุรี",
      addressCountry: "TH",
    };
  }
  if (hasGeo) {
    placeSchema.geo = {
      "@type": "GeoCoordinates",
      latitude: review.latitude,
      longitude: review.longitude,
    };
  }
  const articleSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#review`,
    mainEntityOfPage: canonicalUrl,
    headline: review.title,
    description: review.description ?? `รีวิว ${review.title} จังหวัดสุพรรณบุรี`,
    image: review.cover_image ?? undefined,
    datePublished: review.created_at,
    dateModified: review.updated_at,
    inLanguage: "th-TH",
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    about: { "@id": placeId },
  };
  const jsonLd = { "@context": "https://schema.org", "@graph": [articleSchema, placeSchema] };
  // กัน "</script>" ที่อาจแฝงมาในข้อมูล ไม่ให้หลุดออกจาก script tag
  const jsonLdString = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />

      <nav aria-label="breadcrumb" className="px-4 pt-4 sm:px-8">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-neutral-400">
          <li className="flex items-center gap-1">
            <Link href="/" className="hover:text-[#FF4B12]">
              หน้าแรก
            </Link>
            <span aria-hidden="true">/</span>
          </li>
          {review.category && (
            <li className="flex items-center gap-1">
              <Link href={`/category/${review.category}`} className="hover:text-[#FF4B12]">
                {review.category_label ?? defaultCategoryLabel(review.category)}สุพรรณบุรี
              </Link>
              <span aria-hidden="true">/</span>
            </li>
          )}
          <li aria-current="page" className="text-neutral-600 dark:text-neutral-300">
            {review.title}
          </li>
        </ol>
      </nav>

      <main>
        <article className="mx-auto max-w-2xl px-4 pb-10 pt-4 sm:px-8">
          {/* วิดีโอรีวิวขึ้นก่อนเป็นอย่างแรก แบบเดียวกับเปิดคลิปสั้นบนมือถือ — แตะแล้ว
              เต็มจอ คำอธิบายอยู่ด้านล่างสุดในโหมดเต็มจอด้วย ถ้าไม่มีวิดีโอเลยก็ไม่ต้อง
              มีกล่องเปล่าๆ ให้เห็น (VideoPlayer คืน null เอง) */}
          {videoProvider && videoUrl && (
            <div className="pb-6">
              <VideoPlayer
                provider={videoProvider}
                url={videoUrl}
                title={review.title}
                poster={review.cover_image}
                description={review.description}
                mapsUrl={directionsUrl}
              />
            </div>
          )}

          <header className="flex flex-col items-center gap-3 pb-5 text-center">
            <div className="flex flex-wrap justify-center gap-2">
              <span className="inline-block rounded-md bg-[#FFE3D6] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#B62F08]">
                {review.category ? `${review.category_label ?? defaultCategoryLabel(review.category)}สุพรรณบุรี` : "รีวิวสุพรรณบุรี"}
              </span>
              {review.is_must_visit && (
                <span className="inline-block rounded-md bg-[#FFDD00] px-2.5 py-1 text-xs font-extrabold tracking-wide text-[#5A2600]">
                  ร้านต้องแวะ · มาสุพรรณต้องกิน
                </span>
              )}
            </div>
            <h1 className="max-w-[26ch] text-2xl font-extrabold leading-snug text-neutral-900 dark:text-neutral-50 sm:text-3xl">
              {review.title}
            </h1>
            <time dateTime={review.created_at} className="text-xs text-neutral-400">
              {new Date(review.created_at).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </time>
            {review.updated_at !== review.created_at && (
              <span className="text-xs text-neutral-400">
                อัปเดตล่าสุด {new Date(review.updated_at).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </header>

          {review.description && (
            <section className="pb-6" aria-labelledby="video-summary-heading">
              <h2 id="video-summary-heading" className="mb-2 text-base font-extrabold text-neutral-900 dark:text-neutral-50">
                สรุปจากวิดีโอรีวิว
              </h2>
              <p className="text-[0.95rem] leading-[1.8] text-neutral-600 dark:text-neutral-300">
                {review.description}
              </p>
            </section>
          )}

          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#FF4B12] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#B62F08]"
            >
              <PinIcon />
              เปิดพิกัดใน Google Maps
            </a>
          )}
        </article>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Local helper components — kept in this same file so the page stays a
// single drop-in file, per the requested file list.
// ---------------------------------------------------------------------------

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

// วิดีโอ (poster + เต็มจอเมื่อคลิก) ย้ายไปเป็น components/video-player.tsx
// ("use client") เพราะต้องใช้ useState/useEffect คุมการเปิด/ปิด modal
