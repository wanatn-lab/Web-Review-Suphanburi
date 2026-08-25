/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "scontent*.xx.fbcdn.net" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "example.com" }, // TODO: เปลี่ยนเป็นโดเมนรูปจริงที่เก็บ cover_image
    ],
  },
  // ลบ env block เดิมออกแล้ว — ค่า NEXT_PUBLIC_* ทั้งหมดตอนนี้มาจาก Vercel
  // Environment Variables (Project Settings) เท่านั้น เพราะ env block ใน
  // next.config.js จะ "ชนะ" ค่าที่ตั้งใน Vercel Dashboard เสมอ (ตรงข้ามกับที่
  // เข้าใจกันไว้แต่แรก) — เป็นสาเหตุที่ NEXT_PUBLIC_SITE_URL ที่ตั้งใน Vercel
  // ไม่มีผลจริงมาตลอด ทำให้ sitemap ใน robots.txt ค้างเป็นโดเมน .vercel.app เก่า
};

module.exports = nextConfig;
