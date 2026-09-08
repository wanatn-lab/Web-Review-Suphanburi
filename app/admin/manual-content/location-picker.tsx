"use client";

import { useState } from "react";

interface LocationResult {
  label: string;
  latitude: number;
  longitude: number;
}

export function LocationPicker({
  value,
  onChange,
  inputClass,
}: {
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
}) {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [selected, setSelected] = useState<LocationResult | null>(null);
  const [notice, setNotice] = useState("");

  async function search() {
    const query = value.trim();
    if (query.length < 3) {
      setNotice("พิมพ์อย่างน้อย 3 ตัวอักษร");
      setResults([]);
      return;
    }

    setNotice("กำลังค้นหาใน Google Maps…");
    setResults([]);
    try {
      const response = await fetch(`/api/location-search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const payload = await response.json() as { results?: LocationResult[]; error?: string };
      if (!response.ok) {
        setNotice(payload.error ?? "ค้นหาสถานที่ไม่สำเร็จ");
        return;
      }
      setResults(payload.results ?? []);
      setNotice((payload.results?.length ?? 0) ? "เลือกสถานที่ที่ตรงที่สุด" : "ไม่พบผลลัพธ์ ลองเพิ่มชื่ออำเภอหรือจุดสังเกต");
    } catch {
      setNotice("ค้นหาสถานที่ไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  function selectLocation(result: LocationResult) {
    onChange(result.label);
    setSelected(result);
    setResults([]);
    setNotice(`เลือกแล้ว: ${result.label}`);
  }

  return (
    <div>
      <label htmlFor="address" className="text-sm font-semibold">ค้นหาสถานที่บน Google Maps</label>
      <div className="mt-1 flex gap-2">
        <input
          id="address"
          name="address"
          required
          maxLength={500}
          className={inputClass.replace("mt-1 ", "")}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setSelected(null);
          }}
          placeholder="เช่น ชื่อร้าน + อำเภอ หรือชื่อสถานที่"
        />
        <button type="button" onClick={search} className="shrink-0 rounded-xl border border-[#DA3D0D] px-3 text-sm font-bold text-[#B62F08] hover:bg-[#FFF2ED]">
          ค้นหา
        </button>
      </div>
      <input type="hidden" name="latitude" value={selected?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={selected?.longitude ?? ""} />
      <p className="mt-1 text-xs text-neutral-500">พิมพ์ค้นหา แล้วเลือกผลลัพธ์เพื่อบันทึกพิกัดจริงพร้อมที่อยู่</p>
      {notice && <p className="mt-2 text-xs text-neutral-600">{notice}</p>}
      {results.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
          {results.map((result) => (
            <li key={`${result.latitude},${result.longitude},${result.label}`}>
              <button type="button" onClick={() => selectLocation(result)} className="w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[#FFF2ED] dark:border-neutral-800 dark:hover:bg-neutral-800">
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
