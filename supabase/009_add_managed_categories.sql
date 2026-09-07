-- One source of truth for public navigation, category pages and the admin form.
create table if not exists public.categories (
  slug text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null,
  seo_title text,
  seo_description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists categories_label_key on public.categories (label);
insert into public.categories (slug, label, seo_title, seo_description, sort_order, is_active) values
  ('food', 'ร้านอาหาร', 'ร้านอาหารสุพรรณบุรี รวมรีวิวล่าสุด', 'รวมรีวิวร้านอาหารสุพรรณบุรี พร้อมคลิปวิดีโอจาก Facebook และ TikTok อัปเดตล่าสุด', 10, true),
  ('cafe', 'คาเฟ่', 'คาเฟ่สุพรรณบุรี รวมรีวิวล่าสุด', 'รวมรีวิวคาเฟ่สุพรรณบุรี พร้อมคลิปวิดีโอจาก Facebook และ TikTok อัปเดตล่าสุด', 20, true),
  ('trip', 'ที่เที่ยว', 'ที่เที่ยวสุพรรณบุรี รวมรีวิวล่าสุด', 'รวมรีวิวที่เที่ยวสุพรรณบุรี พร้อมคลิปวิดีโอจาก Facebook และ TikTok อัปเดตล่าสุด', 30, true),
  ('stay', 'ที่พัก', 'ที่พักสุพรรณบุรี รวมรีวิวล่าสุด', 'รวมรีวิวที่พักสุพรรณบุรี พร้อมคลิปวิดีโอจาก Facebook และ TikTok อัปเดตล่าสุด', 40, true),
  ('market', 'ตลาด', 'ตลาดสุพรรณบุรี รวมรีวิวล่าสุด', 'รวมรีวิวตลาดสุพรรณบุรี พร้อมคลิปวิดีโอจาก Facebook และ TikTok อัปเดตล่าสุด', 50, true)
on conflict (slug) do nothing;
alter table public.categories enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'categories' and policyname = 'Public active categories are viewable') then
    create policy "Public active categories are viewable" on public.categories for select using (is_active = true);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reviews_category_fkey' and conrelid = 'public.reviews'::regclass) then
    alter table public.reviews add constraint reviews_category_fkey foreign key (category) references public.categories(slug) on update cascade on delete restrict;
  end if;
end $$;
