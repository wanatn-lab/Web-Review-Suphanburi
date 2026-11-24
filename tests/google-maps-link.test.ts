import assert from "node:assert/strict";
import test from "node:test";
import { expandGoogleMapsLink, isGoogleMapsLink, parseGoogleMapsUrl } from "../lib/google-maps-link";
import { reviewMapsUrl } from "../lib/maps-link";

// Real redirect target of a maps.app.goo.gl share link (วัดวรจันทร์).
const PLACE_URL =
  "https://www.google.com/maps/place/%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%A7%E0%B8%A3%E0%B8%88%E0%B8%B1%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B9%8C/@14.5352124,100.117284,15z/data=!3m1!4b1!4m6!3m5!1s0x30e23970b20cab13:0x8e1f5c6d73b6542e!8m2!3d14.5351919!4d100.1275837!16s%2Fg%2F1hc3q4_26?entry=tts";

test("accepts Google Maps share and place links only", () => {
  assert.equal(isGoogleMapsLink("https://maps.app.goo.gl/aort6gmunAGHMkBHA"), true);
  assert.equal(isGoogleMapsLink(PLACE_URL), true);
  assert.equal(isGoogleMapsLink("https://maps.google.com/?q=14.5,100.1"), true);
  assert.equal(isGoogleMapsLink("https://www.google.co.th/maps/place/x"), true);
  assert.equal(isGoogleMapsLink("http://maps.app.goo.gl/abc"), false);
  assert.equal(isGoogleMapsLink("https://evil.example/maps/place/x"), false);
  assert.equal(isGoogleMapsLink("https://www.google.com/search?q=x"), false);
  assert.equal(isGoogleMapsLink("วัดวรจันทร์"), false);
});

test("reads the venue pin (!3d/!4d), not the viewport centre (@)", () => {
  const parsed = parseGoogleMapsUrl(PLACE_URL);
  assert.equal(parsed.name, "วัดวรจันทร์");
  assert.equal(parsed.latitude, 14.5351919);
  assert.equal(parsed.longitude, 100.1275837);
});

test("falls back to q= coordinates, then the viewport", () => {
  assert.deepEqual(parseGoogleMapsUrl("https://maps.google.com/?q=14.47,100.12"), { name: null, latitude: 14.47, longitude: 100.12 });
  const viewport = parseGoogleMapsUrl("https://www.google.com/maps/place/Cafe+X/@14.4,100.1,17z");
  assert.equal(viewport.name, "Cafe X");
  assert.equal(viewport.latitude, 14.4);
});

test("follows share-link redirects to the Google Maps URL", async () => {
  const hops: string[] = [];
  const fakeFetch = (async (input: string | URL | Request) => {
    hops.push(String(input));
    return new Response(null, { status: 302, headers: { location: PLACE_URL } });
  }) as typeof fetch;
  assert.equal(await expandGoogleMapsLink("https://maps.app.goo.gl/aort6gmunAGHMkBHA", fakeFetch), PLACE_URL);
  assert.deepEqual(hops, ["https://maps.app.goo.gl/aort6gmunAGHMkBHA"]);
});

test("refuses redirects to non-Google hosts and failed lookups", async () => {
  const offsite = (async () => new Response(null, { status: 302, headers: { location: "https://evil.example/x" } })) as typeof fetch;
  assert.equal(await expandGoogleMapsLink("https://maps.app.goo.gl/abc", offsite), null);
  const notFound = (async () => new Response("nope", { status: 404 })) as typeof fetch;
  assert.equal(await expandGoogleMapsLink("https://maps.app.goo.gl/abc", notFound), null);
  const thrown = (async () => { throw new Error("network"); }) as typeof fetch;
  assert.equal(await expandGoogleMapsLink("https://maps.app.goo.gl/abc", thrown), null);
});

test("public Maps button prefers the pasted link", () => {
  const link = "https://maps.app.goo.gl/aort6gmunAGHMkBHA";
  assert.equal(reviewMapsUrl({ latitude: 14.53, longitude: 100.12, location_text: "x", google_place_id: "ChIJ_a", google_maps_url: link }), link);
  // Invalid stored links are ignored.
  assert.match(reviewMapsUrl({ latitude: 14.53, longitude: 100.12, location_text: null, google_maps_url: "https://evil.example" })!, /query=14\.53,100\.12/);
});
