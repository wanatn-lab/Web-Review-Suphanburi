-- Editorial SEO enrichment: replace short/keyword-heavy restaurant summaries
-- with factual, location-specific copy. Details are based on the existing
-- review records and publicly available restaurant listings/reviews checked
-- on 2026-09-13. No ratings or AggregateRating claims are added.

UPDATE public.reviews
SET
  title = 'โกปี๊ หลังโรงไม้ สุพรรณบุรี ร้านอาหารเช้าและติ่มซำ',
  description = 'โกปี๊ หลังโรงไม้ เป็นร้านอาหารเช้าและติ่มซำในตำบลท่าพี่เลี้ยง อำเภอเมืองสุพรรณบุรี ที่อยู่ 21/9 ถนนขุนช้าง เมนูที่พบในข้อมูลร้านและรีวิวสาธารณะ ได้แก่ ติ่มซำนึ่งสด ไข่กระทะ โจ๊ก บะกุ๊ดเต๋ ขนมปัง และกาแฟโกปี๊หรือชาใต้ชัก โดยเลือกติ่มซำจากตู้แล้วนำไปนึ่งก่อนเสิร์ฟ ร้านมีทั้งโซนห้องแอร์และโซนเปิดโล่ง พร้อมบรรยากาศน้ำตกจำลองและที่จอดรถตามข้อมูลรีวิว แหล่งข้อมูลร้านอาหารระบุเวลาเปิดประมาณ 07.00–14.00 น. จึงเหมาะกับคนที่กำลังค้นหาร้านอาหารเช้าสุพรรณบุรี ร้านติ่มซำสุพรรณบุรี หรือร้านดังในเมืองสุพรรณบุรี ควรตรวจสอบเวลาและเมนูล่าสุดก่อนเดินทาง'
WHERE slug = 'food-40267fab' AND deleted_at IS NULL;

UPDATE public.reviews
SET
  description = 'เรื่องชวนหวาน เป็นคาเฟ่ขนมหวานในอำเภอศรีประจันต์ จังหวัดสุพรรณบุรี เหมาะสำหรับคนที่กำลังหาร้านนั่งพักระหว่างเที่ยวหรือขับรถผ่านย่านศรีประจันต์ เมนูเด่นที่ระบุไว้ในรีวิวคือเค้กโฮมเมดและสมูทตี้จากผลไม้แท้ มีขนมและเครื่องดื่มให้เลือกสำหรับมื้อเบา ๆ หรือของหวานหลังอาหาร บทความนี้รวมพิกัดร้านและภาพบรรยากาศจากการรีวิวไว้ให้วางแผนแวะได้ง่ายขึ้น ควรตรวจสอบเวลาเปิดทำการและเมนูประจำวันกับร้านก่อนเดินทาง'
WHERE slug = 'food-03af9533' AND deleted_at IS NULL;

UPDATE public.reviews
SET
  description = 'ก๋วยเตี๋ยวเรือผักไห่ เป็นร้านก๋วยเตี๋ยวเรือในเมืองสุพรรณบุรีที่นำเสนอสูตรโบราณจากลาดชะโด โดยข้อมูลรีวิวระบุว่าเปิดมานานกว่า 30 ปีและเสิร์ฟรสเข้มข้นจนหลายคนรับประทานได้โดยไม่ต้องปรุงเพิ่ม พิกัดอยู่บนถนนมะสีมอก ตำบลรั้วใหญ่ อำเภอเมืองสุพรรณบุรี เหมาะกับผู้ที่ค้นหาก๋วยเตี๋ยวเรือสุพรรณบุรี ร้านอาหารอร่อยในเมืองสุพรรณบุรี หรือเมนูเส้นสูตรโบราณ หน้านี้สรุปจุดเด่นจากรีวิวและแสดงพิกัดสำหรับวางแผนแวะ ควรตรวจสอบเวลาเปิดและคิวล่าสุดก่อนเดินทาง'
WHERE slug = '30-food' AND deleted_at IS NULL;

-- This imported video was labelled as Suphan Buri, but its stored coordinates
-- and public listing point to Nonthaburi. Keep the record recoverable while
-- removing the misleading local page from public listings and sitemaps.
UPDATE public.reviews
SET deleted_at = COALESCE(deleted_at, now())
WHERE slug = 'yt-vn9-Gna_pRI'
  AND location_text ILIKE '%Nonthaburi%';
