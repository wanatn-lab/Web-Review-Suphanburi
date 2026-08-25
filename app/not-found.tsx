import Link from "next/link";

// app/not-found.tsx
// Global fallback UI — Next.js renders this automatically whenever a route
// calls notFound() (เช่น app/reviews/[slug]/page.tsx เมื่อหา slug ไม่เจอ)
// หรือผู้ใช้เปิด URL ที่ไม่มีอยู่จริงในเว็บ โทนสีส้ม/ขาวตรงกับแบรนด์
// "รีวิวสุพรรณบุรี" — ไม่ใช่หน้า 404 เปล่าๆ ของเบราว์เซอร์

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-white px-6 py-16 text-center dark:bg-neutral-950">
      <svg
        viewBox="0 0 24 24"
        className="h-14 w-14 text-[#FF4B12]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.4" />
        <line x1="8" y1="6" x2="16" y2="14" />
      </svg>
      <h1 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-50">
        ไม่พบหน้านี้แล้วนะ
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        หน้าที่คุณตามหาอาจถูกย้ายหรือลบไปแล้ว ลองดูรีวิวร้านอาหารสุพรรณบุรี
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
