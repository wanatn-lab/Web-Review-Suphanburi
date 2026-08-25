"use client";

// components/share-button.tsx
// ปุ่มแชร์สีเหลือง (.btn-sm.share ตาม UI ต้นแบบ) — ใช้ Web Share API บนมือถือ
// (เปิด native share sheet ของ Facebook/Line/Messenger ได้ทันที) และ fallback
// เป็น "คัดลอกลิงก์" บนเดสก์ท็อปที่ไม่รองรับ navigator.share.
//
// ต้องเป็น Client Component เพราะต้องเรียก navigator.share() ตอน user คลิก
// (จะพังถ้าเรียกฝั่ง Server) — วางไว้เป็นไฟล์แยกเพื่อให้ ReviewCard ที่เหลือ
// (การ์ดหลัก) ยังเป็น Server Component ได้ต่อไป ไม่ต้องแปลงทั้งไฟล์เป็น client.

import { useState } from "react";

export default function ShareButton({
  title,
  url,
  compact = false,
}: {
  title: string;
  url: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare(e: React.MouseEvent) {
    // กัน <Link> รอบนอก (การ์ดทั้งใบคือลิงก์ไปหน้ารีวิว) โดนคลิกทะลุไปด้วย
    e.preventDefault();
    e.stopPropagation();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // ผู้ใช้กด "ยกเลิก" บน share sheet — ไม่ต้องทำอะไรต่อ
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // เบราว์เซอร์เก่ามากไม่รองรับ clipboard API — เงียบไว้ ไม่ทำ UI พัง
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#FFDD00] bg-[#FFDD00] font-semibold text-[#5C4400] transition hover:brightness-95 ${
        compact ? "px-2.5 py-1 text-[0.7rem]" : "px-3 py-1.5 text-xs"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="18" cy="5" r="2.4" />
        <circle cx="6" cy="12" r="2.4" />
        <circle cx="18" cy="19" r="2.4" />
        <line x1="8.2" y1="10.8" x2="15.8" y2="6.2" />
        <line x1="8.2" y1="13.2" x2="15.8" y2="17.8" />
      </svg>
      {copied ? "คัดลอกแล้ว!" : "แชร์"}
    </button>
  );
}
