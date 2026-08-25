import type { Metadata } from "next";
import { Kanit, Noto_Sans_Thai } from "next/font/google";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import "./globals.css";

// app/layout.tsx
// Root layout — brand header/footer (matches the approved orange/white UI),
// Kanit + Noto Sans Thai loaded via next/font/google (self-hosted at build
// time, zero extra network request at runtime — better Core Web Vitals
// than a <link> to Google Fonts), and site-wide default metadata.

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-kanit",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-thai",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphan.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "รีวิวสุพรรณบุรี | รวมร้านอาหาร คาเฟ่ ที่เที่ยว อัปเดตล่าสุด",
    template: "%s | รีวิวสุพรรณบุรี",
  },
  description:
    "รวมรีวิวร้านอาหารสุพรรณบุรี ที่เที่ยวสุพรรณบุรี คาเฟ่ และที่พัก จากคลิปวิดีโอ Facebook และ TikTok อัปเดตทุกสัปดาห์",
  openGraph: {
    siteName: "รีวิวสุพรรณบุรี",
    locale: "th_TH",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${kanit.variable} ${notoSansThai.variable}`}>
      <body className="min-h-screen bg-white font-[family-name:var(--font-noto-sans-thai)] text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-50">
        <header className="sticky top-0 z-20 bg-[#DA3D0D] text-white">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-8">
            <Link
              href="/"
              className="flex items-center gap-2 font-[family-name:var(--font-kanit)] text-lg font-extrabold"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                <path d="M12 2c-3.3 0-6 2.6-6 6 0 4.4 6 12 6 12s6-7.6 6-12c0-3.4-2.7-6-6-6z" fill="#E5342A" />
                <circle cx="12" cy="8" r="2.1" fill="#DA3D0D" />
              </svg>
              รีวิวสุพรรณบุรี
            </Link>
            <nav aria-label="เมนูหลัก" className="ml-auto hidden gap-6 text-sm font-medium sm:flex">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="opacity-90 transition hover:opacity-100 hover:underline"
                >
                  {c.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {children}

        <footer className="mt-8 bg-[#DA3D0D] text-[#FCE7DC]">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-4 sm:px-8">
            <div className="sm:col-span-2">
              <h2 className="font-[family-name:var(--font-kanit)] text-sm font-bold uppercase tracking-wide text-[#FFD9C2]">
                รีวิวสุพรรณบุรี
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#FBDDCD]">
                คลังคลิปวิดีโอรีวิวร้านอาหาร คาเฟ่ และที่เที่ยวในจังหวัดสุพรรณบุรี จากคอนเทนต์บนโซเชียลมีเดียของเรา
                อัปเดตทุกสัปดาห์
              </p>
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-kanit)] text-sm font-bold uppercase tracking-wide text-[#FFD9C2]">
                หมวดหมู่
              </h2>
              <ul className="mt-2 flex flex-col gap-2 text-sm">
                {CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/category/${c.slug}`} className="text-[#FBDDCD] hover:text-white">
                      {c.label}สุพรรณบุรี
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-kanit)] text-sm font-bold uppercase tracking-wide text-[#FFD9C2]">
                ติดต่อเรา
              </h2>
              <p className="mt-2 text-sm text-[#FBDDCD]">อีเมล: hello@reviewsuphan.com</p>
            </div>
          </div>
          <div className="border-t border-white/15 px-4 py-4 text-center text-xs text-[#F0C1A8] sm:px-8">
            © {new Date().getFullYear() + 543} รีวิวสุพรรณบุรี
          </div>
        </footer>
      </body>
    </html>
  );
}
