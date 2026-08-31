# PROGRESS.md

อัปเดตล่าสุด: 31 สิงหาคม 2026

## ภาพรวมโปรเจกต์

`Web-Review-Suphanburi` เป็นเว็บ Next.js สำหรับรวบรวมรีวิวและคอนเทนต์ท่องเที่ยวสุพรรณบุรี โดยอ่านข้อมูลจาก Supabase และรองรับการซิงก์วิดีโอจาก Facebook Page อัตโนมัติ พร้อมข้อมูล SEO และพิกัดสำหรับ Local/Geo SEO

## สถานะปัจจุบัน

### ✅ ทำเสร็จแล้ว

- หน้าเว็บหลัก, หน้าหมวดหมู่, หน้ารายละเอียดรีวิว, การค้นหา, sitemap และ robots
- เชื่อม Supabase สำหรับอ่านรีวิวฝั่ง Server Components
- Route `/api/sync-facebook` สำหรับ:
  - ตรวจ `CRON_SECRET`
  - ดึงวิดีโอล่าสุดจาก Facebook Page
  - กันโพสต์ซ้ำด้วย `facebook_post_id`
  - สร้าง title, slug, description และ category
  - insert รีวิวใหม่ลง Supabase
- `lib/geocoding.ts` สำหรับเติมพิกัดจากแคปชันแบบ best-effort:
  - รองรับชื่ออำเภอในสุพรรณบุรี
  - fallback เป็นระดับจังหวัด
  - timeout 8 วินาที
  - หากไม่มี `GEOCODING_API_KEY` หรือ API ล้มเหลว ระบบ Facebook sync ยังทำงานต่อ
- Vercel Cron สำหรับเรียก Facebook sync ตาม `vercel.json`

### 🛠️ งานซ่อม route หลัก

พบว่า `app/api/sync-facebook/route.ts` บน `origin/main` ถูกบันทึกเป็น Base64-like payload ที่เสียและไม่ใช่ TypeScript ที่ใช้งานได้

ดำเนินการแล้ว:

1. สำรอง local commit และงาน Token Refresh ที่ยังไม่เสร็จไว้ใน local branch `backup-wip-2026-08-31`
2. สร้าง branch `repair/sync-facebook-route` จาก `origin/main`
3. กู้ route ที่ถูกต้องจาก commit `fbb5d37`
4. ตรวจ GitHub blob หลังซ่อมว่าตรงกับ known-good blob `787546956ebb31e76c0ae3da9b6cc711f600aff0`
5. เปิด PR #1 เพื่อให้ตรวจสอบก่อน merge:
   - https://github.com/wanatn-lab/Web-Review-Suphanburi/pull/1

> ขณะนี้ `main` ยังไม่ได้รับการซ่อมจนกว่า PR #1 จะถูกตรวจและ merge

## ผลการตรวจสอบ

- `npx tsc --noEmit`: ผ่าน ไม่มี TypeScript error
- `npm run build`: ผ่าน
  - ใช้ค่า Supabase placeholder เฉพาะ process สำหรับ build verification
  - ไม่ได้สร้างหรือแก้ไขไฟล์ `.env`
- `git diff --check`: ผ่าน
- Independent pre-commit review: ผ่าน
  - ไม่พบ hardcoded secret
  - ไม่พบ security concern
  - ไม่พบ logic error
- `npm audit`: พบช่องโหว่เดิมระดับ high 2 รายการ, critical 0 รายการ
  - งานซ่อม route ไม่ได้แก้ `package.json` หรือ `package-lock.json`

## งานที่พักไว้

### ⏸️ Facebook Token Refresh

ยังไม่รวมใน repair PR ตามคำสั่ง เพื่อให้ route หลักกลับมาทำงานก่อน

งาน WIP ถูกเก็บไว้ใน local branch `backup-wip-2026-08-31` ประกอบด้วย:

- `app/api/refresh-facebook-token/route.ts`
- `lib/facebook-token.ts`
- การแก้ `app/api/sync-facebook/route.ts` เพื่ออ่าน token ที่ refresh แล้ว

ก่อนนำงานนี้กลับมาทำต่อ ต้องตรวจและทำให้ครบอย่างน้อย:

- Supabase migration/table สำหรับเก็บ token ฝั่ง server
- Vercel Cron สำหรับ refresh ทุก 50 วัน
- error log/notification เมื่อ refresh ล้มเหลว
- ทดสอบ TypeScript และ production build
- ห้าม commit ค่า token, API key หรือไฟล์ `.env`

## ขั้นตอนถัดไป

1. ตรวจ PR #1 และยืนยันว่า diff มีเฉพาะ route ที่ซ่อมกับ `PROGRESS.md`
2. Merge PR #1 เข้า `main` เมื่ออนุมัติ
3. ตรวจ Vercel deployment หลัง merge
4. ทดสอบ `/api/sync-facebook` ด้วย `Authorization: Bearer <CRON_SECRET>`
5. หลัง route หลักทำงานปกติแล้ว จึงสร้าง feature branch ใหม่เพื่อนำ Token Refresh WIP กลับมาทำต่อ

## Environment variables ที่ระบบใช้งาน

ระบุเฉพาะชื่อ ไม่บันทึกค่าจริง:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FB_PAGE_ID`
- `FB_PAGE_ACCESS_TOKEN`
- `CRON_SECRET`
- `GEOCODING_API_KEY`
