-- supabase/003_add_location_text.sql
-- Migration: เพิ่มคอลัมน์ location_text — ข้อความสถานที่สั้นๆ เช่น "อ.เมือง สุพรรณบุรี"
-- "อู่ทอง" "สามชุก" ใช้โชว์บนการ์ด (พร้อมไอคอนหมุด) ให้ตรงกับ UI ต้นแบบ
-- Additive เท่านั้น ไม่กระทบข้อมูลเดิม — รันซ้ำได้ปลอดภัย (IF NOT EXISTS)

alter table public.reviews
  add column if not exists location_text text;

-- อัปเดต Mock data 2 แถวเดิม
update public.reviews
set location_text = 'อ.เมือง สุพรรณบุรี'
where slug = 'khao-man-kai-kim-ngek';

update public.reviews
set location_text = 'อ.เมือง สุพรรณบุรี'
where slug = 'dim-sum-gopi-lang-rong-mai';
