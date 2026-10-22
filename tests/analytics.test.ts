import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGaId, parseGaConsent } from "../lib/analytics";

test("normalizeGaId returns a canonical GA4 Measurement ID", () => {
  assert.equal(normalizeGaId("  g-ab12cd34  "), "G-AB12CD34");
});

test("normalizeGaId disables analytics for missing or malformed IDs", () => {
  for (const value of [undefined, "", "G-", "G-ABC", "UA-12345-1", "G-abc_123", "https://example.test"]) {
    assert.equal(normalizeGaId(value), null);
  }
});

test("parseGaConsent accepts only stored consent choices", () => {
  assert.equal(parseGaConsent(" granted "), "granted");
  assert.equal(parseGaConsent("DENIED"), "denied");
  assert.equal(parseGaConsent(null), null);
  assert.equal(parseGaConsent("accepted"), null);
});
