"use client";

import Image from "next/image";
import Link from "next/link";
import { CATEGORY_BADGE_CLASS, defaultCategoryLabel } from "@/lib/categories";
import { isSuphanBuriCoordinate } from "@/lib/location-validation";
import type { Review } from "@/lib/supabase";
import PinIcon from "@/components/pin-icon";
import { VideoPlayer, type VideoProvider } from "@/components/video-player";

function videoSource(review: Review): { provider: VideoProvider; url: string } | null {
  if (review.facebook_embed_url) return { provider: "facebook", url: review.facebook_embed_url };
  if (review.tiktok_embed_url) return { provider: "tiktok", url: review.tiktok_embed_url };
  if (review.youtube_embed_url) return { provider: "youtube", url: review.youtube_embed_url };
  return null;
}

function getMapsUrl(review: Review) {
  if (isSuphanBuriCoordinate(review.latitude, review.longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${review.latitude},${review.longitude}`;
  }
  return review.location_text
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(review.location_text)}`
    : null;
}

function PlayIcon({ className = "h-5 w-5 translate-x-px" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <polygon points="8,5 19,12 8,19" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CategoryBadge({ review }: { review: Review }) {
  const label = review.category ? review.category_label ?? defaultCategoryLabel(review.category) : null;
  if (!label) return null;
  const className = CATEGORY_BADGE_CLASS[review.category ?? ""] ?? "bg-neutral-100 text-neutral-700";
  return <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-extrabold ${className}`}>{label}</span>;
}

function ReviewMedia({ review, className, priority = false }: { review: Review; className: string; priority?: boolean }) {
  const source = videoSource(review);
  const media = (
    <div className={`group relative overflow-hidden bg-[#2D160E] ${className}`}>
      {review.cover_image ? (
        <Image
          src={review.cover_image}
          alt={review.title}
          fill
          priority={priority}
          sizes={priority ? "(min-width: 1024px) 42vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"}
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#7E260C] to-[#2D160E]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
      <span className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#B62F08] shadow-lg">
        {source ? <PlayIcon /> : <ArrowIcon />}
      </span>
      <span className="absolute bottom-3 left-3 text-xs font-bold text-white/95">{source ? "แตะเพื่อเล่นวิดีโอ" : "เปิดรายละเอียด"}</span>
    </div>
  );

  if (source) {
    return (
      <VideoPlayer
        provider={source.provider}
        url={source.url}
        title={review.title}
        poster={review.cover_image}
        description={review.description}
        trigger={media}
        triggerClassName="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFDD00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2D160E]"
      />
    );
  }

  return (
    <Link href={`/reviews/${review.slug}`} aria-label={`เปิดรายละเอียด: ${review.title}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08] focus-visible:ring-offset-2">
      {media}
    </Link>
  );
}

function MapsLink({ review, compact = false }: { review: Review; compact?: boolean }) {
  const mapsUrl = getMapsUrl(review);
  if (!mapsUrl) return null;
  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFDD00] focus-visible:ring-offset-2 ${
        compact
          ? "border-[#E5B8A7] px-3 text-sm text-[#8A381F] hover:bg-[#FFF2ED]"
          : "border-white/30 bg-white/10 px-4 text-sm text-white hover:bg-white/20"
      }`}
    >
      <PinIcon className="h-4 w-4" color={compact ? "text-[#B62F08]" : "text-white"} />
      {compact ? "แผนที่" : "เปิดพิกัด"}
    </a>
  );
}

export function MustVisitSpotlight({ review }: { review: Review }) {
  return (
    <article className="relative overflow-hidden rounded-3xl bg-[#2D160E] text-white shadow-xl shadow-[#7E260C]/15">
      <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#FFDD00]/15 blur-3xl" />
      <div className="relative grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ReviewMedia review={review} priority className="aspect-[4/5] min-h-[22rem] lg:h-full lg:min-h-[32rem]" />
        <div className="flex flex-col p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-extrabold tracking-[0.16em] text-[#FFDD00]">TOP PICK · 01</span>
            <CategoryBadge review={review} />
          </div>
          <h2 className="mt-5 font-[family-name:var(--font-kanit)] text-3xl font-extrabold leading-tight sm:text-4xl">
            {review.title}
          </h2>
          {review.description && <p className="mt-4 line-clamp-3 text-sm font-medium leading-7 text-white sm:text-base">{review.description}</p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/reviews/${review.slug}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#FFDD00] px-5 text-sm font-extrabold text-[#3B2500] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2D160E]"
            >
              ดูรายละเอียดพิกัด
            </Link>
            <MapsLink review={review} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function MustVisitCard({ review, rank }: { review: Review; rank: number }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#F0D7CD] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative">
        <ReviewMedia review={review} className="aspect-[4/5]" />
        <span className="absolute left-3 top-3 rounded-full bg-[#2D160E]/90 px-2.5 py-1 text-xs font-extrabold text-white">#{String(rank).padStart(2, "0")}</span>
      </div>
      <div className="p-4">
        <CategoryBadge review={review} />
        <h3 className="mt-3 line-clamp-2 font-[family-name:var(--font-kanit)] text-lg font-extrabold leading-snug text-[#3B1C12]">{review.title}</h3>
        {review.location_text && (
          <p className="mt-2 flex min-h-10 items-start gap-1.5 text-xs leading-5 text-[#7E4A3B]">
            <PinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" color="text-[#B62F08]" />
            <span className="line-clamp-2">{review.location_text}</span>
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <Link href={`/reviews/${review.slug}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#DA3D0D] px-3 text-sm font-extrabold text-white transition hover:bg-[#B62F08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B62F08] focus-visible:ring-offset-2">ดูรีวิว</Link>
          <MapsLink review={review} compact />
        </div>
      </div>
    </article>
  );
}
