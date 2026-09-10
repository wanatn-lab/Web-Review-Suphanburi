/** @type {import('next').NextConfig} */
const nextConfig = {
  // This repository is nested inside a broader workspace that has another
  // package-lock.json. Pin Turbopack to this project to avoid using the wrong
  // workspace root during builds.
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "scontent*.xx.fbcdn.net" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "example.com" }, // TODO: เปลี่ยนเป็นโดเมนรูปจริงที่เก็บ cover_image
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-src https://www.facebook.com https://www.tiktok.com https://www.google.com; upgrade-insecure-requests",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
  // ลบ env block เดิมออกแล้ว — ค่า NEXT_PUBLIC_* ทั้งหมดตอนนี้มาจาก Vercel
  // Environment Variables (Project Settings) เท่านั้น เพราะ env block ใน
  // next.config.js จะ "ชนะ" ค่าที่ตั้งใน Vercel Dashboard เสมอ (ตรงข้ามกับที่
  // เข้าใจกันไว้แต่แรก) — เป็นสาเหตุที่ NEXT_PUBLIC_SITE_URL ที่ตั้งใน Vercel
  // ไม่มีผลจริงมาตลอด ทำให้ sitemap ใน robots.txt ค้างเป็นโดเมน .vercel.app เก่า
};

module.exports = nextConfig;
