import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase public credentials for authentication");
  }

  return { url, key };
}

export function createServerSupabaseAuthClient() {
  const cookieStore = cookies();
  const { url, key } = getSupabaseAuthConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. middleware.ts refreshes them instead.
        }
      },
    },
  });
}

export function getAllowedAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowedAdminEmails().includes(email.trim().toLowerCase());
}

export async function getAuthenticatedAdminEmail(): Promise<string | null> {
  const supabase = createServerSupabaseAuthClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();
  if (error || !isAllowedAdminEmail(email)) return null;
  return email!;
}
