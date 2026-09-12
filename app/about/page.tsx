import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "เกี่ยวกับเรา",
  description: "รู้จักรีวิวสุพรรณบุรี แหล่งรวมคลิปรีวิวร้านอาหาร คาเฟ่ ที่เที่ยว ตลาด และที่พักในจังหวัดสุพรรณบุรี",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <nav aria-label="breadcrumb" className="mb-5 text-xs text-neutral-400"><Link href="/" className="hover:text-[#FF4B12]">หน้าแรก</Link><span aria-hidden="true"> / </span><span>เกี่ยวกับเรา</span></nav>
      <h1 className="font-[family-name:var(--font-kanit)] text-3xl font-extrabold">เกี่ยวกับรีวิวสุพรรณบุรี</h1>
      <p className="mt-4 leading-8 text-neutral-700 dark:text-neutral-300">รีวิวสุพรรณบุรีเป็นคลังรีวิวท้องถิ่นที่ช่วยให้ค้นหาร้านอาหาร คาเฟ่ ที่เที่ยว ตลาด วัด งานกิจกรรม ที่พัก และแหล่งเรียนรู้ในจังหวัดสุพรรณบุรีได้จากหน้าเดียว เราคัดลิงก์วิดีโอสาธารณะจาก Facebook, TikTok และ YouTube มาเรียบเรียงเป็นหน้าที่มีหมวดหมู่ พิกัด และรายละเอียดประกอบการวางแผนเดินทาง</p>
      <h2 className="mt-8 font-[family-name:var(--font-kanit)] text-xl font-extrabold">วิธีการรีวิว</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-neutral-700 dark:text-neutral-300">
        <li>แสดงข้อมูลตามชื่อ คำอธิบาย ภาพ และวิดีโอที่มีแหล่งที่มาในระบบ</li>
        <li>ไม่เพิ่มคะแนนดาวหรือ AggregateRating หากไม่มีข้อมูลจากผู้ใช้จริง</li>
        <li>ข้อมูลเวลาเปิดทำการ ราคา และเงื่อนไขอาจเปลี่ยนแปลง ควรตรวจสอบกับสถานที่ก่อนเดินทาง</li>
        <li>หากมีเนื้อหาสปอนเซอร์หรือความร่วมมือเชิงพาณิชย์ จะระบุให้เห็นชัดในหน้าที่เกี่ยวข้อง</li>
      </ul>
      <h2 className="mt-8 font-[family-name:var(--font-kanit)] text-xl font-extrabold">ติดต่อและแก้ไขข้อมูล</h2>
      <p className="mt-3 leading-7 text-neutral-700 dark:text-neutral-300">แจ้งข้อมูลผิด ลิงก์วิดีโอเสีย หรือขอแก้ไขรายละเอียดได้ที่ <a className="font-bold text-[#B62F08] underline" href="mailto:hello@reviewsuphan.com">hello@reviewsuphan.com</a></p>
    </main>
  );
}
