-- Audited public review corrections (28 September 2026).
-- Guard the current values so subsequent editorial changes are preserved.
-- Apply after reviewing the affected rows; no schema or permission changes.
BEGIN;

UPDATE public.reviews
SET category = 'food', updated_at = now()
WHERE slug = 'zon-saep-uthong' AND category = 'trip' AND deleted_at IS NULL;

UPDATE public.reviews
SET description = 'คลิปนี้กล่าวถึงพิธีอาบน้ำว่านดอกไม้ทองเพชรกลับที่วัดพระลอย อำเภอเมือง จังหวัดสุพรรณบุรี โดยกำหนดการในข้อมูลต้นฉบับคือวันอาทิตย์ที่ 26 เมษายน 2569 เวลา 11:00 น. วันที่ดังกล่าวผ่านไปแล้ว หากต้องการเข้าร่วมพิธีครั้งถัดไป ควรตรวจสอบกำหนดการล่าสุดกับวัดก่อนเดินทาง', updated_at = now()
WHERE slug = 'temple' AND deleted_at IS NULL
  AND description = 'พิธีอาบน้ำว่านดอกไม้ทองเพชรกลับ พิธีที่เสริมความเป็นสิริมงคล ให้กับชีวิต จะจัดขึ้นในวันอาทิตย์ที่ 26 เมษายน 2569 ที่วัดพระลอย อำเภอเมืองจังหวัดสุพรรณบุรี สำหรับญาติโยมที่มีศรัทธาและต้องการพลิกชีวิตให้ดีขึ้น สามารถเข้าร่วมพิธีได้เริ่มตั้งแต่เวลา 11:00 น เป็นต้นไป';

UPDATE public.reviews
SET title = replace(title, 'สไลต์ญี่ปุ่น', 'สไตล์ญี่ปุ่น'),
    description = replace(description, 'สไลต์ญี่ปุ่น', 'สไตล์ญี่ปุ่น'),
    updated_at = now()
WHERE slug = 'sakiso-market' AND deleted_at IS NULL
  AND title = 'ร้านเครื่องเขียนสไลต์ญี่ปุ่น Sakiso สุพรรณบุรี'
  AND description = 'ร้าน Sakiso เปิดใหม่ในห้างโรบินสัน ไลฟ์สไตล์สุพรรณบุรี นำเสนอเครื่องเขียนสไลต์ญี่ปุ่น น่ารักและน่าสนใจ รวมถึงอุปกรณ์สำนักงานและ gadget ที่น่าสนใจ นอกจากนี้ยังมีสินค้าลายการ์ตูนลิขสิทธิ์ เช่น BooBooGoose และ Milky Puppi ที่น่าสนใจสำหรับเด็กๆ และผู้ใหญ่ที่ชื่นชอบการ์ตูน พิกัดอยู่ที่ชั้น 2 ของห้างโรบินสัน ไลฟ์สไตล์ สุพรรณบุรี ใกล้กับธนาคารไทยพาณิชย์และศูนย์อาหาร';

COMMIT;
