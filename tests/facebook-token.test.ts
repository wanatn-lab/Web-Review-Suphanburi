import assert from "node:assert/strict";
import test from "node:test";
import {
    REFRESH_THRESHOLD_DAYS,
    exchangeForLongLivedToken,
    getActiveToken,
    needsRefresh,
    saveToken,
} from "../lib/facebook-token";

async function withFetchResponse<T>(payload: unknown, status: number, callback: () => Promise<T>): Promise<T> {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify(payload), { status });
    try {
          return await callback();
    } finally {
          globalThis.fetch = originalFetch;
    }
}

/** Minimal fake Supabase client -- mocks only the chain lib/facebook-token.ts
 *  actually calls (.from().select().eq().maybeSingle() and .from().upsert()) */
function fakeSupabase(options: {
    selectResult?: { data: unknown; error: unknown };
    upsertResult?: { error: unknown };
    captureUpsert?: (row: unknown) => void;
}) {
    return {
          from() {
                  return {
                            select() {
                                        return {
                                                      eq() {
                                                                      return {
                                                                                        async maybeSingle() {
                                                                                                            return options.selectResult ?? { data: null, error: null };
                                                                                          },
                                                                      };
                                                      },
                                        };
                            },
                            async upsert(row: unknown) {
                                        options.captureUpsert?.(row);
                                        return options.upsertResult ?? { error: null };
                            },
                  };
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
}

test("needsRefresh: true when already expired", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    assert.equal(needsRefresh(new Date("2026-05-01T00:00:00Z"), now), true);
});

test("needsRefresh: true when inside the threshold window", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const almostExpired = new Date(now.getTime() + (REFRESH_THRESHOLD_DAYS - 1) * 24 * 60 * 60 * 1000);
    assert.equal(needsRefresh(almostExpired, now), true);
});

test("needsRefresh: false when comfortably before the threshold window", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const farFromExpiry = new Date(now.getTime() + (REFRESH_THRESHOLD_DAYS + 30) * 24 * 60 * 60 * 1000);
    assert.equal(needsRefresh(farFromExpiry, now), false);
});

test("getActiveToken: reads the stored row from Supabase when present", async () => {
    const supabase = fakeSupabase({
          selectResult: { data: { access_token: "stored-token", expires_at: "2026-07-01T00:00:00Z" }, error: null },
    });

       const token = await getActiveToken(supabase, "page-1", "env-fallback-token");
    assert.equal(token?.accessToken, "stored-token");
    assert.equal(token?.expiresAt.toISOString(), "2026-07-01T00:00:00.000Z");
});

test("getActiveToken: falls back to the env var (bootstrap) when Supabase has no row", async () => {
    const supabase = fakeSupabase({ selectResult: { data: null, error: null } });

       const token = await getActiveToken(supabase, "page-1", "env-fallback-token");
    assert.equal(token?.accessToken, "env-fallback-token");
    // the bootstrap token must be treated as "already expired" so the next
       // refresh cron run is forced to refresh immediately instead of silently
       // skipping without knowing the real expiry
       assert.equal(needsRefresh(token!.expiresAt), true);
});

test("getActiveToken: returns null when neither Supabase nor the env var has a token", async () => {
    const supabase = fakeSupabase({ selectResult: { data: null, error: null } });

       const token = await getActiveToken(supabase, "page-1", undefined);
    assert.equal(token, null);
});

test("getActiveToken: throws a readable error when the Supabase query itself fails", async () => {
    const supabase = fakeSupabase({ selectResult: { data: null, error: { message: "network down" } } });

       await assert.rejects(
             () => getActiveToken(supabase, "page-1", "env-fallback-token"),
             /Failed to read facebook_tokens: network down/
           );
});

test("saveToken: upserts page_id/access_token/expires_at onto the page_id key", async () => {
    let captured: unknown;
    const supabase = fakeSupabase({ captureUpsert: (row) => (captured = row) });

       await saveToken(supabase, "page-1", "new-token", new Date("2026-08-01T00:00:00Z"));

       assert.deepEqual((captured as { page_id: string; access_token: string; expires_at: string }).page_id, "page-1");
    assert.deepEqual(
          (captured as { access_token: string }).access_token,
          "new-token"
        );
    assert.deepEqual(
          (captured as { expires_at: string }).expires_at,
          "2026-08-01T00:00:00.000Z"
        );
});

test("exchangeForLongLivedToken: parses access_token + expires_in from Facebook's response", async () => {
    await withFetchResponse({ access_token: "long-lived-token", expires_in: 5184000 }, 200, async () => {
          const before = Date.now();
          const result = await exchangeForLongLivedToken("short-lived-token", "app-id", "app-secret");
          assert.equal(result.accessToken, "long-lived-token");
          const expectedMs = before + 5184000 * 1000;
          // allow a small amount of jitter from test run time (under 5 seconds)
                                assert.ok(Math.abs(result.expiresAt.getTime() - expectedMs) < 5000);
    });
});

test("exchangeForLongLivedToken: throws with Facebook's error message when the exchange fails", async () => {
    await withFetchResponse(
      { error: { message: "Invalid OAuth access token", type: "OAuthException", code: 190 } },
          400,
          async () => {
                  await assert.rejects(
                            () => exchangeForLongLivedToken("expired-token", "app-id", "app-secret"),
                            /Invalid OAuth access token/
                          );
          }
        );
});
