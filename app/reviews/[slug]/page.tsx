import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getReviewBySlug } from "@/lib/supabase";
import { CATEGORY_LABEL } from "@/lib/categories";
import { isSuphanBuriCoordinate } from "@/lib/location-validation";

// app/reviews/[slug]/page.tsx
// Review Detail Page — Server Component (SSR), Dynamic Route.
// Fetches from Supabase on the server, builds generateMetadata + JSON-LD
// (LocalBusiness, Geo-SEO) server-side, and lazy-loads every embed
// (Facebook video, TikTok video, Google Map) so first paint stays fast.
//
// Route parameters are awaited to match the Next.js 16 App Router API.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphanburi.com";
const SITE_NAME = "รีวิวสุพรรณบุรี";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);

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
        ? [{ url: review.cover_image, alt: review.title }]
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
  const { slug } = await params;
  const review = await getReviewBySlug(slug);

  if (!review) {
    // ไม่พบข้อมูล -> Next.js render app/not-found.tsx (โทนส้ม/ขาวตรงแบรนด์)
    notFound();
  }

  const canonicalUrl = `${SITE_URL}/reviews/${review.slug}`;
  const hasGeo = isSuphanBuriCoordinate(review.latitude, review.longitude);

  // Only use coordinates inside Suphan Buri. Older rows may contain an
  // incorrect third-party embed URL, so derive the map from validated data.
  const mapSrc = hasGeo ? `https://www.google.com/maps?q=${review.latitude},${review.longitude}&z=16&output=embed` : null;
  const directionsUrl = hasGeo
    ? `https://maps.google.com/?q=${review.latitude},${review.longitude}`
    : null;

  const schemaType =
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
              : "Place";

  // ---- JSON-LD: use a type that matches the review category. ----
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: review.title,
    description: review.description ?? `รีวิว ${review.title} จังหวัดสุพรรณบุรี`,
    url: canonicalUrl,
    image: review.cover_image ?? undefined,
  };
  if (hasGeo) {
    jsonLd.address = {
      "@type": "PostalAddress",
      addressLocality: review.location_text ?? "สุพรรณบุรี",
      addressRegion: "สุพรรณบุรี",
      addressCountry: "TH",
    };
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
        <ol className="flex flex-wrap items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
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
          <header className="flex flex-col items-center gap-3 pb-5 text-center">
            <span className="inline-block rounded-md bg-[#FFE3D6] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#B62F08]">
              {review.category ? `${CATEGORY_LABEL[review.category] ?? review.category}สุพรรณบุรี` : "รีวิวสุพรรณบุรี"}
            </span>
            <h1 className="max-w-[26ch] text-2xl font-extrabold leading-snug text-neutral-900 dark:text-neutral-50 sm:text-3xl">
              {review.title}
            </h1>
            <time dateTime={review.created_at} className="text-xs text-neutral-600 dark:text-neutral-300">
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

          {/* วิดีโอรีวิว: Facebook + TikTok — ทั้งคู่ lazy-loaded ด้วย loading="lazy" */}
          <div className="grid grid-cols-1 gap-5 pb-6 sm:grid-cols-2">
            <VideoEmbed provider="facebook" url={review.facebook_embed_url} title={review.title} />
            <VideoEmbed provider="tiktok" url={review.tiktok_embed_url} title={review.title} />
          </div>

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
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#B62F08] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#8F2506]"
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

function buildEmbedSrc(provider: "facebook" | "tiktok", url: string): string | null {
  if (provider === "facebook") {
    const encoded = encodeURIComponent(url);
    return `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=476&autoplay=false`;
  }
  // TikTok: ดึง video id จาก URL แล้วต่อเป็น embed v2 (ไม่ต้องโหลด widget.js ที่หนัก)
  const match = url.match(/video\/(\d+)/);
  return match ? `https://www.tiktok.com/embed/v2/${match[1]}` : null;
}

function VideoEmbed({
  provider,
  url,
  title,
}: {
  provider: "facebook" | "tiktok";
  url: string | null;
  title: string;
}) {
  const src = url ? buildEmbedSrc(provider, url) : null;
  const label = provider === "facebook" ? "Facebook" : "TikTok";

  // Edge case: ลิงก์ต้นทางไม่มี/พัง -> fallback UI แทน iframe ที่ว่างเปล่า
  if (!src) {
    return (
      <div
        role="img"
        aria-label={`ไม่มีวิดีโอ ${label} สำหรับ ${title}`}
        className="relative flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-gradient-to-br from-neutral-100 to-[#FFE3D6] p-4 text-center dark:border-neutral-700 dark:from-neutral-800 dark:to-[#3C2013]"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#FF4B12]" fill="none" stroke="currentColor" strokeWidth={2}>
          <polygon points="8,5 19,12 8,19" fill="currentColor" stroke="none" />
        </svg>
        <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
          ยังไม่มีวิดีโอจาก {label}
          <br />
          <span className="text-[0.65rem] text-neutral-600 dark:text-neutral-300">
            ลิงก์ต้นทางอาจถูกลบหรือเปลี่ยนแปลง
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-lg">
      <iframe
        key={src}
        src={src}
        title={`วิดีโอรีวิว (${label}): ${title}`}
        loading="lazy"
        className="absolute inset-0 h-full w-full border-0"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
