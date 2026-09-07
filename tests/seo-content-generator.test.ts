import assert from "node:assert/strict";
import test from "node:test";
import { generateSeoCopy } from "../lib/seo-content-generator";

async function withFetchResponse<T>(payload: unknown, status: number, callback: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(payload), { status });
  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const baseInput = {
  categoryLabel: "ร้านอาหาร",
  placeName: "ร้านทดสอบ",
  caption: "ร้านอาหารอร่อยมาก บรรยากาศดี",
  accountId: "acc_123",
  apiToken: "token_abc",
};

test("generateSeoCopy returns null when credentials are missing", async () => {
  const result = await generateSeoCopy({ ...baseInput, accountId: undefined, apiToken: undefined });
  assert.equal(result, null);
});

test("generateSeoCopy returns null when there is no caption or transcript", async () => {
  const result = await generateSeoCopy({ ...baseInput, caption: "" });
  assert.equal(result, null);
});

test("generateSeoCopy parses a clean JSON reply", async () => {
  const modelReply = JSON.stringify({ title: "ร้านทดสอบ สุพรรณบุรี", description: "คำโปรยตัวอย่างที่เขียนโดยโมเดล" });
  const result = await withFetchResponse(
    { success: true, result: { response: modelReply } },
    200,
    () => generateSeoCopy(baseInput)
  );
  assert.deepEqual(result, { title: "ร้านทดสอบ สุพรรณบุรี", description: "คำโปรยตัวอย่างที่เขียนโดยโมเดล" });
});

test("generateSeoCopy extracts JSON even when the model wraps it in extra text", async () => {
  const modelReply = 'แน่นอนค่ะ นี่คือคำตอบ:\n```json\n{"title": "A", "description": "B"}\n```\nหวังว่าจะเป็นประโยชน์';
  const result = await withFetchResponse(
    { success: true, result: { response: modelReply } },
    200,
    () => generateSeoCopy(baseInput)
  );
  assert.deepEqual(result, { title: "A", description: "B" });
});

test("generateSeoCopy returns null when the reply has no parseable JSON", async () => {
  const result = await withFetchResponse(
    { success: true, result: { response: "ขอโทษค่ะ ไม่สามารถช่วยได้" } },
    200,
    () => generateSeoCopy(baseInput)
  );
  assert.equal(result, null);
});

test("generateSeoCopy returns null when Cloudflare reports success: false", async () => {
  const result = await withFetchResponse(
    { success: false, errors: [{ message: "model unavailable" }] },
    200,
    () => generateSeoCopy(baseInput)
  );
  assert.equal(result, null);
});

test("generateSeoCopy returns null instead of throwing on a network error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  try {
    const result = await generateSeoCopy(baseInput);
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
