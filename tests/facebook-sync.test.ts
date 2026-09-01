import assert from "node:assert/strict";
import test from "node:test";
import { fetchPageVideos } from "../lib/facebook-sync.js";

async function withFetchResponse(payload: unknown, callback: (requested: string[]) => Promise<void>) {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return new Response(JSON.stringify(payload), { status: 200 });
  };
  try {
    await callback(requested);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("reads Page-owned posts from the v26 posts edge with attachment fields", async () => {
  await withFetchResponse({ data: [] }, async (requested) => {
    await fetchPageVideos("page-123", "test-token", 10);
    const url = new URL(requested[0]);
    assert.equal(url.pathname, "/v26.0/page-123/posts");
    assert.equal(
      url.searchParams.get("fields"),
      "id,message,permalink_url,created_time,attachments{media,type,url,subattachments{media,type,url}}"
    );
    assert.equal(url.searchParams.get("limit"), "10");
    assert.equal(url.searchParams.get("access_token"), "test-token");
  });
});

test("retains video posts and excludes posts without a video attachment", async () => {
  await withFetchResponse({
    data: [
      { id: "text-1", message: "text", created_time: "2026-01-01T00:00:00+0000", attachments: { data: [{ type: "link", url: "https://example.test/text" }] } },
      { id: "video-1", message: "video", permalink_url: "https://facebook.test/video-1", created_time: "2026-01-02T00:00:00+0000", attachments: { data: [{ type: "video_inline", url: "https://facebook.test/video-1" }] } },
    ],
  }, async () => {
    assert.deepEqual(await fetchPageVideos("page", "token"), [{
      id: "video-1",
      description: "video",
      permalink_url: "https://facebook.test/video-1",
      created_time: "2026-01-02T00:00:00+0000",
      picture: null,
    }]);
  });
});

test("follows paging.next to fill up to `limit` when the first page has too few videos", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  const pages = [
    {
      data: [
        { id: "text-1", message: "text only", created_time: "2026-01-01T00:00:00+0000", attachments: { data: [{ type: "link" }] } },
        { id: "video-1", message: "first video", permalink_url: "https://facebook.test/video-1", created_time: "2026-01-02T00:00:00+0000", attachments: { data: [{ type: "video_inline", url: "https://facebook.test/video-1" }] } },
      ],
      paging: { next: "https://graph.facebook.com/v26.0/page/posts?after=cursor-1" },
    },
    {
      data: [
        { id: "video-2", message: "second video", permalink_url: "https://facebook.test/video-2", created_time: "2026-01-03T00:00:00+0000", attachments: { data: [{ type: "video_inline", url: "https://facebook.test/video-2" }] } },
      ],
      // no paging.next this time -- must stop after this page even though limit isn't reached
    },
  ];
  let call = 0;
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return new Response(JSON.stringify(pages[call++]), { status: 200 });
  };

  try {
    const result = await fetchPageVideos("page", "token", 2);
    assert.equal(requested.length, 2);
    assert.ok(requested[1].startsWith("https://graph.facebook.com/v26.0/page/posts?after=cursor-1"));
    assert.deepEqual(result.map((v) => v.id), ["video-1", "video-2"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stops once `limit` videos are collected instead of fetching further pages", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return new Response(
      JSON.stringify({
        data: [
          { id: "video-1", message: "a", permalink_url: "https://facebook.test/video-1", created_time: "2026-01-02T00:00:00+0000", attachments: { data: [{ type: "video_inline", url: "https://facebook.test/video-1" }] } },
          { id: "video-2", message: "b", permalink_url: "https://facebook.test/video-2", created_time: "2026-01-03T00:00:00+0000", attachments: { data: [{ type: "video_inline", url: "https://facebook.test/video-2" }] } },
        ],
        paging: { next: "https://graph.facebook.com/v26.0/page/posts?after=cursor-should-not-be-fetched" },
      }),
      { status: 200 }
    );
  };

  try {
    const result = await fetchPageVideos("page", "token", 1);
    assert.equal(requested.length, 1);
    assert.deepEqual(result.map((v) => v.id), ["video-1"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("maps a video nested in subattachments and uses its thumbnail", async () => {
  await withFetchResponse({
    data: [{
      id: "post-1",
      message: "nested caption",
      permalink_url: "https://facebook.test/post-1",
      created_time: "2026-01-03T00:00:00+0000",
      attachments: { data: [{ type: "album", subattachments: { data: [{ type: "video", url: "https://facebook.test/video", media: { type: "video", image: { src: "https://cdn.test/thumb.jpg" } } }] } }] },
    }],
  }, async () => {
    assert.deepEqual(await fetchPageVideos("page", "token"), [{
      id: "post-1",
      description: "nested caption",
      permalink_url: "https://facebook.test/post-1",
      created_time: "2026-01-03T00:00:00+0000",
      picture: "https://cdn.test/thumb.jpg",
    }]);
  });
});
