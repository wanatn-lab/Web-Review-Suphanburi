import type { Metadata } from "next";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = {
  title: "ตั้งรหัสผ่านแอดมิน",
  robots: { index: false, follow: false },
};

export default function SetAdminPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs font-bold uppercase tracking-wider text-[#DA3D0D]">Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold">ตั้งรหัสผ่านแอดมิน</h1>
        <p className="mt-2 text-sm text-neutral-500">
          ใช้ลิงก์จากอีเมลเชิญ/รีเซ็ตรหัสผ่านที่ Supabase ส่งให้เท่านั้น
        </p>

        <SetPasswordForm />
      </section>
    </main>
  );
}
