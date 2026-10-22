export const GA_CONSENT_STORAGE_KEY = "reviewsuphanburi_ga_consent";

export type GaConsent = "granted" | "denied";

/**
 * Returns a safe GA4 Measurement ID, or null when analytics must stay off.
 * NEXT_PUBLIC_GA_ID is intentionally optional so an unset Vercel environment
 * variable never creates a request to Google.
 */
export function normalizeGaId(value: string | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^G-[A-Z0-9]{4,}$/.test(normalized) ? normalized : null;
}

/** Only consent values written by this site may enable Google Analytics. */
export function parseGaConsent(value: string | null | undefined): GaConsent | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "granted" || normalized === "denied" ? normalized : null;
}
