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
} from "@/lib/admin-auth";
import { geocodeLocation } from "@/lib/geocoding";
import {
  createManualSeoContent,
  isManualContentCategory,
  MANUAL_CATEGORY_CONFIG,
} from "@/lib/manual-content";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_PATH = "/admin/manual-content";

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
  return (
    url.protocol === "https:" &&
    (hostname === "example.com" ||
      hostname.endsWith(".fbcdn.net") ||
      hostname.endsWith(".tiktokcdn.com"))
  );
}

function isAuthenticated(): boolean {
  return isAdminSessionValid(cookies().get(ADMIN_SESSION_COOKIE)?.value);
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
  const createdAt = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("reviews")
    .insert({
      title: seo.title,
      slug,
      description: seo.description,
      category: categoryConfig.databaseCategory,
      cover_image: imageUrl,
      facebook_embed_url: referenceUrl,
      tiktok_embed_url: null,
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
