"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  isAdminPasswordValid,
  isAdminSessionValid,
  isEmailAllowedAdmin,
} from "@/lib/admin-auth";
import { geocodeLocation } from "@/lib/geocoding";
import { mirrorCoverImage } from "@/lib/cover-image-mirror";
import {
  createManualSeoContent,
  isManualContentCategory,
  MANUAL_CATEGORY_CONFIG,
} from "@/lib/manual-content";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import { importFacebookPostDraft, type FacebookImportDraft } from "@/lib/facebook-manual-import";
import { importTikTokPostDraft, type TikTokImportDraft } from "@/lib/tiktok-manual-import";
import { buildTitleFromCaption, guessCategory } from "@/lib/facebook-sync";
import { extractLocationFromCaption } from "@/lib/geocoding";

const ADMIN_PATH = "/admin/manual-content";

export type FacebookImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; draft: FacebookImportDraft };

export type TikTokImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; draft: TikTokImportDraft };

export interface CaptionDraft {
  category: "restaurant" | "attraction";
  placeName: string;
  reviewContent: string;
  referenceUrl: string;
  imageUrl: string;
  address: string;
  notice: string;
}

export type CaptionImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; draft: CaptionDraft };

function readRequiredText(formData: FormData, key: string, maxLength: number): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function readOptionalUrl(formData: FormData, key: string): string | null | undefined {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function isSupportedImageUrl(value: string | null): boolean {
  if (!value) return true;

  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  // hostname ของ Supabase โปรเจกต์นี้ -> ต้องอนุญาตด้วย เพราะ mirrorCoverImage()
  // จะเปลี่ยน cover_image ให้ชี้มาที่นี่หลังมิเรอร์ภาพสำเร็จ (ดู lib/cover-image-mirror.ts)
  // ไม่งั้นตอนเปิดฟอร์ม "แก้ไข" รีวิวที่มิเรอร์ภาพไปแล้ว จะ validate ไม่ผ่านทันที
  const ownSupabaseHostname = (() => {
    try {
      return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.toLowerCase() : null;
    } catch {
      return null;
    }
  })();

  return (
    url.protocol === "https:" &&
    (hostname === "example.com" ||
      hostname.endsWith(".fbcdn.net") ||
      hostname.endsWith(".tiktokcdn.com") ||
      hostname.endsWith(".tiktokcdn-us.com") ||
      hostname.endsWith(".muscdn.com") ||
      (ownSupabaseHostname !== null && hostname === ownSupabaseHostname))
  );
}

function isTikTokUrl(value: string | null): boolean {
  if (!value) return false;

  const hostname = new URL(value).hostname.toLowerCase();
  return hostname === "tiktok.com" || hostname.endsWith(".tiktok.com");
}

function embedUrlsForReference(referenceUrl: string | null) {
  return isTikTokUrl(referenceUrl)
    ? { facebookEmbedUrl: null, tiktokEmbedUrl: referenceUrl }
    : { facebookEmbedUrl: referenceUrl, tiktokEmbedUrl: null };
}

function isAuthenticated(): boolean {
  return isAdminSessionValid(cookies().get(ADMIN_SESSION_COOKIE)?.value);
}

export async function importFacebookDraft(
  _previousState: FacebookImportState,
  formData: FormData
): Promise<FacebookImportState> {
  if (!isAuthenticated()) {
    return { status: "error", message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" };
  }

  const facebookUrl = readRequiredText(formData, "facebook_url", 2_000);
  if (!facebookUrl) {
    return { status: "error", message: "กรุณาวางลิงก์ Facebook ก่อนดึงข้อมูล" };
  }

  try {
    return { status: "success", draft: await importFacebookPostDraft(facebookUrl) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ดึงข้อมูลจาก Facebook ไม่สำเร็จ";
    console.error("[manual-content] Facebook draft import failed:", message);
    return { status: "error", message };
  }
}

export async function importTikTokDraft(
  _previousState: TikTokImportState,
  formData: FormData
): Promise<TikTokImportState> {
  if (!isAuthenticated()) {
    return { status: "error", message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" };
  }

  const tiktokUrl = readRequiredText(formData, "tiktok_url", 2_000);
  if (!tiktokUrl) {
    return { status: "error", message: "กรุณาวางลิงก์ TikTok ก่อนดึงข้อมูล" };
  }

  try {
    return { status: "success", draft: await importTikTokPostDraft(tiktokUrl) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ดึงข้อมูลจาก TikTok ไม่สำเร็จ";
    console.error("[manual-content] TikTok draft import failed:", message);
    return { status: "error", message };
  }
}

/** Builds an editable SEO/GEO draft from a caption the editor copied manually. */
export async function importCaptionDraft(
  _previousState: CaptionImportState,
  formData: FormData
): Promise<CaptionImportState> {
  if (!isAuthenticated()) {
    return { status: "error", message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" };
  }

  const caption = readRequiredText(formData, "caption", 6_000);
  const referenceUrl = readOptionalUrl(formData, "caption_reference_url");

  if (!caption) {
    return { status: "error", message: "กรุณาวางแคปชั่นก่อนสร้างฉบับร่าง" };
  }
  if (referenceUrl === undefined) {
    return { status: "error", message: "ลิงก์อ้างอิงต้องเป็น URL แบบ http หรือ https" };
  }

  return {
    status: "success",
    draft: {
      category: guessCategory(caption) === "trip" ? "attraction" : "restaurant",
      placeName: buildTitleFromCaption(caption, "manual"),
      reviewContent: caption,
      referenceUrl: referenceUrl ?? "",
      imageUrl: "",
      address: extractLocationFromCaption(caption) ?? "สุพรรณบุรี",
      notice: "สร้างฉบับร่างจากแคปชั่นแล้ว กรุณาตรวจชื่อสถานที่ หมวดหมู่ ที่อยู่ และเพิ่มรูปก่อนเผยแพร่",
    },
  };
}

export async function loginAdmin(formData: FormData) {
  const password = formData.get("password");

  if (typeof password !== "string" || !isAdminPasswordValid(password)) {
    redirect(`${ADMIN_PATH}?error=login`);
  }

  const token = createAdminSessionToken();
  if (!token) {
    redirect(`${ADMIN_PATH}?error=config`);
  }

  cookies().set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  redirect(ADMIN_PATH);
}

export async function logoutAdmin() {
  cookies().set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 0,
  });
  redirect(ADMIN_PATH);
}

// เข้าสู่ระบบด้วยอีเมล + รหัสผ่านที่ตั้งเอง (Supabase Auth) — ทางเลือกเสริมนอกจาก
// รหัสผ่านกลาง (ADMIN_PASSWORD) เดิม ต้องผ่าน 2 ชั้น: (1) อีเมลต้องอยู่ใน
// ADMIN_ALLOWED_EMAILS และ (2) Supabase Auth ต้องยืนยันรหัสผ่านถูกต้องจริง — ขาดชั้นใด
// ชั้นหนึ่งไม่ผ่าน เพื่อกันทั้งคนนอก allowlist และกันกรณีมีคนอื่นสมัคร Supabase Auth
// ด้วยอีเมลอื่นแล้วสวมสิทธิ์ ผลลัพธ์สุดท้ายใช้ ADMIN_SESSION_COOKIE ใบเดียวกับ
// login รหัสผ่านกลาง จึงต้องมี ADMIN_PASSWORD ตั้งไว้เสมอ (ใช้เป็นกุญแจเซ็นเซสชัน)
// แม้แอดมินคนนั้นจะ login ผ่านอีเมลก็ตาม
export async function loginAdminWithEmail(formData: FormData) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("email_password");

  if (typeof emailValue !== "string" || typeof passwordValue !== "string" || !passwordValue) {
    redirect(`${ADMIN_PATH}?error=login`);
  }

  const email = emailValue.trim();
  if (!email || !isEmailAllowedAdmin(email)) {
    // ไม่บอกว่าติดที่ allowlist หรือรหัสผ่านผิด กันคนสุ่มไล่เดาว่าอีเมลไหนมีสิทธิ์แอดมิน
    redirect(`${ADMIN_PATH}?error=login`);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: passwordValue,
  });

  if (error || !data.user?.email || !isEmailAllowedAdmin(data.user.email)) {
    redirect(`${ADMIN_PATH}?error=login`);
  }

  const token = createAdminSessionToken();
  if (!token) {
    redirect(`${ADMIN_PATH}?error=config`);
  }

  cookies().set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  redirect(ADMIN_PATH);
}

export async function createManualReview(formData: FormData) {
  if (!isAuthenticated()) {
    redirect(`${ADMIN_PATH}?error=session`);
  }

  const rawCategory = formData.get("category");
  const category = typeof rawCategory === "string" ? rawCategory : "";
  const placeName = readRequiredText(formData, "place_name", 160);
  const reviewContent = readRequiredText(formData, "review_content", 6000);
  const address = readRequiredText(formData, "address", 500);
  const referenceUrl = readOptionalUrl(formData, "reference_url");
  const imageUrl = readOptionalUrl(formData, "image_url");

  if (
    !isManualContentCategory(category) ||
    !placeName ||
    !reviewContent ||
    !address ||
    referenceUrl === undefined ||
    imageUrl === undefined ||
    !isSupportedImageUrl(imageUrl)
  ) {
    redirect(`${ADMIN_PATH}?error=validation`);
  }

  const supabaseAdmin = getSupabaseAdmin();
  const seo = createManualSeoContent(category, placeName, reviewContent);
  const categoryConfig = MANUAL_CATEGORY_CONFIG[category];
  const embedUrls = embedUrlsForReference(referenceUrl);

  const { data: existingSlug, error: slugError } = await supabaseAdmin
    .from("reviews")
    .select("slug")
    .eq("slug", seo.slugBase)
    .maybeSingle();

  if (slugError) {
    console.error("[manual-content] Failed to check slug:", slugError.message);
    redirect(`${ADMIN_PATH}?error=database`);
  }

  const slug = existingSlug ? `${seo.slugBase}-${randomUUID().slice(0, 8)}` : seo.slugBase;
  const coordinates = await geocodeLocation(address);
  // ดาวน์โหลดภาพปกจาก CDN ชั่วคราว (TikTok/Facebook) มาเก็บถาวรที่ Supabase Storage
  // กันปัญหาลิงก์หมดอายุ (ดูรายละเอียดใน lib/cover-image-mirror.ts) — ถ้ามิเรอร์
  // ไม่สำเร็จจะได้ imageUrl เดิมกลับมาแทน ไม่ทำให้บันทึกรีวิวล้มเหลว
  const coverImage = await mirrorCoverImage(imageUrl, slug);
  const createdAt = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("reviews")
    .insert({
      title: seo.title,
      slug,
      description: seo.description,
      category: categoryConfig.databaseCategory,
      cover_image: coverImage,
      facebook_embed_url: embedUrls.facebookEmbedUrl,
      tiktok_embed_url: embedUrls.tiktokEmbedUrl,
      google_map_embed_url: null,
      latitude: coordinates?.lat ?? null,
      longitude: coordinates?.lng ?? null,
      location_text: address,
      facebook_post_id: null,
      source: "manual",
      created_at: createdAt,
    })
    .select("slug")
    .single();

  if (insertError || !inserted) {
    console.error("[manual-content] Failed to insert review:", insertError?.message ?? "No row returned");
    redirect(`${ADMIN_PATH}?error=database`);
  }

  revalidatePath("/");
  revalidatePath(`/category/${categoryConfig.databaseCategory}`);
  revalidatePath(`/reviews/${inserted.slug}`);
  revalidatePath("/sitemap.xml");

  redirect(`${ADMIN_PATH}?created=${encodeURIComponent(inserted.slug)}`);
}

export async function updateManualReview(formData: FormData) {
  if (!isAuthenticated()) {
    redirect(`${ADMIN_PATH}?error=session`);
  }

  const originalSlug = readRequiredText(formData, "original_slug", 180);
  const rawCategory = formData.get("category");
  const category = typeof rawCategory === "string" ? rawCategory : "";
  const placeName = readRequiredText(formData, "place_name", 160);
  const reviewContent = readRequiredText(formData, "review_content", 6000);
  const address = readRequiredText(formData, "address", 500);
  const referenceUrl = readOptionalUrl(formData, "reference_url");
  const imageUrl = readOptionalUrl(formData, "image_url");

  if (
    !originalSlug ||
    !isManualContentCategory(category) ||
    !placeName ||
    !reviewContent ||
    !address ||
    referenceUrl === undefined ||
    imageUrl === undefined ||
    !isSupportedImageUrl(imageUrl)
  ) {
    redirect(`${ADMIN_PATH}?edit=${encodeURIComponent(originalSlug ?? "")}&error=validation`);
  }

  const supabaseAdmin = getSupabaseAdmin();
  const seo = createManualSeoContent(category, placeName, reviewContent);
  const categoryConfig = MANUAL_CATEGORY_CONFIG[category];
  const coordinates = await geocodeLocation(address);
  const embedUrls = embedUrlsForReference(referenceUrl);
  // ดาวน์โหลดภาพปกจาก CDN ชั่วคราวมาเก็บถาวรที่ Supabase Storage เหมือนตอนสร้าง —
  // ถ้าเป็นภาพที่มิเรอร์ไว้แล้วจากรอบก่อน (ชี้มาที่ Storage ของเราเอง) จะข้ามการ
  // ดาวน์โหลดซ้ำโดยอัตโนมัติ (ดู isOwnStorageUrl ใน lib/cover-image-mirror.ts)
  const coverImage = await mirrorCoverImage(imageUrl, originalSlug);

  // หมายเหตุ: ไม่กรอง .eq("source", "manual") ตรงนี้ — ต้องแก้ไขรีวิวที่ระบบดึงจาก
  // Facebook อัตโนมัติ (source: "facebook_auto") ได้ด้วย ไม่ใช่แค่รายการที่พิมพ์เพิ่มเอง
  // (คอลัมน์ source เดิมของแถวจะไม่ถูกแตะต้อง ยังคงรู้ที่มาเดิมของข้อมูลอยู่)
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("reviews")
    .update({
      title: seo.title,
      description: seo.description,
      category: categoryConfig.databaseCategory,
      cover_image: coverImage,
      facebook_embed_url: embedUrls.facebookEmbedUrl,
      tiktok_embed_url: embedUrls.tiktokEmbedUrl,
      latitude: coordinates?.lat ?? null,
      longitude: coordinates?.lng ?? null,
      location_text: address,
    })
    .eq("slug", originalSlug)
    .select("slug")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("[manual-content] Failed to update review:", updateError?.message ?? "Review not found");
    redirect(`${ADMIN_PATH}?edit=${encodeURIComponent(originalSlug)}&error=database`);
  }

  revalidatePath("/");
  revalidatePath(`/category/${categoryConfig.databaseCategory}`);
  revalidatePath(`/reviews/${originalSlug}`);
  revalidatePath("/sitemap.xml");

  redirect(`${ADMIN_PATH}?updated=${encodeURIComponent(originalSlug)}`);
}
