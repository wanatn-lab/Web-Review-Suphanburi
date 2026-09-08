import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "รีวิวสุพรรณบุรี - รวมร้านอาหาร คาเฟ่ และที่เที่ยว";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #DA3D0D 0%, #FF7A1A 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", fontSize: 56, fontWeight: 800, letterSpacing: "-2px" }}>
          รีวิวสุพรรณบุรี
        </div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 28, textAlign: "center" }}>
          รวมร้านอาหาร คาเฟ่ ที่เที่ยว และที่พัก<br />อัปเดตจากคลิปรีวิวจริง
        </div>
        <div style={{ background: "#FFDD00", borderRadius: 999, color: "#20140D", display: "flex", fontSize: 24, fontWeight: 700, marginTop: 40, padding: "12px 28px" }}>
          #ReviewSuphan
        </div>
      </div>
    ),
    size
  );
}
