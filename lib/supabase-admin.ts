import "server-only";
import { createClient } from "@supabase/supabase-js";

// lib/supabase-admin.ts
// Supabase client "แอดมิน" — ใช้ SUPABASE_SERVICE_ROLE_KEY (ไม่มี "NEXT_PUBLIC_"
// นำหน้า จึงไม่ถูก bundle ไปฝั่ง browser เด็ดขาด) เพื่อ "เขียน" ข้อมูลลงตาราง
// reviews ได้ (Insert/Update) โดยไม่ติด Row Level Security ที่เปิดไว้เฉพาะ
// อ่านอย่างเดียวสำหรับ anon key (ดู supabase/schema.sql)
//
// ⚠️ ห้าม import ไฟล์นี้จาก Client Component หรือไฟล์ที่มี "use client"
// เด็ดขาด — "server-only" ที่ import ไว้ด้านบนจะทำให้ build พังทันทีถ้ามีใคร
// import ผิดที่ ป้องกัน service role key หลุดไปอยู่ใน JS bundle ที่ browser โหลดได้
//
// ใช้เฉพาะใน Route Handler / Server Action ฝั่งเซิร์ฟเวอร์ เช่น
// app/api/sync-facebook/route.ts และ app/admin/manual-content/actions.ts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY — เพิ่มใน .env.local (local) หรือ Vercel Project Settings > Environment Variables (production)"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
