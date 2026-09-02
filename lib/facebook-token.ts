import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// lib/facebook-token.ts
// Stores and refreshes the Facebook Page Access Token automatically.
// Used together with app/api/refresh-facebook-token/route.ts (the refresher)
// and app/api/sync-facebook/route.ts (the reader).
//
// Why this file exists: a Facebook long-lived Page Access Token only lasts
// ~60 days. Without an automatic refresh system, someone has to manually
// click "Generate Access Token" in Graph API Explorer every 60 days.

const GRAPH_API_VERSION = "v26.0";

/** Days before expiry at which a token is considered "due for refresh" --
 *  kept generous because the refresh cron only runs weekly, not daily (see
 *  vercel.json). */
export const REFRESH_THRESHOLD_DAYS = 10;

export interface StoredFacebookToken {
  accessToken: string;
  expiresAt: Date;
}

interface FacebookTokenExchangeResponse {
  access_token?: string;
  expires_in?: number;
  error?: { message: string; type: string; code: number };
}

/** true if the token should be refreshed (already expired, or expiring within
 *  REFRESH_THRESHOLD_DAYS days) -- `now` is a separate parameter to keep this
 *  easy to test. */
export function needsRefresh(expiresAt: Date, now: Date = new Date()): boolean {
  const msUntilExpiry = expiresAt.getTime() - now.getTime();
  return msUntilExpiry <= REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Reads the page's currently active token -- always from the Supabase table
 * `facebook_tokens` first (the latest value the refresh cron wrote there). If
 * no row exists yet (e.g. this feature was just deployed and has never
 * refreshed), falls back to the Vercel env var `FB_PAGE_ACCESS_TOKEN`. Since
 * the real expiry of that fallback value is unknown, its expiresAt is set to
 * the epoch so the next refresh cron run is forced to actually refresh
 * instead of silently skipping.
 */
export async function getActiveToken(
  supabaseAdmin: SupabaseClient,
  pageId: string,
  envFallbackToken: string | undefined
): Promise<StoredFacebookToken | null> {
  const { data, error } = await supabaseAdmin
    .from("facebook_tokens")
    .select("access_token, expires_at")
    .eq("page_id", pageId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read facebook_tokens: ${error.message}`);
  }

  if (data) {
    return { accessToken: data.access_token as string, expiresAt: new Date(data.expires_at as string) };
  }

  if (envFallbackToken) {
    return { accessToken: envFallbackToken, expiresAt: new Date(0) };
  }

  return null;
}

/** Saves/updates the page's latest token in Supabase (upserts over the
 *  existing row for this page_id). */
export async function saveToken(
  supabaseAdmin: SupabaseClient,
  pageId: string,
  accessToken: string,
  expiresAt: Date
): Promise<void> {
  const { error } = await supabaseAdmin.from("facebook_tokens").upsert(
    {
      page_id: pageId,
      access_token: accessToken,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "page_id" }
  );

  if (error) {
    throw new Error(`Failed to save facebook_tokens: ${error.message}`);
  }
}

/**
 * Exchanges the current token (which must not be expired yet, however close)
 * for a new long-lived token good for ~60 days, via the Facebook Graph API --
 * requires the app's App ID and App Secret (Facebook Developer Dashboard >
 * Settings > Basic; viewing the App Secret requires re-entering the Facebook
 * password).
 */
export async function exchangeForLongLivedToken(
  currentToken: string,
  appId: string,
  appSecret: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", currentToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as FacebookTokenExchangeResponse;

  if (!res.ok || json.error || !json.access_token) {
    throw new Error(
      `Facebook token exchange failed: ${json.error?.message ?? res.statusText} (code: ${json.error?.code ?? res.status})`
    );
  }

  // Facebook normally returns expires_in ~5184000 seconds (60 days) -- fall
  // back to 60 days as well in the unlikely case the field is missing.
  const expiresInSeconds = json.expires_in ?? 60 * 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  return { accessToken: json.access_token, expiresAt };
}

