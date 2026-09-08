import assert from "node:assert/strict";
import test from "node:test";
import { buildSlugFromYouTubeVideoId, durationToSeconds, fetchChannelVideos } from "../lib/youtube-sync.js";

test("fetchChannelVideos reads the uploads playlist and maps public videos", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  const payloads = [
    { items: [{ contentDetails: { relatedPlaylists: { uploads: "UUexample" } } }] },
    {
      items: [
        {
          contentDetails: { videoId: "abc123_DEF-", videoPublishedAt: "2026-09-01T12:00:00Z" },
          snippet: {
            title: "รีวิวตลาดสุพรรณบุรี",
            description: "คลิปรีวิวล่าสุด",
            thumbnails: { high: { url: "https://i.ytimg.com/vi/abc123_DEF-/hqdefault.jpg" } },
          },
        },
      ],
    },
    { items: [{ id: "abc123_DEF-", contentDetails: { duration: "PT59S" } }] },
  ];
  let call = 0;
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return new Response(JSON.stringify(payloads[call++]), { status: 200 });
  };

  try {
    assert.deepEqual(await fetchChannelVideos("UCchannel", "api-key", 10), [{
      id: "abc123_DEF-",
      title: "รีวิวตลาดสุพรรณบุรี",
      description: "คลิปรีวิวล่าสุด",
      permalinkUrl: "https://www.youtube.com/watch?v=abc123_DEF-",
      publishedAt: "2026-09-01T12:00:00Z",
      thumbnailUrl: "https://i.ytimg.com/vi/abc123_DEF-/hqdefault.jpg",
      durationSeconds: 59,
    }]);
    const channelUrl = new URL(requested[0]);
    assert.equal(channelUrl.pathname, "/youtube/v3/channels");
    assert.equal(channelUrl.searchParams.get("part"), "contentDetails");
    assert.equal(channelUrl.searchParams.get("id"), "UCchannel");
    assert.equal(channelUrl.searchParams.get("key"), "api-key");
    const playlistUrl = new URL(requested[1]);
    assert.equal(playlistUrl.pathname, "/youtube/v3/playlistItems");
    assert.equal(playlistUrl.searchParams.get("playlistId"), "UUexample");
    assert.equal(playlistUrl.searchParams.get("part"), "snippet,contentDetails");
    const videosUrl = new URL(requested[2]);
    assert.equal(videosUrl.pathname, "/youtube/v3/videos");
    assert.equal(videosUrl.searchParams.get("part"), "contentDetails");
    assert.equal(videosUrl.searchParams.get("id"), "abc123_DEF-");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchChannelVideos skips deleted and private placeholders", async () => {
  const originalFetch = globalThis.fetch;
  const payloads = [
    { items: [{ contentDetails: { relatedPlaylists: { uploads: "UUexample" } } }] },
    {
      items: [
        { contentDetails: { videoId: "private" }, snippet: { title: "Private video" } },
        { contentDetails: { videoId: "deleted" }, snippet: { title: "Deleted video" } },
      ],
    },
    { items: [] },
  ];
  let call = 0;
  globalThis.fetch = async () => new Response(JSON.stringify(payloads[call++]), { status: 200 });
  try {
    assert.deepEqual(await fetchChannelVideos("UCchannel", "api-key"), []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("buildSlugFromYouTubeVideoId keeps a distinct stable prefix", () => {
  assert.equal(buildSlugFromYouTubeVideoId("abc123_DEF-"), "yt-abc123_DEF-");
});

test("fetchChannelVideos keeps only videos no longer than three minutes", async () => {
  const originalFetch = globalThis.fetch;
  const payloads = [
    { items: [{ contentDetails: { relatedPlaylists: { uploads: "UUexample" } } }] },
    {
      items: [
        { contentDetails: { videoId: "short" }, snippet: { title: "Short candidate" } },
        { contentDetails: { videoId: "long" }, snippet: { title: "Long video" } },
      ],
    },
    {
      items: [
        { id: "short", contentDetails: { duration: "PT3M" } },
        { id: "long", contentDetails: { duration: "PT3M1S" } },
      ],
    },
  ];
  let call = 0;
  globalThis.fetch = async () => new Response(JSON.stringify(payloads[call++]), { status: 200 });
  try {
    const videos = await fetchChannelVideos("UCchannel", "api-key");
    assert.equal(videos.length, 1);
    assert.equal(videos[0].id, "short");
    assert.equal(videos[0].durationSeconds, 180);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("durationToSeconds parses ISO 8601 durations", () => {
  assert.equal(durationToSeconds("PT1H2M3S"), 3723);
  assert.equal(durationToSeconds("PT0S"), 0);
  assert.equal(durationToSeconds("not-a-duration"), null);
});
