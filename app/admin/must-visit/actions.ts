"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminSessionValid } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { MUST_VISIT_COLLECTION_LIMIT } from "@/lib/must-visit";

const ADMIN_PATH = "/admin/must-visit";

function assertAdmin() {
  if (!isAdminSessionValid(cookies().get(ADMIN_SESSION_COOKIE)?.value)) throw new Error("Unauthorized");
}

function revalidateMustVisit() {
  revalidatePath("/");
  revalidatePath("/must-visit-suphanburi");
  revalidatePath("/sitemap.xml");
  revalidatePath(ADMIN_PATH);
}

export async function setMustVisit(reviewId: string, pinned: boolean) {
  assertAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(reviewId)) throw new Error("Invalid review");
  const supabase = getSupabaseAdmin();
  if (pinned) {
    const { count, error: countError } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_must_visit", true);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= MUST_VISIT_COLLECTION_LIMIT) throw new Error("Must-visit limit reached");
  }
  const { error } = await supabase.rpc("set_must_visit", { target_review_id: reviewId, should_pin: pinned });
  if (error) throw new Error(error.message);
  revalidateMustVisit();
}
export async function saveMustVisitOrder(ids: string[]) {
  assertAdmin();
  if (!Array.isArray(ids) || ids.length > MUST_VISIT_COLLECTION_LIMIT || new Set(ids).size !== ids.length || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error("Invalid order");
  const { error } = await getSupabaseAdmin().rpc("reorder_must_visit", { review_ids: ids });
  if (error) throw new Error(error.message);
  revalidateMustVisit();
}
