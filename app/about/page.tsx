import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME, SOCIAL_LINKS } from "@/lib/site";

export const metadata: Metadata = {
  title: "เกี่ยวกับรีวิวสุพรรณบุรี",
  description: "รู้จักรีวิวสุพรรณบุรี คลังวิดีโอรีวิวร้านอาหาร คาเฟ่ ที่เที่ยว และที่พัก พร้อมช่องทางดูต้นฉบับและแจ้งแก้ไขข้อมูล",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const schema = { "@context": "https://schema.org", "@type": "AboutPage", url: `${SITE_URL}/about`, name: "เกี่ยวกับรีวิวสุพรรณบุรี", mainEntity: { "@id": `${SITE_URL}/#organization`, "@type": "Organization", name: SITE_NAME, sameAs: Object.values(SOCIAL_LINKS) } };
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <h1 className="text-2xl font-extrabold">เกี่ยวกับรีวิวสุพรรณบุรี</h1>
      <p className="mt-5 leading-8">รีวิวสุพรรณบุรีรวบรวมวิดีโอรีวิวร้านอาหาร คาเฟ่ ที่เที่ยว และที่พักในจังหวัดสุพรรณบุรี จากคอนเทนต์บนโซเชียลมีเดียของเรา เพื่อให้ค้นหารีวิว ดูวิดีโอ และเปิดพิกัดได้ในที่เดียว</p>
      <h2 className="mt-7 text-lg font-bold">แหล่งข้อมูลของรีวิว</h2>
      <p className="mt-3 leading-8">แต่ละหน้ามีสรุปรีวิว วิดีโอต้นฉบับ และข้อมูลสถานที่ตามที่มีในรายการ วันที่เผยแพร่และวันที่แก้ไขแสดงในหน้ารีวิว ข้อมูลราคา เวลาเปิด และกิจกรรมอาจเปลี่ยนแปลงได้ กรุณาตรวจสอบกับสถานที่ก่อนเดินทาง</p>
      <p className="mt-4 leading-8">ดูคอนเทนต์ของเราได้ที่ <a href={SOCIAL_LINKS.facebook} className="font-bold text-[#B62F08] underline">Facebook รีวิวสุพรรณบุรี</a> และ <a href={SOCIAL_LINKS.tiktok} className="font-bold text-[#B62F08] underline">TikTok @reviewsuphan</a></p>
      <Link href="/contact" className="mt-6 inline-flex min-h-11 items-center font-bold text-[#B62F08] underline">ติดต่อหรือแจ้งแก้ไขข้อมูลรีวิว</Link>
    </main>
  );
}
