"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Catches database failures from Server Components and gives visitors an
 * honest retry path instead of a false 404 or misleading empty list.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <p className="mb-2 text-sm font-bold text-[#B62F08]">ข้อมูลยังเชื่อมต่อไม่สำเร็จ</p>
      <h1 className="font-[family-name:var(--font-kanit)] text-2xl font-extrabold text-neutral-900 dark:text-neutral-50">
        ลองโหลดข้อมูลอีกครั้ง
      </h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
        ระบบยังดึงข้อมูลรีวิวไม่ได้ชั่วคราว กรุณาลองใหม่ในอีกสักครู่
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl bg-[#B62F08] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#8F2506] focus:outline-none focus:ring-2 focus:ring-[#B62F08] focus:ring-offset-2"
      >
        ลองใหม่
      </button>
    </main>
  );
}
