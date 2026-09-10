"use client";

import Image from "next/image";
import Link from "next/link";
import { CATEGORY_BADGE_CLASS, defaultCategoryLabel } from "@/lib/categories";
import type { Review } from "@/lib/supabase";
import { VideoPlayer, type VideoProvider } from "@/components/video-player";

function videoSource(review: Review): { provider: VideoProvider; url: string } | null {
  if (review.facebook_embed_url) return { provider: "facebook", url: review.facebook_embed_url };
  if (review.tiktok_embed_url) return { provider: "tiktok", url: review.tiktok_embed_url };
  if (review.youtube_embed_url) return { provider: "youtube", url: review.youtube_embed_url };
  return null;
}

function PlayBadge() {
  return (
    <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white shadow-sm">
      <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-px" fill="currentColor" aria-hidden="true">
        <polygon points="8,5 19,12 8,19" />
      </svg>
    </span>
  );
}

function PinGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/** Tap the cover to play; the stacked overlay keeps map discovery separate. */
export default function TrendingVideoCard({ review, className = "" }: { review: Review; className?: string }) {
  const source = videoSource(review);
  const badgeClass = review.category
    ? CATEGORY_BADGE_CLASS[review.category] ?? "bg-neutral-100 text-neutral-600"
    : "bg-neutral-100 text-neutral-600";
  const label = review.category ? review.category_label ?? defaultCategoryLabel(review.category) : null;
  const hasCoordinates = review.latitude != null && review.longitude != null;
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${review.latitude},${review.longitude}`
    : review.location_text
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(review.location_text)}`
      : null;

  const cover = (
    <div className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-100 text-left dark:bg-neutral-800">
      {review.cover_image ? (
        <Image
          src={review.cover_image}
          alt={review.title}
          fill
          sizes="(min-width: 640px) 11rem, 9rem"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-white">
          <span className="text-xs">วิดีโอรีวิว</span>
        </div>
      )}
      <PlayBadge />
    </div>
  );

  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-neutral-900 shadow-md transition hover:shadow-lg ${className}`}>
      {source ? (
        <VideoPlayer
          provider={source.provider}
          url={source.url}
          title={review.title}
          poster={review.cover_image}
          description={review.description}
          trigger={cover}
          triggerClassName="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FFDD00]"
        />
      ) : (
        <Link href={`/reviews/${review.slug}`} aria-label={`เปิดรีวิว: ${review.title}`} className="block">
          {cover}
        </Link>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-2.5 pt-12">
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`เปิดพิกัด ${review.title} ใน Google Maps`}
            className="pointer-events-auto inline-flex min-h-9 w-fit items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[0.7rem] font-bold text-[#B62F08] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFDD00]"
          >
            <PinGlyph />
            พิกัด
          </a>
        )}
        {label && <span className={`w-fit rounded px-1.5 py-0.5 text-[0.6rem] font-bold ${badgeClass}`}>{label}</span>}
        <span className="line-clamp-2 text-[0.78rem] font-semibold leading-snug text-white">{review.title}</span>
      </div>
    </div>
  );
}
