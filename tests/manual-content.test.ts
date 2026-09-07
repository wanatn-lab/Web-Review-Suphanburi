import assert from "node:assert/strict";
import test from "node:test";
import { createEnhancedSeoContent, createManualSeoContent, createSlug } from "../lib/manual-content";

async function withFetchResponse<T>(payload: unknown, status: number, callback: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(payload), { status });
  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

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
  // Regression fix: createManualSeoContent now takes a { slug, label } category
  // object (since the "manage categories from admin" feature made categories
  // data-driven) instead of the old hardcoded "restaurant"/"attraction" strings.
  // This test predates that change and was crashing on every run -- verified
  // failing on main before this fix (TypeError: Cannot read properties of
  // undefined (reading 'includes')) because a plain string has no `.label`.
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

test("createEnhancedSeoContent falls back to the template when Cloudflare credentials are missing", async () => {
  const originalAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const originalApiToken = process.env.CLOUDFLARE_AI_API_TOKEN;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_AI_API_TOKEN;

  try {
    const seo = await createEnhancedSeoContent(
      { slug: "food", label: "ร้านอาหาร" },
      "ร้านทดสอบ",
      "รีวิวร้านทดสอบ อร่อยมาก"
    );

    assert.equal(seo.aiGenerated, false);
    assert.equal(seo.slugBase, "food");
  } finally {
    if (originalAccountId) process.env.CLOUDFLARE_ACCOUNT_ID = originalAccountId;
    if (originalApiToken) process.env.CLOUDFLARE_AI_API_TOKEN = originalApiToken;
  }
});

test("createEnhancedSeoContent uses the AI-written copy when Cloudflare responds successfully", async () => {
  const originalAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const originalApiToken = process.env.CLOUDFLARE_AI_API_TOKEN;
  process.env.CLOUDFLARE_ACCOUNT_ID = "acc_123";
  process.env.CLOUDFLARE_AI_API_TOKEN = "token_abc";

  try {
    const modelReply = JSON.stringify({
      title: "ร้านทดสอบ สุพรรณบุรี",
      description: "คำโปรยที่เขียนโดย AI จากแคปชั่นจริง",
    });

    const seo = await withFetchResponse(
      { success: true, result: { response: modelReply } },
      200,
      () =>
        createEnhancedSeoContent(
          { slug: "food", label: "ร้านอาหาร" },
          "ร้านทดสอบ",
          "รีวิวร้านทดสอบ อร่อยมาก"
        )
    );

    assert.equal(seo.aiGenerated, true);
    assert.equal(seo.title, "ร้านทดสอบ สุพรรณบุรี");
    assert.equal(seo.description, "คำโปรยที่เขียนโดย AI จากแคปชั่นจริง");
    // slugBase must stay derived from the place name/category regardless of
    // what the AI wrote -- URLs need to stay stable and predictable.
    assert.equal(seo.slugBase, "food");
  } finally {
    if (originalAccountId) process.env.CLOUDFLARE_ACCOUNT_ID = originalAccountId;
    else delete process.env.CLOUDFLARE_ACCOUNT_ID;
    if (originalApiToken) process.env.CLOUDFLARE_AI_API_TOKEN = originalApiToken;
    else delete process.env.CLOUDFLARE_AI_API_TOKEN;
  }
});
