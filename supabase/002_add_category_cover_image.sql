-- supabase/002_add_category_cover_image.sql
-- Migration: เพิ่มคอลัมน์ category + cover_image เข้าตาราง reviews ที่มีอยู่แล้ว
-- (จำเป็นสำหรับ Home Page / Category Page ที่ต้องมี Category Tabs และรูปปก การ์ด)
-- Additive เท่านั้น ไม่กระทบข้อมูลเดิม — รันซ้ำได้ปลอดภัย (IF NOT EXISTS)

alter table public.reviews
  add column if not exists category text
    check (category in ('food','cafe','trip','stay','market')),
  add column if not exists cover_image text;

create index if not exists reviews_category_idx on public.reviews (category);

-- อัปเดต Mock data 2 แถวเดิมให้มี category + cover_image
update public.reviews
set category = 'food',
    cover_image = 'https://example.com/images/khao-man-kai-kim-ngek.jpg'
where slug = 'khao-man-kai-kim-ngek';

update public.reviews
set category = 'food',
    cover_image = 'https://example.com/images/dim-sum-gopi.jpg'
where slug = 'dim-sum-gopi-lang-rong-mai';
