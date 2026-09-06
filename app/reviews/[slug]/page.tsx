import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getReviewBySlug } from "@/lib/supabase";
import { CATEGORY_LABEL } from "@/lib/categories";
import { VideoPlayer } from "@/components/video-player";

// app/reviews/[slug]/page.tsx
// Review Detail Page — Server Component (SSR), Dynamic Route.
// Fetches from Supabase on the server, builds generateMetadata + JSON-LD
// (LocalBusiness, Geo-SEO) server-side, and lazy-loads every embed
// (Facebook video, TikTok video, Google Map) so first paint stays fast.
//
// NOTE (Next.js 15+): `params` becomes a Promise in Next 15 — change every
// `params.slug` below to `const { slug } = await params;` if you're on 15.
// This file targets the Next.js 14 App Router baseline.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphan.com";
const SITE_NAME = "รีวิวสุพรรณบุรี";

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
      title: `ไม่พบรีวิวนี้ | ${SITE_NAME}`,
      description:
        "ไม่พบข้อมูลรีวิวที่คุณค้นหา กรุณาเลือกดูรีวิวร้านอาหารสุพรรณบุรี และที่เที่ยวสุพรรณบุรีอื่นๆ ของเราแทนได้",
      robots: { index: false, follow: true },
    };
  }

  const baseDescription =
    review.description ?? `รีวิว ${review.title} อัปเดตล่าสุด พร้อมพิกัดและวิดีโอรีวิวจริงจากสุพรรณบุรี`;
  // Geo-SEO keyword injection — required by spec.
  const description = `${baseDescription} | ร้านอาหารสุพรรณบุรี, ที่เที่ยวสุพรรณบุรี`;
  const title = `${review.title} | ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}/reviews/${review.slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
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
      title,
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
  const hasGeo = review.latitude != null && review.longitude != null;

  // โชว์วิดีโอ "ช่องทางเดียว" — เลือก Facebook ก่อนถ้ามี ไม่งั้นใช้ TikTok เพราะ
  // ในทางปฏิบัติมีแค่ช่องทางเดียวที่ถูก sync/กรอกไว้อยู่แล้ว ต่อให้มีทั้งคู่ก็ไม่ต้อง
  // โชว์ 2 กล่อง — ไม่มีวิดีโอเลยก็ไม่ต้องมีกล่อง placeholder หลอกๆ
  const videoProvider: "facebook" | "tiktok" | null = review.facebook_embed_url
    ? "facebook"
    : review.tiktok_embed_url
      ? "tiktok"
      : null;
  const videoUrl =
    videoProvider === "facebook"
      ? review.facebook_embed_url
      : videoProvider === "tiktok"
        ? review.tiktok_embed_url
        : null;

  // ใช้ google_map_embed_url ที่เก็บไว้ก่อน ถ้าไม่มีค่อย fallback ไปสร้างจาก lat/lng
  const mapSrc =
    review.google_map_embed_url ??
    (hasGeo ? `https://www.google.com/maps?q=${review.latitude},${review.longitude}&z=16&output=embed` : null);
  const directionsUrl = hasGeo
    ? `https://maps.google.com/?q=${review.latitude},${review.longitude}`
    : null;

  // ---- JSON-LD: LocalBusiness สำหรับ Geo-SEO เจาะจงพื้นที่สุพรรณบุรี ----
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: review.title,
    description: review.description ?? `รีวิว ${review.title} จังหวัดสุพรรณบุรี`,
    url: canonicalUrl,
    image: review.cover_image ?? undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: "สุพรรณบุรี",
      addressRegion: "สุพรรณบุรี",
      addressCountry: "TH",
    },
  };
  if (hasGeo) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: review.latitude,
      longitude: review.longitude,
    };
  }
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
                {CATEGORY_LABEL[review.category] ?? review.category}สุพรรณบุรี
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
              />
            </div>
          )}

          <header className="flex flex-col items-center gap-3 pb-5 text-center">
            <span className="inline-block rounded-md bg-[#FFE3D6] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#B62F08]">
              {review.category ? `${CATEGORY_LABEL[review.category] ?? review.category}สุพรรณบุรี` : "รีวิวสุพรรณบุรี"}
            </span>
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
          </header>

          {review.description && (
            <p className="pb-6 text-[0.95rem] leading-[1.8] text-neutral-600 dark:text-neutral-300">
              {review.description}
            </p>
          )}

          {/* Geo-location signal: Google Maps embed, lazy-loaded */}
          {mapSrc && (
            <div className="pb-6">
              <div className="aspect-video overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                <iframe
                  src={mapSrc}
                  title={`แผนที่ ${review.title}`}
                  loading="lazy"
                  className="h-full w-full border-0"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          )}

          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#FF4B12] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#B62F08]"
            >
              <PinIcon />
              นำทางไปที่นี่ (Google Maps)
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
