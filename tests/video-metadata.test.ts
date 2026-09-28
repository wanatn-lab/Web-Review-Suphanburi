import assert from "node:assert/strict";
import test from "node:test";
import { videoEmbedUrl, buildVideoSitemap, reviewVideo } from "../lib/video-metadata";
import { canonicalSiteUrl } from "../lib/site";
import type { Review } from "../lib/supabase";

const review = { slug: "test", title: "A < B & C", description: "รายละเอียด & แหล่งข้อมูล", cover_image: "https://images.example/a.jpg?x=1&y=2", created_at: "2026-09-28T01:00:00.000Z", facebook_embed_url: null, tiktok_embed_url: null, youtube_embed_url: "https://youtu.be/abcdefghijk" } as Review;

test("video embeds use strict provider domains and disable autoplay on watch pages", () => {
  assert.equal(videoEmbedUrl("youtube", "https://evilyoutube.com/watch?v=abcdefghijk"), null);
  assert.equal(videoEmbedUrl("tiktok", "https://evil.test/video/7690129161058323733"), null);
  assert.equal(videoEmbedUrl("facebook", "https://facebook.com.evil.test/reel/123"), null);
  assert.match(videoEmbedUrl("youtube", review.youtube_embed_url!)!, /autoplay=0/);
  assert.match(videoEmbedUrl("tiktok", "https://www.tiktok.com/@reviewsuphan/video/7690129161058323733")!, /player\/v1\/7690129161058323733/);
  assert.match(videoEmbedUrl("youtube", "https://www.youtube.com/shorts/abcdefghijk", true)!, /autoplay=1/);
});

test("video sitemap escapes XML and includes only playable videos with thumbnails", () => {
  const sitemap = buildVideoSitemap([review, { ...review, cover_image: null }, { ...review, youtube_embed_url: null }]);
  assert.equal((sitemap.match(/<video:video>/g) || []).length, 1);
  assert.match(sitemap, /\/watch\/test/);
  assert.match(sitemap, /A &lt; B &amp; C/);
  assert.match(sitemap, /x=1&amp;y=2/);
  assert.match(sitemap, /<video:player_loc>/);
  assert.doesNotMatch(sitemap, /undefined|null/);
});

test("invalid preferred video sources do not hide a valid secondary video", () => {
  assert.equal(reviewVideo({ ...review, facebook_embed_url: "https://bad.test/" })?.provider, "youtube");
});

test("production URL normalization converges www and non-www on one HTTPS origin", () => {
  assert.equal(canonicalSiteUrl("http://reviewsuphanburi.com/something/"), "https://www.reviewsuphanburi.com");
  assert.equal(canonicalSiteUrl(), "https://www.reviewsuphanburi.com");
  assert.equal(canonicalSiteUrl("http://localhost:3000"), "http://localhost:3000");
});
