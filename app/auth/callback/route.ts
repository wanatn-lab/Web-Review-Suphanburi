import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isAllowedAdminEmail } from "@/lib/supabase-auth";

const ADMIN_PATH = "/admin/manual-content";

function safeNextPath(value: string | null): string {
  return value?.startsWith("/admin/") ? value : ADMIN_PATH;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = safeNextPath(requestUrl.searchParams.get("next"));
  const redirectUrl = new URL(nextPath, requestUrl.origin);

  if (!code) {
    redirectUrl.searchParams.set("error", "auth-link");
    return NextResponse.redirect(redirectUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    redirectUrl.searchParams.set("error", "auth-config");
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectUrl.searchParams.set("error", "auth-link");
    return NextResponse.redirect(redirectUrl);
  }

  if (!isAllowedAdminEmail(user?.email)) {
    await supabase.auth.signOut();
    redirectUrl.searchParams.set("error", "auth-unauthorized");
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
