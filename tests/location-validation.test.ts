import test from "node:test";
import assert from "node:assert/strict";
import { hasOutOfSuphanBuriCoordinates, isSuphanBuriCoordinate } from "@/lib/location-validation";

test("accepts a coordinate in Suphan Buri", () => {
  assert.equal(isSuphanBuriCoordinate(14.4742, 100.1177), true);
});

test("rejects the known out-of-province coordinate", () => {
  assert.equal(isSuphanBuriCoordinate(13.870307, 100.4704783), false);
  assert.equal(hasOutOfSuphanBuriCoordinates(13.870307, 100.4704783), true);
});

test("does not classify missing coordinates as out-of-province", () => {
  assert.equal(hasOutOfSuphanBuriCoordinates(null, null), false);
});
