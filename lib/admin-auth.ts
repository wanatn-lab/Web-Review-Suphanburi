import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "review_suphan_admin";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const SESSION_CONTEXT = "manual-content-admin-v1";

function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  return password ? password : null;
}

// ADMIN_ALLOWED_EMAILS: รายชื่ออีเมล (คั่นด้วยจุลภาค) ที่อนุญาตให้ login เข้าหน้าแอดมิน
// ผ่านทาง Supabase Auth (อีเมล+รหัสผ่านที่ตั้งเอง) ได้ — เป็นทางเลือกเสริมจากรหัสผ่านกลาง
// (ADMIN_PASSWORD) เดิม ไม่ได้แทนที่กัน คนละอีเมลก็ยัง login ด้วยรหัสผ่านกลางได้เหมือนเดิม
function getAllowedAdminEmails(): string[] {
  const raw = process.env.ADMIN_ALLOWED_EMAILS;
  if (!raw) return [];

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailLoginConfigured(): boolean {
  return getAllowedAdminEmails().length > 0;
}

/** true เฉพาะอีเมลที่อยู่ใน ADMIN_ALLOWED_EMAILS เท่านั้น — ไม่สนใจว่า Supabase Auth
 *  จะยืนยันตัวตนอีเมล/รหัสผ่านสำเร็จหรือไม่ ต้องเช็คคู่กับผลจาก signInWithPassword เสมอ */
export function isEmailAllowedAdmin(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return getAllowedAdminEmails().includes(normalized);
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export function isAdminConfigured(): boolean {
  return getAdminPassword() !== null;
}

export function isAdminPasswordValid(candidate: string): boolean {
  const password = getAdminPassword();
  return password !== null && safeEqual(candidate, password);
}

export function createAdminSessionToken(): string | null {
  const password = getAdminPassword();
  if (!password) return null;

  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${SESSION_CONTEXT}.${expiresAt}`;
  const signature = createHmac("sha256", password).update(payload).digest("base64url");
  return `${expiresAt}.${signature}`;
}

export function isAdminSessionValid(candidate: string | undefined): boolean {
  if (!candidate) return false;

  const [expiresAtValue, signature, ...extra] = candidate.split(".");
  const expiresAt = Number(expiresAtValue);
  const password = getAdminPassword();

  if (
    !password ||
    !signature ||
    extra.length > 0 ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    return false;
  }

  const payload = `${SESSION_CONTEXT}.${expiresAtValue}`;
  const expectedSignature = createHmac("sha256", password).update(payload).digest("base64url");
  return safeEqual(signature, expectedSignature);
}
