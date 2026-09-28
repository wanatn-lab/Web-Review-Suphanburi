import type { Metadata } from "next";
import { SITE_URL, SOCIAL_LINKS } from "@/lib/site";

export const metadata: Metadata = {
  title: "ติดต่อรีวิวสุพรรณบุรี",
  description: "ติดต่อรีวิวสุพรรณบุรีผ่าน Facebook, TikTok หรือโทร 085-529-8799 พร้อมช่องทางแจ้งข้อมูลรีวิวที่ต้องแก้ไข",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const schema = { "@context": "https://schema.org", "@type": "ContactPage", url: `${SITE_URL}/contact`, name: "ติดต่อรีวิวสุพรรณบุรี", mainEntity: { "@id": `${SITE_URL}/#organization` } };
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <h1 className="text-2xl font-extrabold">ติดต่อรีวิวสุพรรณบุรี</h1>
      <p className="mt-5 leading-8">ติดต่อเกี่ยวกับรีวิวหรือแจ้งแก้ไขข้อมูลสถานที่ได้ผ่านช่องทางของรีวิวสุพรรณบุรี</p>
      <ul className="mt-5 space-y-2 font-bold text-[#B62F08]">
        <li><a href={SOCIAL_LINKS.facebook} className="inline-flex min-h-11 items-center underline">Facebook รีวิวสุพรรณบุรี</a></li>
        <li><a href={SOCIAL_LINKS.tiktok} className="inline-flex min-h-11 items-center underline">TikTok @reviewsuphan</a></li>
        <li><a href="tel:0855298799" className="inline-flex min-h-11 items-center underline">โทร 085-529-8799</a></li>
      </ul>
      <h2 className="mt-7 text-lg font-bold">แจ้งแก้ไขข้อมูล</h2>
      <p className="mt-3 leading-8">โปรดส่งลิงก์หน้ารีวิว รายละเอียดที่ต้องการแก้ และข้อมูลอ้างอิง เช่น ข้อมูลจากสถานที่หรือโพสต์ต้นฉบับ เพื่อให้ตรวจสอบได้ตรงรายการ</p>
    </main>
  );
}
