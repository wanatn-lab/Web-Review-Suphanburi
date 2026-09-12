import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ติดต่อเรา",
  description: "ติดต่อรีวิวสุพรรณบุรีเพื่อแจ้งแก้ไขข้อมูลร้านอาหาร คาเฟ่ ที่เที่ยว และวิดีโอรีวิว",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <nav aria-label="breadcrumb" className="mb-5 text-xs text-neutral-400"><Link href="/" className="hover:text-[#FF4B12]">หน้าแรก</Link><span aria-hidden="true"> / </span><span>ติดต่อเรา</span></nav>
      <h1 className="font-[family-name:var(--font-kanit)] text-3xl font-extrabold">ติดต่อรีวิวสุพรรณบุรี</h1>
      <p className="mt-4 leading-8 text-neutral-700 dark:text-neutral-300">ส่งคำแนะนำ แก้ไขข้อมูลสถานที่ แจ้งลิงก์วิดีโอที่ใช้งานไม่ได้ หรือเสนอร้านและที่เที่ยวในจังหวัดสุพรรณบุรีได้ทางอีเมล</p>
      <a className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#DA3D0D] px-5 font-bold text-white hover:bg-[#B62F08]" href="mailto:hello@reviewsuphan.com">hello@reviewsuphan.com</a>
    </main>
  );
}
