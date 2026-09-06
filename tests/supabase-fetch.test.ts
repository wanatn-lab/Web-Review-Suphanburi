import assert from "node:assert/strict";
import test from "node:test";
import { resilientFetch } from "../lib/supabase-fetch";

test("resilientFetch returns the response on the first successful attempt", async () => {
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response("ok", { status: 200 });
  }) as typeof fetch;

  try {
    const response = await resilientFetch("https://example.test/reviews");
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resilientFetch retries on a network-level failure and succeeds once the network recovers", async () => {
  let attempts = 0;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    attempts += 1;
    if (attempts < 3) {
      throw new TypeError("fetch failed");
    }
    return new Response("ok", { status: 200 });
  }) as typeof fetch;

  try {
    const response = await resilientFetch("https://example.test/reviews");
    assert.equal(response.status, 200);
    assert.equal(attempts, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resilientFetch gives up and throws after exhausting all attempts", async () => {
  let attempts = 0;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    attempts += 1;
    throw new TypeError("ECONNRESET");
  }) as typeof fetch;

  try {
    await assert.rejects(() => resilientFetch("https://example.test/reviews"), /ECONNRESET/);
    assert.equal(attempts, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resilientFetch does NOT retry a normal HTTP error response (e.g. 404/500)", async () => {
  let attempts = 0;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    attempts += 1;
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    const response = await resilientFetch("https://example.test/reviews");
    assert.equal(response.status, 404);
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
