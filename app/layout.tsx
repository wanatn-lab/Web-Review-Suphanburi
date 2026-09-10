import type { Metadata } from "next";
import { Kanit, Noto_Sans_Thai } from "next/font/google";
import Link from "next/link";
import { getCategories } from "@/lib/categories";
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reviewsuphanburi.com";

const SITE_NAME = "รีวิวสุพรรณบุรี";
const SITE_DESCRIPTION = "รวมรีวิวร้านอาหารสุพรรณบุรี ที่เที่ยวสุพรรณบุรี คาเฟ่ และที่พัก จากคลิปวิดีโอ Facebook และ TikTok อัปเดตทุกสัปดาห์";

// Keep the site shell independent from the database. A database/API outage must
// never prevent the admin page, login, or public navigation from rendering.
const NAVIGATION_CATEGORIES = [
  { slug: "food", label: "ร้านอาหาร" },
  { slug: "cafe", label: "คาเฟ่" },
  { slug: "trip", label: "ที่เที่ยว" },
  { slug: "stay", label: "ที่พัก" },
  { slug: "market", label: "ตลาด" },
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "รีวิวสุพรรณบุรี | รวมร้านอาหาร คาเฟ่ ที่เที่ยว อัปเดตล่าสุด",
    template: "%s | รีวิวสุพรรณบุรี",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    locale: "th_TH",
    type: "website",
    url: "/",
    title: "รีวิวสุพรรณบุรี | รวมร้านอาหาร คาเฟ่ ที่เที่ยว อัปเดตล่าสุด",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "รีวิวสุพรรณบุรี | รวมร้านอาหาร คาเฟ่ ที่เที่ยว อัปเดตล่าสุด",
    description: SITE_DESCRIPTION,
  },
};

export const revalidate = 60;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Use the same category source as the editor and sitemap. The fallback keeps
  // navigation available during a temporary database/API outage.
  const categories = await getCategories();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        areaServed: { "@type": "AdministrativeArea", name: "จังหวัดสุพรรณบุรี" },
      },
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: "th-TH",
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
  return (
    <html lang="th" className={`${kanit.variable} ${notoSansThai.variable}`}>
      <body className="min-h-screen bg-white font-[family-name:var(--font-noto-sans-thai)] text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-50">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
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
              <Link href="/must-visit-suphanburi" className="font-bold text-[#FFDD00] transition hover:underline">ต้องแวะ</Link>
              {categories.map((c) => (
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
          <nav aria-label="เมนูหมวดหมู่บนมือถือ" className="border-t border-white/15 sm:hidden">
            <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2">
              <Link href="/must-visit-suphanburi" className="inline-flex min-h-11 flex-none items-center whitespace-nowrap rounded-full bg-[#FFDD00] px-3 text-sm font-bold text-[#5A2600]">ต้องแวะ</Link>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="inline-flex min-h-11 flex-none items-center whitespace-nowrap rounded-full px-3 text-sm font-medium text-white/95 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </nav>
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
                <li><Link href="/must-visit-suphanburi" className="text-[#FBDDCD] hover:text-white">มาสุพรรณบุรีต้องแวะ</Link></li>
                {categories.map((c) => (
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
