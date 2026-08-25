import Link from "next/link";

// app/reviews/[slug]/not-found.tsx
// Branded fallback UI — shown automatically when getReviewBySlug() returns
// null and page.tsx calls notFound(). Keeps the orange/white brand instead
// of a generic blank 404, per spec ("Fallback UI สวยๆ").

export default function ReviewNotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <svg viewBox="0 0 24 24" className="h-14 w-14 text-[#FF4B12]" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.4" />
        <line x1="8" y1="6" x2="16" y2="14" />
      </svg>
      <h1 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-50">
        ไม่พบรีวิวนี้แล้วนะ
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        รีวิวที่คุณตามหาอาจถูกย้ายหรือลบไปแล้ว ลองดูรีวิวร้านอาหารสุพรรณบุรี
        และที่เที่ยวสุพรรณบุรีอื่นๆ ของเราแทนได้เลย
      </p>
      <Link
        href="/"
        className="rounded-xl bg-[#FF4B12] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#B62F08]"
      >
        กลับหน้าแรก
      </Link>
    </main>
  );
}
