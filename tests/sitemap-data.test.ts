import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sitemap-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

test("sitemap reads fail on a database outage instead of publishing an empty sitemap", async () => {
  const { getAllReviews } = require("../lib/supabase") as typeof import("../lib/supabase");
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "database unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } });
  try {
    await assert.rejects(getAllReviews(undefined, { failOnError: true }), /Unable to load reviews/);
    assert.deepEqual(await getAllReviews(), []);
  } finally { globalThis.fetch = original; }
});
