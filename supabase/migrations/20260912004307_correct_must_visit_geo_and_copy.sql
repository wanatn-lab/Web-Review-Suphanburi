-- These two records had the same coordinate pair despite different addresses.
-- Remove the unverified precision; the website falls back to a Maps text search
-- until an editor chooses the correct map suggestion for each business.
update public.reviews
set latitude = null,
    longitude = null
where slug in ('food-40267fab', 'food-541229fd')
  and latitude = 14.4760659
  and longitude = 100.1149081;

-- Replace the imported caption (including its typo) with a clear, factual
-- summary of the video for the restaurant's local-intent searches.
update public.reviews
set title = 'กิมเง็ก ข้าวหมูแดง หมูกรอบ สุพรรณบุรี',
    description = 'กิมเง็ก ข้าวหมูแดง เป็นร้านข้าวหมูแดงในเมืองสุพรรณบุรีที่เด่นด้วยเครื่องแน่นเต็มจาน จากคลิปรีวิวเห็นหมูแดงหั่นชิ้นหนา หมูกรอบ กุนเชียงรมควัน ผักลวก และน้ำราดข้าวหมูแดง เสิร์ฟรวมกันเป็นจานเดียว เหมาะกับคนที่กำลังหาร้านข้าวหมูแดงสุพรรณบุรีหรือร้านอาหารสุพรรณบุรีที่กินง่ายและอิ่มครบ\n\nจุดน่าสนใจของร้านกิมเง็กคือเครื่องเคียงรสจัด 2 แบบ ได้แก่ น้ำพริกเผาสูตรของร้าน และน้ำมันพริกกรอบสไตล์จีน ใช้เพิ่มความเผ็ดและกลิ่นหอมตามชอบ กินคู่กับหมูแดง หมูกรอบ และกุนเชียงช่วยให้แต่ละคำมีรสชาติหลากหลายขึ้น คนที่ค้นหาข้าวหมูแดง หมูกรอบ กุนเชียง หรือของกินในเมืองสุพรรณบุรี สามารถดูวิดีโอรีวิวก่อนตัดสินใจ แล้วกดปุ่มพิกัดเพื่อเปิด Google Maps และนำทางไปร้านได้ทันที'
where slug = 'food-541229fd';
