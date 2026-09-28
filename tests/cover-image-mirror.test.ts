import assert from "node:assert/strict";
import test from "node:test";

// Import after configuring a test-only client; all network calls are mocked.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mirror-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

test("replacing a mirrored cover changes its URL and repeated bytes reuse the same URL", async () => {
  const { mirrorCoverImage } = require("../lib/cover-image-mirror") as typeof import("../lib/cover-image-mirror");
  const original = globalThis.fetch;
  let bytes = new Uint8Array([1, 2, 3]);
  const uploadPaths: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === "https://p16.tiktokcdn.com/cover.jpg") return new Response(Buffer.from(bytes), { headers: { "Content-Type": "image/jpeg" } });
    assert.match(url, /^https:\/\/mirror-test\.supabase\.co\/storage\/v1\/object\/review-covers\/covers\//);
    assert.equal(init?.method, "POST");
    uploadPaths.push(url);
    return new Response(JSON.stringify({ Key: "uploaded" }), { headers: { "Content-Type": "application/json" } });
  };
  try {
    const first = await mirrorCoverImage("https://p16.tiktokcdn.com/cover.jpg", "test-review");
    const same = await mirrorCoverImage("https://p16.tiktokcdn.com/cover.jpg", "test-review");
    bytes = new Uint8Array([4, 5, 6]);
    const changed = await mirrorCoverImage("https://p16.tiktokcdn.com/cover.jpg", "test-review");
    assert.equal(first, same);
    assert.notEqual(changed, first);
    assert.match(first!, /covers\/test-review-[a-f0-9]{16}\.jpg$/);
    assert.equal(uploadPaths.length, 3);
  } finally { globalThis.fetch = original; }
});
