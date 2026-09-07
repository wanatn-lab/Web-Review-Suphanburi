import assert from "node:assert/strict";
import test from "node:test";
import { downloadMediaBytes, transcribeAudio } from "../lib/audio-transcription";

async function withFetchResponse<T>(payload: unknown, status: number, callback: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(payload), { status });
  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const credentials = { accountId: "acc_123", apiToken: "token_abc" };
const sampleBytes = new TextEncoder().encode("fake-audio-bytes").buffer;

test("transcribeAudio returns null when credentials are missing", async () => {
  const result = await transcribeAudio(sampleBytes, {});
  assert.equal(result, null);
});

test("transcribeAudio returns null for an empty buffer", async () => {
  const result = await transcribeAudio(new ArrayBuffer(0), credentials);
  assert.equal(result, null);
});

test("transcribeAudio returns the transcript text on a successful response", async () => {
  const result = await withFetchResponse(
    { success: true, result: { text: "  ร้านนี้อร่อยมาก  " } },
    200,
    () => transcribeAudio(sampleBytes, credentials)
  );
  assert.equal(result, "ร้านนี้อร่อยมาก");
});

test("transcribeAudio returns null when Cloudflare reports success: false", async () => {
  const result = await withFetchResponse(
    { success: false, errors: [{ message: "invalid audio" }] },
    200,
    () => transcribeAudio(sampleBytes, credentials)
  );
  assert.equal(result, null);
});

test("transcribeAudio returns null instead of throwing on a network error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  try {
    const result = await transcribeAudio(sampleBytes, credentials);
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("downloadMediaBytes returns null on a non-OK response", async () => {
  const result = await withFetchResponse({}, 404, () => downloadMediaBytes("https://example.com/video.mp4"));
  assert.equal(result, null);
});

test("downloadMediaBytes skips files whose declared Content-Length exceeds the cap", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(new ArrayBuffer(0), {
      status: 200,
      headers: { "content-length": String(200 * 1024 * 1024) },
    });
  try {
    const result = await downloadMediaBytes("https://example.com/huge.mp4");
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("downloadMediaBytes returns the bytes on success", async () => {
  const originalFetch = globalThis.fetch;
  const body = new TextEncoder().encode("video-bytes");
  globalThis.fetch = async () => new Response(body, { status: 200 });
  try {
    const result = await downloadMediaBytes("https://example.com/video.mp4");
    assert.ok(result);
    assert.equal(new Uint8Array(result!).length, body.length);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
