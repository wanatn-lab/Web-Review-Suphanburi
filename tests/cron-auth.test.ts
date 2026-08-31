import assert from "node:assert/strict";
import test from "node:test";
import { isCronAuthorized } from "../lib/cron-auth";

const request = (url: string, authorization?: string): Request =>
  new Request(url, authorization ? { headers: { authorization } } : undefined);

test("denies every request when CRON_SECRET is missing", () => {
  delete process.env.CRON_SECRET;

  assert.equal(isCronAuthorized(request("https://example.test/api/sync-facebook")), false);
  assert.equal(
    isCronAuthorized(request("https://example.test/api/sync-facebook", "Bearer anything")),
    false,
  );
});

test("denies every request when CRON_SECRET is empty", () => {
  process.env.CRON_SECRET = "";

  assert.equal(isCronAuthorized(request("https://example.test/api/sync-facebook")), false);
  assert.equal(
    isCronAuthorized(request("https://example.test/api/sync-facebook", "Bearer anything")),
    false,
  );
});

test("allows only an exact Bearer token in the Authorization header", () => {
  process.env.CRON_SECRET = "s3cret";

  assert.equal(
    isCronAuthorized(request("https://example.test/api/sync-facebook", "Bearer s3cret")),
    true,
  );
  assert.equal(
    isCronAuthorized(request("https://example.test/api/sync-facebook", "bearer s3cret")),
    false,
  );
  assert.equal(
    isCronAuthorized(request("https://example.test/api/sync-facebook", "Bearer S3CRET")),
    false,
  );
  // Fetch normalizes surrounding header whitespace, so use an extra token as malformed input.
  assert.equal(
    isCronAuthorized(request("https://example.test/api/sync-facebook", "Bearer s3cret extra")),
    false,
  );
  assert.equal(
    isCronAuthorized(request("https://example.test/api/sync-facebook", "Basic s3cret")),
    false,
  );
});

test("does not accept the secret query parameter without a valid header", () => {
  process.env.CRON_SECRET = "s3cret";

  assert.equal(
    isCronAuthorized(request("https://example.test/api/sync-facebook?secret=s3cret")),
    false,
  );
  assert.equal(
    isCronAuthorized(
      request("https://example.test/api/sync-facebook?secret=s3cret", "Bearer wrong"),
    ),
    false,
  );
});
