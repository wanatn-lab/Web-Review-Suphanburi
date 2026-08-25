import type { Config } from "tailwindcss";

// tailwind.config.ts
// brand.* colors ให้ตรงกับดีไซน์ที่อนุมัติแล้ว (ส้ม/ขาว/เหลือง/หมุดแดง)
// ใช้แทน bg-[#FF4B12] แบบ arbitrary value ได้ในโค้ดใหม่ๆ ต่อจากนี้

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#FF4B12",
          "orange-deep": "#DA3D0D",
          "orange-strong": "#B62F08",
          "orange-tint": "#FFE3D6",
          yellow: "#FFDD00",
          pin: "#E5342A",
        },
      },
      fontFamily: {
        kanit: ["var(--font-kanit)", "sans-serif"],
        sans: ["var(--font-noto-sans-thai)", "var(--font-kanit)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
