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
  unoptimized = false,
  width = 64,
  height = 96,
}: {
  videoId: string;
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  fill?: boolean;
  unoptimized?: boolean;
  width?: number;
  height?: number;
}) {
  const [maxresCandidate, ...knownFallbackCandidates] = youtubeThumbnailCandidates(videoId);
  // Start with YouTube's highest-resolution endpoint, then fall back through
  // the standard sizes if that endpoint is unavailable or returns a placeholder.
  const candidates = Array.from(new Set([
    maxresCandidate,
    ...knownFallbackCandidates,
    ...(fallbackSrc && fallbackSrc !== maxresCandidate ? [fallbackSrc] : []),
  ].filter((source): source is string => Boolean(source))));
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = candidates[sourceIndex];

  const advanceSource = () => {
    setSourceIndex((current) => Math.min(current + 1, candidates.length));
  };

  const handleLoad = (image: HTMLImageElement) => {
    // YouTube can return a successful but tiny placeholder for maxresdefault.
    // Skip it while a larger fallback is still available.
    if (unoptimized && image.naturalWidth < 640 && sourceIndex < candidates.length - 1) {
      advanceSource();
    }
  };

  if (!source) {
    return <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-[#FF4B12] dark:bg-neutral-800" aria-label={alt}>ภาพปกวิดีโอ</div>;
  }

  return fill ? (
    <Image
      src={source}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={unoptimized}
      className={className}
      onError={advanceSource}
      onLoad={(event) => handleLoad(event.currentTarget)}
    />
  ) : (
    <Image
      src={source}
      alt={alt}
      width={width}
      height={height}
      unoptimized={unoptimized}
      className={className}
      onError={advanceSource}
      onLoad={(event) => handleLoad(event.currentTarget)}
    />
  );
}
