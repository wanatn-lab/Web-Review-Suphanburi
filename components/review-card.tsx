"use client";

import Image from "next/image";
import Link from "next/link";
import { CATEGORY_BADGE_CLASS, defaultCategoryLabel } from "@/lib/categories";
import PinIcon from "@/components/pin-icon";
import ShareButton from "@/components/share-button";
import { VideoPlayer, type VideoProvider } from "@/components/video-player";
import type { Review } from "@/lib/supabase";
import { isSuphanBuriCoordinate } from "@/lib/location-validation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphanburi.com";

function PlayBadge() {
  return (
    <div className="absolute right-2 top-2 z-[1] flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white">
      <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-[1px]" fill="currentColor" stroke="none" aria-hidden="true">
        <polygon points="8,5 19,12 8,19" />
      </svg>
    </div>
  );
}

function formatThaiDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


function videoSource(review: Review): { provider: VideoProvider; url: string } | null {
  if (review.facebook_embed_url) return { provider: "facebook", url: review.facebook_embed_url };
  if (review.tiktok_embed_url) return { provider: "tiktok", url: review.tiktok_embed_url };
  if (review.youtube_embed_url) return { provider: "youtube", url: review.youtube_embed_url };
  return null;
}

function Thumb({ review }: { review: Review }) {
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
      {review.cover_image ? (
        <Image
          src={review.cover_image}
          alt={review.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-[#FF4B12]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" stroke="none" aria-hidden="true">
            <polygon points="8,5 19,12 8,19" />
          </svg>
          <span className="text-[0.65rem] leading-tight text-neutral-400">
            วิดีโอรีวิว
            <br />
            lazy-loaded · 9:16
          </span>
        </div>
      )}
      <PlayBadge />
    </div>
  );
}

export default function ReviewCard({
  review,
  variant = "grid",
  className = "",
}: {
  review: Review;
  variant?: "grid" | "rail";
  className?: string;
}) {
  const badgeClass = review.category
    ? CATEGORY_BADGE_CLASS[review.category] ?? "bg-neutral-100 text-neutral-600"
    : "bg-neutral-100 text-neutral-600";
  const label = review.category ? review.category_label ?? defaultCategoryLabel(review.category) : null;
  const href = `/reviews/${review.slug}`;
  const canonicalUrl = `${SITE_URL}${href}`;
  const hasGeo = isSuphanBuriCoordinate(review.latitude, review.longitude);
  const mapsUrl = hasGeo
    ? `https://maps.google.com/?q=${review.latitude},${review.longitude}`
    : review.location_text
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(review.location_text)}`
      : null;
  const video = videoSource(review);

  if (variant === "rail") {
    return (
      <Link
        href={href}
        className={`group relative block overflow-hidden rounded-2xl shadow-md transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08] focus-visible:ring-offset-2 ${className}`}
      >
        <Thumb review={review} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex flex-col gap-1 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 pt-8">
          {label && (
            <span className={`w-fit rounded px-1.5 py-0.5 text-[0.6rem] font-bold ${badgeClass}`}>{label}</span>
          )}
          <span className="line-clamp-2 text-[0.78rem] font-semibold leading-snug text-white">{review.title}</span>
          {review.location_text && (
            <span className="inline-flex items-center gap-1 text-[0.66rem] text-[#F3D9CC]">
              <PinIcon className="h-2.5 w-2.5" />
              {review.location_text}
            </span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      <Link href={href} className="absolute inset-0 z-0" aria-label={`เปิดรายละเอียด: ${review.title}`}>
        <span className="sr-only">{review.title}</span>
      </Link>

      <div className="relative z-10">
        {video ? (
          <VideoPlayer
            provider={video.provider}
            url={video.url}
            title={review.title}
            poster={review.cover_image}
            description={review.description}
            mapsUrl={mapsUrl}
            trigger={<Thumb review={review} />}
            triggerClassName="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF4B12]"
          />
        ) : (
          <Link href={href} className="block" aria-label={`เปิดรายละเอียด: ${review.title}`}>
            <Thumb review={review} />
          </Link>
        )}
      </div>

      <div className="pointer-events-none relative z-10 flex flex-col gap-1.5 p-3">
        {label && (
          <span className={`w-fit rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${badgeClass}`}>
            {label}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-neutral-900 dark:text-neutral-50">{review.title}</h3>
        {review.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{review.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {label && <span className="text-xs font-semibold text-[#FF4B12]">#{label}สุพรรณบุรี</span>}
          <span className="text-xs font-semibold text-[#FF4B12]">#ReviewSuphan</span>
        </div>

        {(review.location_text || review.created_at) && (
          <ul className="flex flex-wrap gap-3 text-xs text-neutral-400">
            {review.location_text && (
              <li className="inline-flex items-center gap-1">
                <PinIcon className="h-3 w-3" />
                {review.location_text}
              </li>
            )}
            {review.created_at && <li>{formatThaiDate(review.created_at)}</li>}
          </ul>
        )}
      </div>

      <div className="relative z-20 mt-1 flex flex-wrap gap-2 px-3 pb-3">
        <ShareButton title={review.title} url={canonicalUrl} compact />
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-[#FF4B12] px-3 py-1 text-[0.7rem] font-semibold text-white transition hover:bg-[#B62F08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4B12] focus-visible:ring-offset-2"
          >
            <PinIcon className="h-3 w-3" color="text-white" />
            Maps
          </a>
        )}
      </div>
    </div>
  );
}
