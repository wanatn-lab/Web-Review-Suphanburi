// lib/supabase-browser-auth.ts
// Supabase client เฉพาะฝั่ง browser สำหรับหน้า "ตั้งรหัสผ่านแอดมิน"
// (app/admin/manual-content/set-password) เท่านั้น — ต่างจาก lib/supabase.ts ที่ตั้ง
// persistSession: false เพราะใช้ฝั่งเซิร์ฟเวอร์เป็นหลัก หน้านี้ต้องเปิด
// detectSessionInUrl ให้ Supabase อ่าน token ที่แนบมาใน URL ตอนคลิกลิงก์เชิญ/
// รีเซ็ตรหัสผ่านจากอีเมล แล้วเก็บ session ไว้ชั่วคราวในเบราว์เซอร์เพื่อเรียก
// updateUser({ password }) ได้
//
// ⚠️ ห้าม import จาก Server Component/Server Action — ใช้ได้เฉพาะใน Client
// Component ("use client") เท่านั้น เพราะพึ่งพา window/localStorage ของเบราว์เซอร์

"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseBrowserAuthClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL หรือ NEXT_PUBLIC_SUPABASE_ANON_KEY — ตรวจสอบ Environment Variables"
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
    },
  });

  return cachedClient;
}
