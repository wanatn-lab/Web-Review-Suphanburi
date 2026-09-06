// lib/supabase-fetch.ts
// Custom `fetch` for the Supabase client(s), with automatic retry on
// *network-level* failures only (connection reset, TLS handshake dropped,
// DNS blip, etc — anything that throws before a response comes back).
//
// Why this exists: the Supabase project for this app runs in ap-northeast-2
// (Seoul) while Vercel's default function region is iad1 (US East). That
// long geographic hop was causing intermittent
// `ECONNRESET` / "Client network socket disconnected before secure TLS
// connection was established" errors — confirmed directly in Vercel runtime
// logs. The primary fix is pinning the Vercel function region to `icn1`
// (Seoul) in vercel.json so requests no longer cross the Pacific. This
// retry wrapper is the belt-and-suspenders layer on top: any remaining
// transient network hiccup (cold start, brief packet loss) gets a couple of
// quick retries instead of surfacing as "ไม่พบรีวิวนี้" (page not found) or a
// failed save in the admin panel.
//
// This deliberately does NOT retry on HTTP error responses (4xx/5xx) —
// those are real answers from Supabase (e.g. "row not found"), not network
// flakiness, and retrying them would just hide real bugs / duplicate writes.

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === MAX_ATTEMPTS;
      if (!isLastAttempt) {
        console.warn(
          `[resilientFetch] attempt ${attempt}/${MAX_ATTEMPTS} failed, retrying:`,
          error instanceof Error ? error.message : error
        );
        await wait(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError;
}
