import assert from "node:assert/strict";
import test from "node:test";
import { createManualSeoContent, createSlug } from "../lib/manual-content";

function hasOnlyByteStringSafeChars(value: string): boolean {
  // HTTP header values (and Next.js's revalidatePath/internal cache keys) must be
  // Latin1/ByteString. Any code point above 255 crashes them — this is the exact
  // regression: Thai place names produced slugs Next.js could not use as a path.
  return [...value].every((char) => char.codePointAt(0)! <= 255);
}

test("createSlug strips Thai script and falls back to a safe default", () => {
  const slug = createSlug("ร้านอาหารอร่อยมาก-food");

  assert.equal(hasOnlyByteStringSafeChars(slug), true);
  assert.equal(slug, "food");
});

test("createSlug keeps any Latin letters/numbers already present in the name", () => {
  const slug = createSlug("ร้าน Sweet Cafe 2 สาขาเมือง-food");

  assert.equal(hasOnlyByteStringSafeChars(slug), true);
  assert.equal(slug, "sweet-cafe-2-food");
});

test("createSlug never returns an empty string", () => {
  assert.equal(createSlug(""), "review-suphan-buri");
  assert.equal(createSlug("!!! ---"), "review-suphan-buri");
});

test("createManualSeoContent always produces a ByteString-safe slugBase for Thai place names", () => {
  const seo = createManualSeoContent(
    { slug: "food", label: "ร้านอาหาร" },
    "ร้านก๋วยเตี๋ยวเรือลุงมี",
    "รีวิวร้านก๋วยเตี๋ยวเรือ น้ำซุปเข้มข้น เส้นนุ่ม ราคาย่อมเยา"
  );

  assert.equal(hasOnlyByteStringSafeChars(seo.slugBase), true);
  assert.equal(seo.slugBase, "food");
  // Title/description keep the Thai text as-is — only the URL slug needs to be ASCII.
  assert.match(seo.title, /ร้านก๋วยเตี๋ยวเรือลุงมี/);
});

test("createManualSeoContent produces a ByteString-safe slugBase for Thai attraction names", () => {
  const seo = createManualSeoContent(
    { slug: "trip", label: "ที่เที่ยว" },
    "วัดป่าเลไลยก์วรวิหาร",
    "สถานที่ท่องเที่ยวเก่าแก่คู่เมืองสุพรรณบุรี"
  );

  assert.equal(hasOnlyByteStringSafeChars(seo.slugBase), true);
  assert.equal(seo.slugBase, "trip");
});
