# PROGRESS.md

อัปเดตล่าสุด: 1 กันยายน 2026

## ภาพรวมโปรเจกต์

`Web-Review-Suphanburi` เป็นเว็บ Next.js สำหรับรวบรวมรีวิวและคอนเทนต์ท่องเที่ยวสุพรรณบุรี โดยอ่านข้อมูลจาก Supabase และรองรับการซิงก์วิดีโอจาก Facebook Page อัตโนมัติ พร้อมข้อมูล SEO และพิกัดสำหรับ Local/Geo SEO

## สถานะปัจจุบัน

### ✅ ทำเสร็จแล้ว (merge เข้า `main` ทั้งหมด)

- หน้าเว็บหลัก, หน้าหมวดหมู่, หน้ารายละเอียดรีวิว, การค้นหา, sitemap และ robots
- เชื่อม Supabase สำหรับอ่านรีวิวฝั่ง Server Components
- Route `/api/sync-facebook` — ซ่อมจากไฟล์ที่เคยเสีย (PR #1), เข้มงวดเรื่อง auth (PR #2), เพิ่มคอลัมน์พิกัดใน Supabase (PR #3), อัปเกรด Facebook Graph API จาก v19 (`/videos`, เลิกรองรับแล้ว) เป็น v26 (`/posts` + กรอง video attachment) (PR #4):
  - ตรวจ `CRON_SECRET` ผ่าน `Authorization: Bearer` เท่านั้น (ปฏิเสธ query string, fail-closed ถ้าไม่ตั้ง secret)
  - ดึงวิดีโอล่าสุดจาก Facebook Page ผ่าน Graph API v26 พร้อม **ตามหน้าอัตโนมัติ (pagination)** จนกว่าจะได้ครบ `limit` วิดีโอ หรือชน `MAX_PAGES` (แก้ known limitation ของ PR #4 ที่เคยได้วิดีโอน้อยกว่า limit ถ้ามีโพสต์ไม่ใช่วิดีโอปนอยู่)
  - กันโพสต์ซ้ำด้วย `facebook_post_id`
  - สร้าง title, slug, description และ category อัตโนมัติ
  - insert รีวิวใหม่ลง Supabase
  - **อ่าน access token จากตาราง Supabase `facebook_tokens` ก่อนเสมอ** (อัปเดตล่าสุดโดย token-refresh cron ด้านล่าง) — fallback เป็น `FB_PAGE_ACCESS_TOKEN` ใน Vercel env ถ้ายังไม่เคย refresh เลย
- `lib/geocoding.ts` สำหรับเติมพิกัดจากแคปชันแบบ best-effort (รองรับชื่ออำเภอในสุพรรณบุรี, fallback ระดับจังหวัด, timeout 8 วินาที, sync ยังทำงานต่อแม้ geocoding ล้มเหลว)
- Vercel Cron สำหรับเรียก Facebook sync ทุกวัน (`vercel.json`)

### ✅ ใหม่ — Facebook Token Refresh อัตโนมัติ (นำ WIP ที่พักไว้กลับมาทำต่อจนจบ)

แก้ปัญหาที่ต้องเข้าไปกด "Generate Access Token" ใหม่ด้วยมือทุก ~60 วัน:

- `supabase/006_add_facebook_tokens.sql` — ตาราง `facebook_tokens` (page_id, access_token, expires_at, updated_at) เก็บ token ที่ใช้งานอยู่จริงฝั่งเซิร์ฟเวอร์ (Vercel serverless function แก้ env var ของตัวเองไม่ได้ระหว่างรัน จึงต้องมีที่เก็บ state ที่เขียนได้จริงแบบนี้) — RLS เปิดไว้ ไม่มี public policy ใดๆ เข้าถึงได้เฉพาะผ่าน service role
- `lib/facebook-token.ts` — อ่าน/บันทึก token จากตารางข้างต้น, เช็คว่าใกล้หมดอายุหรือยัง (`needsRefresh`, เผื่อไว้ 10 วันก่อนหมดอายุจริง), และแลก token ใหม่ผ่าน Facebook `oauth/access_token?grant_type=fb_exchange_token`
- `app/api/refresh-facebook-token/route.ts` — Route Handler ใหม่ ป้องกันด้วย `CRON_SECRET` เดียวกับ sync-facebook, อ่าน token ปัจจุบัน → เช็คว่าต้อง refresh ไหม → ถ้าใช่ แลก token ใหม่แล้วบันทึกลง Supabase → ถ้ายังไม่ใกล้หมดอายุ ข้ามรอบนั้นเฉยๆ (ไม่เรียก Facebook API โดยไม่จำเป็น)
- `vercel.json` — เพิ่ม cron ใหม่รันทุกวันอาทิตย์ 04:00 UTC เรียก `/api/refresh-facebook-token` (รันบ่อยกว่าที่จำเป็นแบบปลอดภัย เพราะ route เองจะข้ามถ้ายังไม่ถึงเวลา)
- error handling: refresh ล้มเหลว → ตอบ 500 พร้อม `console.error` ละเอียด → Vercel จะขึ้นเป็น failed invocation ในแท็บ Cron Jobs ทันที (แจ้งเตือนขั้นต้น; ถ้าต้องการแจ้งผ่าน Slack/LINE/Email เพิ่มเติมต้องต่อยอด webhook แยกทีหลัง — ยังไม่ได้ทำ)
- `tests/facebook-token.test.ts` — ครอบคลุม `needsRefresh` (หมดอายุแล้ว / ใกล้หมดอายุ / ยังไม่ใกล้), `getActiveToken` (อ่านจาก Supabase / fallback env var ตอน bootstrap / ไม่มีเลย / Supabase error), `saveToken` (upsert ถูก field), `exchangeForLongLivedToken` (parse สำเร็จ / โยน error ตาม Facebook)
- `tests/facebook-sync.test.ts` — เพิ่มเทสต์ pagination 2 ตัว (ตามหน้าเพื่อเก็บให้ครบ limit / หยุดทันทีที่ครบ limit โดยไม่ยิงหน้าเพิ่มเกินจำเป็น)

**ต้องเพิ่ม environment variable ใหม่ 2 ตัวใน Vercel ก่อนฟีเจอร์นี้จะทำงาน:**

- `FB_APP_ID` = `2054670112107813` (App ID ของแอพ "Suphan Review Sync" — ไม่เป็นความลับ)
- `FB_APP_SECRET` = ดูที่ Facebook Developer Dashboard > แอพ "Suphan Review Sync" > Settings > Basic > กด "Show" ข้าง App Secret (ต้องยืนยันรหัสผ่าน Facebook อีกครั้ง) — **เป็นความลับ ห้ามเผยแพร่**

ถ้ายังไม่ได้ตั้ง 2 ตัวนี้: `/api/sync-facebook` ยังทำงานปกติเหมือนเดิมทุกอย่าง (อ่าน token จาก `FB_PAGE_ACCESS_TOKEN` เป็น fallback ต่อไป) แต่ `/api/refresh-facebook-token` จะตอบ 500 ทันที — ไม่กระทบ sync หลัก แค่ยังไม่มี auto-refresh เท่านั้น

## ผลการตรวจสอบ (รอบล่าสุด)

- `npx tsc --noEmit`: ผ่าน ไม่มี TypeScript error (ทั้งโปรเจกต์ รวมไฟล์ใหม่)
- Unit tests (`node:test` ผ่าน `tsx`): **19/19 ผ่าน** (เดิม 7 + ใหม่ 12 — token refresh 9 ตัว, pagination 2 ตัว)
- `npm run build`: ผ่าน (คอมไพล์สำเร็จ, มีทั้ง `/api/sync-facebook` และ `/api/refresh-facebook-token` ขึ้นเป็น dynamic route ถูกต้อง) — ใช้ Supabase placeholder เฉพาะ process เหมือนรอบก่อนๆ; ระหว่างตรวจ build ในแซนด์บ็อกซ์นี้เข้า fonts.googleapis.com ไม่ได้ (นโยบายเครือข่ายของแซนด์บ็อกซ์เอง ไม่เกี่ยวกับโค้ด) จึง mock font loader ชั่วคราวเฉพาะตอนตรวจสอบแล้ว revert คืนก่อน commit — ไม่มีการเปลี่ยนแปลงจริงใน `app/layout.tsx`
- `git diff --check`: ผ่าน
- Secret scan บน diff ทั้งหมด (pattern `EAA…`, `sk_live`, `AIza…`, `ghp_…`, private key header): ไม่พบ
- ไม่ได้แก้ `package.json` หรือ `package-lock.json`
- ไม่ได้สร้างหรือแก้ไฟล์ `.env` ใดๆ

## ขั้นตอนถัดไปสำหรับเจ้าของ repo

1. ตรวจ PR นี้ (diff เฉพาะไฟล์ที่ระบุข้างบน + `PROGRESS.md`)
2. Merge เข้า `main`
3. Apply migration `supabase/006_add_facebook_tokens.sql` ผ่าน Supabase SQL Editor (เหมือนที่เคยทำกับ migration 005)
4. เพิ่ม `FB_APP_ID` และ `FB_APP_SECRET` ใน Vercel Environment Variables (ดูวิธีหาค่าด้านบน)
5. Redeploy
6. ทดสอบยิง `/api/refresh-facebook-token` ด้วย `Authorization: Bearer <CRON_SECRET>` เองสัก 1 ครั้ง เพื่อยืนยันว่า exchange กับ Facebook สำเร็จและมีแถวใหม่ในตาราง `facebook_tokens`
7. ทดสอบ `/api/sync-facebook` อีกครั้งหลังจากนั้น เพื่อยืนยันว่ายังอ่าน token ได้ปกติ (คราวนี้จาก Supabase แทน env var โดยตรง)

## Environment variables ที่ระบบใช้งาน

ระบุเฉพาะชื่อ ไม่บันทึกค่าจริง:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FB_PAGE_ID`
- `FB_PAGE_ACCESS_TOKEN` (bootstrap เท่านั้น หลัง refresh ครั้งแรกระบบจะอ่านจาก Supabase แทน)
- `FB_APP_ID` (ใหม่)
- `FB_APP_SECRET` (ใหม่ — ความลับ)
- `CRON_SECRET`
- `GEOCODING_API_KEY`

## แนวคิดต่อยอด (ยังไม่ได้ทำ ไม่บล็อกการใช้งาน)

- แจ้งเตือนผ่าน Slack/LINE/Email เมื่อ token refresh ล้มเหลว (ตอนนี้เห็นได้แค่ใน Vercel Cron Jobs log)
- รองรับหลายเพจ Facebook พร้อมกัน (ตาราง `facebook_tokens` ออกแบบให้ต่อยอดได้อยู่แล้วเพราะ key ด้วย `page_id`)
