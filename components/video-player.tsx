"use client";

import { useEffect, useState } from "react";

// components/video-player.tsx
// วิดีโอรีวิว "ช่องทางเดียว" (Facebook หรือ TikTok — เลือกโชว์แค่อันที่มีจริง
// เพราะต่อให้มีทั้งคู่ ผู้ใช้ก็ดูจากอันเดียวอยู่ดี ไม่ต้องมีกล่อง "ยังไม่มีวิดีโอจาก
// Facebook" ว่างๆ ให้ดูรก) แสดงเป็นภาพปก + ปุ่มเล่นก่อน แตะแล้วเด้งเป็นวิดีโอ
// เต็มจอ (fixed overlay เต็มหน้าจอ) แบบเดียวกับเปิดคลิปสั้นบนมือถือ (TikTok/Reels)
// — คำอธิบายรีวิวจะอยู่ใต้วิดีโอ เลื่อนดูต่อได้ในโหมดเต็มจอด้วย
//
// ปิดได้ 3 ทาง: กดปุ่ม X, กดปุ่ม Escape, หรือคลิกพื้นหลังสีดำรอบวิดีโอ
// ล็อกการเลื่อนหน้าเว็บด้านหลัง (body scroll) ไว้ตอนเปิดเต็มจอ

type Provider = "facebook" | "tiktok" | "youtube";

function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const candidate =
      hostname === "youtu.be"
        ? url.pathname.split("/").filter(Boolean)[0]
        : hostname.endsWith("youtube.com")
          ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1]
          : null;
    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function buildEmbedSrc(provider: Provider, url: string): string | null {
  if (provider === "facebook") {
    const encoded = encodeURIComponent(url);
    return `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=476&autoplay=true`;
  }
  if (provider === "youtube") {
    const id = youtubeVideoId(url);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
  }
  // TikTok: ดึง video id จาก URL แล้วต่อเป็น embed v2 (ไม่ต้องโหลด widget.js ที่หนัก)
  const match = url.match(/video\/(\d+)/);
  return match ? `https://www.tiktok.com/embed/v2/${match[1]}` : null;
}

function PlayGlyph({ className = "h-7 w-7 translate-x-[2px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" stroke="none" aria-hidden="true">
      <polygon points="8,5 19,12 8,19" />
    </svg>
  );
}

export function VideoPlayer({
  provider,
  url,
  title,
  poster,
  description,
}: {
  provider: Provider;
  url: string;
  title: string;
  poster: string | null;
  description: string | null;
}) {
  const [open, setOpen] = useState(false);
  const embedSrc = buildEmbedSrc(provider, url);
  const isYouTube = provider === "youtube";
  const playerSize = isYouTube ? "aspect-video max-w-4xl" : "aspect-[9/16] max-w-sm sm:max-w-md";

  // ล็อก scroll ของ body ตอนเปิดเต็มจอ + รองรับปิดด้วยปุ่ม Escape
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // ลิงก์ต้นทางพัง/parse ไม่ได้ -> ไม่ต้องแสดงอะไรเลย (ไม่มีกล่องหลอกๆ)
  if (!embedSrc) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`เล่นวิดีโอรีวิว: ${title}`}
        className={`group relative mx-auto block w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-lg ${playerSize}`}
      >
        {poster ? (
          // ภาพปกจริงจาก TikTok/Facebook — ไม่ใช้ next/image เพราะเป็น URL ที่หมดอายุได้
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/35">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-[#DA3D0D] shadow-xl transition group-hover:scale-110">
            <PlayGlyph />
          </span>
        </div>
      </button>

      {open && (
        // แตะพื้นหลังสีดำ (นอกตัววิดีโอ/คำอธิบาย) เพื่อปิดได้เลย — ตัววิดีโอกับ
        // คำอธิบายกันคลิกไม่ให้ทะลุมาปิด (stopPropagation) ส่วนปุ่ม X ปิดตรงๆ
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`วิดีโอเต็มจอ: ${title}`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex flex-col bg-black"
        >
          <div className="flex flex-shrink-0 items-center justify-end p-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิดวิดีโอ"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
            <div
              className={`relative mx-auto w-full flex-shrink-0 bg-neutral-900 ${isYouTube ? "aspect-video max-w-4xl" : "aspect-[9/16] max-w-md"}`}
              onClick={(event) => event.stopPropagation()}
            >
              <iframe
                src={embedSrc}
                title={`วิดีโอรีวิวเต็มจอ: ${title}`}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            {description && (
              <p
                className="mx-auto w-full max-w-md px-4 py-5 text-sm leading-[1.8] text-neutral-200"
                onClick={(event) => event.stopPropagation()}
              >
                {description}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
