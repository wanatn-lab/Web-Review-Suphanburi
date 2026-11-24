import assert from "node:assert/strict";
import test from "node:test";
import { isValidPlaceId, reviewMapsUrl } from "../lib/maps-link";

const base = { latitude: 14.4731, longitude: 100.1254, location_text: "21/9 ถนนขุนช้าง สุพรรณบุรี" };

test("a stored Place ID opens the venue page, with the address as fallback query", () => {
  const url = new URL(reviewMapsUrl({ ...base, google_place_id: "ChIJ_abc-123" })!);
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/search/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("query_place_id"), "ChIJ_abc-123");
  assert.equal(url.searchParams.get("query"), base.location_text);
});

test("Place ID without address falls back to coordinates as the query", () => {
  const url = new URL(reviewMapsUrl({ ...base, location_text: null, google_place_id: "ChIJ_abc" })!);
  assert.equal(url.searchParams.get("query"), "14.4731,100.1254");
  assert.equal(url.searchParams.get("query_place_id"), "ChIJ_abc");
});

test("without a Place ID, coordinates are preferred, then address text", () => {
  assert.equal(reviewMapsUrl({ ...base, google_place_id: null }), "https://www.google.com/maps/search/?api=1&query=14.4731,100.1254");
  const url = new URL(reviewMapsUrl({ latitude: null, longitude: null, location_text: "อู่ทอง สุพรรณบุรี" })!);
  assert.equal(url.searchParams.get("query"), "อู่ทอง สุพรรณบุรี");
  assert.equal(url.searchParams.has("query_place_id"), false);
});

test("invalid Place IDs and out-of-province coordinates are ignored", () => {
  assert.equal(isValidPlaceId("bad id&x=1"), false);
  const url = new URL(reviewMapsUrl({ ...base, google_place_id: "bad id&x=1" })!);
  assert.equal(url.searchParams.has("query_place_id"), false);
  assert.equal(reviewMapsUrl({ latitude: 13.75, longitude: 100.5, location_text: null }), null);
});
