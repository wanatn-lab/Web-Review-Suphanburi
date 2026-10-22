"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  GA_CONSENT_STORAGE_KEY,
  normalizeGaId,
  parseGaConsent,
  type GaConsent,
} from "@/lib/analytics";

const gaId = normalizeGaId(process.env.NEXT_PUBLIC_GA_ID);

function readConsent(): GaConsent | null {
  try {
    return parseGaConsent(window.localStorage.getItem(GA_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function saveConsent(consent: GaConsent) {
  try {
    window.localStorage.setItem(GA_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Browsers that block storage keep the choice for the current visit only.
  }
}

export function AnalyticsConsent() {
  const [consent, setConsent] = useState<GaConsent | null>(null);

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  const chooseConsent = (choice: GaConsent) => {
    saveConsent(choice);
    setConsent(choice);
  };

  return (
    <>
      {consent === null ? (
        <section
          aria-describedby="analytics-consent-description"
          aria-label="การตั้งค่าคุกกี้"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
          role="dialog"
        >
          <p className="font-[family-name:var(--font-kanit)] text-base font-bold">การใช้คุกกี้เพื่อวิเคราะห์การใช้งาน</p>
          <p id="analytics-consent-description" className="mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
            เว็บไซต์ใช้คุกกี้เพื่อวิเคราะห์การใช้งานด้วย Google Analytics เพื่อปรับปรุงเนื้อหาและประสบการณ์ของคุณ
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA3D0D] dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => chooseConsent("denied")}
              type="button"
            >
              ไม่ยอมรับ
            </button>
            <button
              className="min-h-11 rounded-lg bg-[#DA3D0D] px-4 text-sm font-semibold text-white transition hover:bg-[#B8320A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA3D0D] focus-visible:ring-offset-2"
              onClick={() => chooseConsent("granted")}
              type="button"
            >
              ยอมรับ
            </button>
          </div>
        </section>
      ) : null}

      {consent === "granted" && gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="google-analytics-config" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}
