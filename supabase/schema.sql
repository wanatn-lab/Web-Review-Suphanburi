-- supabase/schema.sql
-- Run this in Supabase SQL Editor to create the "reviews" table.

create table if not exists public.reviews (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  excerpt          text,
  content          text,
  caption          text,              -- raw caption pulled from the Facebook post
  cover_image      text,
  category         text not null check (category in ('food','cafe','trip','stay','market')),
  facebook_embed_url text,
  tiktok_embed_url text,
  location_name    text,              -- e.g. "อ.เมือง จ.สุพรรณบุรี"
  district         text,              -- e.g. "อำเภอเมือง"
  location_lat     double precision,
  location_lng     double precision,
  hashtags         text[],
  view_count       integer default 0,
  published_at     timestamptz default now(),
  created_at       timestamptz default now()
);

create index if not exists reviews_category_idx on public.reviews (category);
create index if not exists reviews_published_at_idx on public.reviews (published_at desc);

-- Public read access (this table has no PII — safe to expose via anon key)
alter table public.reviews enable row level security;
create policy "Public reviews are viewable by everyone"
  on public.reviews for select
  using (true);

-- Mock data matching the PRD examples
insert into public.reviews
  (slug, title, excerpt, category, cover_image, facebook_embed_url,
   location_name, district, location_lat, location_lng, hashtags, published_at)
values
  (
    'khao-man-kai-kim-ngek',
    'ร้านข้าวมันไก่กิมเง็ก',
    'ข้าวมันไก่สูตรโบราณ เนื้อไก่นุ่ม น้ำจิ้มรสจัดจ้าน ร้านเก่าแก่กลางเมืองสุพรรณบุรี',
    'food',
    'https://example.com/images/khao-man-kai-kim-ngek.jpg',
    'https://www.facebook.com/watch/?v=1234567890',
    'อ.เมือง จ.สุพรรณบุรี',
    'อำเภอเมือง',
    14.4744, 100.1177,
    array['ร้านอาหารสุพรรณบุรี','ข้าวมันไก่','ReviewSuphan'],
    now()
  ),
  (
    'dim-sum-gopi-lang-rong-mai',
    'ร้านติ่มซำโกปี๊ หลังโรงไม้',
    'ติ่มซำสูตรต้นตำรับ นึ่งร้อนๆ เสิร์ฟไว บรรยากาศร้านเก่าย่านหลังโรงไม้',
    'food',
    'https://example.com/images/dim-sum-gopi.jpg',
    'https://www.facebook.com/watch/?v=0987654321',
    'อ.เมือง จ.สุพรรณบุรี',
    'อำเภอเมือง',
    14.4700, 100.1150,
    array['ร้านอาหารสุพรรณบุรี','ติ่มซำ','ReviewSuphan'],
    now()
  )
on conflict (slug) do nothing;
