"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  getMapLocationDetails,
  searchMapLocations,
  type MapLocationResult,
  type SelectedMapLocation,
} from "./actions";

export function LocationPicker({
  value,
  onChange,
  inputClass,
}: {
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
}) {
  const [results, setResults] = useState<MapLocationResult[]>([]);
  const [selected, setSelected] = useState<SelectedMapLocation | null>(null);
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const suppressNextSearch = useRef(false);

  function search(query = value.trim()) {
    if (query.length < 3) {
      setNotice("พิมพ์อย่างน้อย 3 ตัวอักษร");
      setResults([]);
      return;
    }

    setNotice("กำลังค้นหาใน Google Maps…");
    setResults([]);
    startTransition(async () => {
      const result = await searchMapLocations(query);
      if ("error" in result) {
        setNotice(result.error ?? "ค้นหาสถานที่ไม่สำเร็จ");
        return;
      }
      setResults(result.results);
      setNotice("เลือกสถานที่ที่ตรงที่สุดจากรายการด้านล่าง");
    });
  }

  // Behaves like Google Maps: pause typing briefly and see place suggestions.
  useEffect(() => {
    if (suppressNextSearch.current) {
      suppressNextSearch.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 3) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => search(query), 450);
    return () => window.clearTimeout(timer);
  }, [value]);

  function selectLocation(result: MapLocationResult) {
    setNotice("กำลังดึงพิกัดของสถานที่…");
    setResults([]);
    startTransition(async () => {
      const details = await getMapLocationDetails(result.placeId);
      if ("error" in details) {
        setNotice(details.error);
        return;
      }
      suppressNextSearch.current = true;
      onChange(details.label);
      setSelected(details);
      setNotice(`เลือกแล้ว: ${details.label}`);
    });
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
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              search();
            }
          }}
          placeholder="พิมพ์ชื่อร้าน แล้วเลือกคำแนะนำจาก Google Maps"
        />
        <button type="button" onClick={() => search()} disabled={isPending} className="shrink-0 rounded-xl border border-[#DA3D0D] px-3 text-sm font-bold text-[#B62F08] hover:bg-[#FFF2ED] disabled:cursor-wait disabled:opacity-60">
          {isPending ? "กำลังค้นหา…" : "ค้นหา"}
        </button>
      </div>
      <input type="hidden" name="latitude" value={selected?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={selected?.longitude ?? ""} />
      <p className="mt-1 text-xs text-neutral-500">พิมพ์ชื่อร้าน ระบบจะแนะนำสถานที่จาก Google Maps ให้เลือกโดยอัตโนมัติ</p>
      {notice && <p className="mt-2 text-xs text-neutral-600">{notice}</p>}
      {results.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          {results.map((result) => (
            <li key={result.placeId}>
              <button type="button" onClick={() => selectLocation(result)} disabled={isPending} className="w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[#FFF2ED] disabled:opacity-60 dark:border-neutral-800 dark:hover:bg-neutral-800">
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
