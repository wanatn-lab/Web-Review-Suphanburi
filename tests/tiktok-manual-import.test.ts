import assert from "node:assert/strict";
import test from "node:test";
import { importTikTokPostDraft } from "../lib/tiktok-manual-import";

const id = "7690129161058323733";
const url = `https://www.tiktok.com/@reviewsuphan/video/${id}`;
const image = "https://p16.tiktokcdn.com/cover.jpg";
const caption = "ร้านอาหารทดสอบ อำเภอเมืองสุพรรณบุรี";

async function withFetch(handler: typeof fetch, run: () => Promise<void>) {
  const original = globalThis.fetch;
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  delete process.env.TIKTOK_ACCESS_TOKEN;
  globalThis.fetch = handler;
  try { await run(); } finally {
    globalThis.fetch = original;
    if (token !== undefined) process.env.TIKTOK_ACCESS_TOKEN = token;
    else delete process.env.TIKTOK_ACCESS_TOKEN;
  }
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const hydration = (desc = caption) => new Response(`<script nonce="abc" type="application/json" id='__UNIVERSAL_DATA_FOR_REHYDRATION__'>${JSON.stringify({ __DEFAULT_SCOPE__: { "webapp.video-detail": { itemInfo: { itemStruct: { id, desc, video: { cover: image } } } } } })}</script>`);

test("TikTok returns complete oEmbed metadata without scraping", async () => {
  await withFetch(async (input) => {
    assert.match(String(input), /\/oembed\?/);
    return json({ title: caption, thumbnail_url: image });
  }, async () => {
    const draft = await importTikTokPostDraft(url + "?tracking=value");
    assert.equal(draft.reviewContent, caption);
    assert.equal(draft.imageUrl, image);
    assert.equal(draft.referenceUrl, url);
  });
});

test("TikTok uses hydration after oEmbed HTTP, JSON or network failures", async () => {
  for (const failure of [() => json({}, 400), () => new Response("not JSON"), () => { throw new Error("connection failed"); }]) {
    await withFetch(async (input) => String(input).includes("/oembed?") ? failure() : hydration(), async () => {
      const draft = await importTikTokPostDraft(url);
      assert.equal(draft.reviewContent, caption);
      assert.equal(draft.imageUrl, image);
    });
  }
});

test("TikTok supports SIGI_STATE and does not use a different video's caption", async () => {
  await withFetch(async (input) => String(input).includes("/oembed?") ? json({}, 400) : new Response(`<script id="SIGI_STATE">${JSON.stringify({ ItemModule: { other: { desc: "WRONG" }, [id]: { desc: caption, video: { originCover: image } } } })}</script>`), async () => {
    assert.equal((await importTikTokPostDraft(url)).reviewContent, caption);
  });
});

test("TikTok resolves share redirects and stores a playable full URL", async () => {
  await withFetch(async (input) => {
    if (String(input).includes("vm.tiktok.com")) return new Response(null, { status: 302, headers: { Location: url + "?tracking=share" } });
    if (String(input).includes("/oembed?")) return json({}, 400);
    return hydration();
  }, async () => {
    const draft = await importTikTokPostDraft("https://vm.tiktok.com/short/");
    assert.equal(draft.referenceUrl, url);
    assert.equal(draft.reviewContent, caption);
  });
});

test("TikTok keeps partial metadata and does not invent a caption or location", async () => {
  await withFetch(async (input) => String(input).includes("/oembed?") ? json({ thumbnail_url: image }) : new Response("blocked", { status: 403 }), async () => {
    const draft = await importTikTokPostDraft(url);
    assert.equal(draft.imageUrl, image);
    assert.equal(draft.placeName, "");
    assert.equal(draft.reviewContent, "");
    assert.equal(draft.address, "");
    assert.match(draft.notice, /ขาดแคปชั่น/);
  });
});

test("TikTok distinguishes WAF blocking from private-video guesses", async () => {
  await withFetch(async (input) => String(input).includes("/oembed?") ? json({}, 400) : new Response('<script id="slardar-config">{"slardarClient":"SlardarWAF"}</script>'), async () => {
    await assert.rejects(importTikTokPostDraft(url), /ปิดกั้นการอ่านข้อมูลอัตโนมัติ/);
  });
});

test("TikTok rejects external, credentialed and non-HTTPS URLs before fetching", async () => {
  await withFetch(async () => { assert.fail("Must not fetch rejected URL"); }, async () => {
    for (const invalid of ["https://tiktok.com.evil.test/video/" + id, "http://www.tiktok.com/@a/video/" + id, "https://user:pass@www.tiktok.com/@a/video/" + id, "https://www.tiktok.com:8080/@a/video/" + id]) {
      await assert.rejects(importTikTokPostDraft(invalid));
    }
  });
});

test("TikTok validates each short-link redirect destination", async () => {
  let requests = 0;
  await withFetch(async () => { requests++; return new Response(null, { status: 302, headers: { Location: "https://internal.invalid/" } }); }, async () => {
    await assert.rejects(importTikTokPostDraft("https://vt.tiktok.com/short/"));
    assert.equal(requests, 1);
  });
});

test("TikTok uses the authorized Display API for the requested owner's video", async () => {
  await withFetch(async (input, init) => {
    assert.match(String(input), /^https:\/\/open\.tiktokapis\.com\/v2\/video\/query\//);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-token");
    assert.deepEqual(JSON.parse(String(init?.body)), { filters: { video_ids: [id] } });
    return json({ error: { code: "ok" }, data: { videos: [{ id, video_description: caption, cover_image_url: image }] } });
  }, async () => {
    process.env.TIKTOK_ACCESS_TOKEN = "test-token";
    const draft = await importTikTokPostDraft(url);
    assert.equal(draft.reviewContent, caption);
    assert.equal(draft.imageUrl, image);
  });
});
