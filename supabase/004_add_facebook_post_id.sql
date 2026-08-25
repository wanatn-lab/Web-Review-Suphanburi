-- supabase/004_add_facebook_post_id.sql
-- Migration: เพิ่มคอลัมน์ facebook_post_id (unique) — ใช้เป็น "กุญแจกันซ้ำ"
-- ตอนระบบ /api/sync-facebook ดึงคลิปจาก Facebook Page มา upsert อัตโนมัติ
-- ถ้าไม่มีคอลัมน์นี้ รันซิงก์ซ้ำทุก 6 ชม. จะได้รีวิวซ้ำๆ กันเพิ่มขึ้นเรื่อยๆ
-- Additive เท่านั้น ไม่กระทบข้อมูลเดิม — รันซ้ำได้ปลอดภัย (IF NOT EXISTS)

alter table public.reviews
  add column if not exists facebook_post_id text;

create unique index if not exists reviews_facebook_post_id_key
  on public.reviews (facebook_post_id)
  where facebook_post_id is not null;
