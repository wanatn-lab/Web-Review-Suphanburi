"use client";

import Image from "next/image";
import { useState } from "react";
import { youtubeThumbnailCandidates } from "@/lib/youtube-thumbnails";

export function YouTubeThumbnail({
  videoId,
  fallbackSrc,
  alt,
  className,
  sizes,
  fill = false,
  width = 64,
  height = 96,
}: {
  videoId: string;
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}) {
  const [maxresCandidate, ...knownFallbackCandidates] = youtubeThumbnailCandidates(videoId);
  // A stored maxresdefault URL may be the small placeholder described above.
  // Try reliable standard YouTube endpoints first, then the stored URL, and
  // only use maxresdefault as the final fallback.
  const candidates = Array.from(new Set([
    ...(fallbackSrc && fallbackSrc !== maxresCandidate && !fallbackSrc.endsWith("/maxresdefault.jpg") ? [fallbackSrc] : []),
    ...knownFallbackCandidates,
    fallbackSrc,
    maxresCandidate,
  ].filter((source): source is string => Boolean(source))));
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = candidates[sourceIndex];

  if (!source) {
    return <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-[#FF4B12] dark:bg-neutral-800" aria-label={alt}>ภาพปกวิดีโอ</div>;
  }

  return fill ? (
    <Image
      src={source}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      onError={() => setSourceIndex((current) => Math.min(current + 1, candidates.length))}
    />
  ) : (
    <Image
      src={source}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setSourceIndex((current) => Math.min(current + 1, candidates.length))}
    />
  );
}
