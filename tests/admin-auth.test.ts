import assert from "node:assert/strict";
import test from "node:test";
import { isEmailAllowedAdmin, isEmailLoginConfigured } from "../lib/admin-auth";

test("isEmailLoginConfigured is false when ADMIN_ALLOWED_EMAILS is missing or empty", () => {
  delete process.env.ADMIN_ALLOWED_EMAILS;
  assert.equal(isEmailLoginConfigured(), false);

  process.env.ADMIN_ALLOWED_EMAILS = "";
  assert.equal(isEmailLoginConfigured(), false);

  process.env.ADMIN_ALLOWED_EMAILS = " , , ";
  assert.equal(isEmailLoginConfigured(), false);
});

test("isEmailLoginConfigured is true once at least one email is configured", () => {
  process.env.ADMIN_ALLOWED_EMAILS = "owner@example.com";
  assert.equal(isEmailLoginConfigured(), true);
});

test("isEmailAllowedAdmin rejects everything when nothing is configured", () => {
  delete process.env.ADMIN_ALLOWED_EMAILS;
  assert.equal(isEmailAllowedAdmin("owner@example.com"), false);
  assert.equal(isEmailAllowedAdmin(""), false);
});

test("isEmailAllowedAdmin matches a single configured email, case-insensitively", () => {
  process.env.ADMIN_ALLOWED_EMAILS = "reviewsuphanburi@gmail.com";

  assert.equal(isEmailAllowedAdmin("reviewsuphanburi@gmail.com"), true);
  assert.equal(isEmailAllowedAdmin("ReviewSuphanburi@Gmail.com"), true);
  assert.equal(isEmailAllowedAdmin("  reviewsuphanburi@gmail.com  "), true);
  assert.equal(isEmailAllowedAdmin("someoneelse@gmail.com"), false);
  assert.equal(isEmailAllowedAdmin(""), false);
});

test("isEmailAllowedAdmin supports a comma-separated list with stray whitespace", () => {
  process.env.ADMIN_ALLOWED_EMAILS = " owner@example.com ,staff@example.com,, ";

  assert.equal(isEmailAllowedAdmin("owner@example.com"), true);
  assert.equal(isEmailAllowedAdmin("staff@example.com"), true);
  assert.equal(isEmailAllowedAdmin("random@example.com"), false);
});
