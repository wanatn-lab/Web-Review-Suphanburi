"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { isGoogleMapsLink } from "@/lib/google-maps-link";
import {
  getMapLocationDetails,
  resolveGoogleMapsLink,
  searchMapLocations,
  type MapLocationResult,
  type SelectedMapLocation,
} from "./actions";

type Point = { latitude: number; longitude: number };

export function LocationPicker({
  value,
  onChange,
  inputClass,
  initialSelection = null,
  initialMapsUrl = "",
}: {
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
  initialSelection?: SelectedMapLocation | null;
  initialMapsUrl?: string;
}) {
  const [results, setResults] = useState<MapLocationResult[]>([]);
  const [selected, setSelected] = useState<SelectedMapLocation | null>(initialSelection);
  // A pick only applies while the address box still shows that pick's label,
  // e.g. an imported draft that replaces the address also drops the old pin.
  const activeSelection = selected && selected.label === value ? selected : null;
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const suppressNextSearch = useRef(false);

  // Free option: a link copied from Google Maps "Share". It needs no API key;
  // the pin is read from the link and the public "open in Maps" button opens it.
  const [mapsUrl, setMapsUrl] = useState(initialMapsUrl);
  // When editing a review that already has a link, its saved pin belongs to that link.
  const [linkPoint, setLinkPoint] = useState<Point | null>(
    initialMapsUrl.trim() && initialSelection
      ? { latitude: initialSelection.latitude, longitude: initialSelection.longitude }
      : null,
  );
  const [linkNotice, setLinkNotice] = useState("");
  const [isResolving, startResolving] = useTransition();
  const lastResolved = useRef(initialMapsUrl.trim());

  // The pasted link wins over a search pick: it is the exact venue the editor chose.
  const point: Point | null = linkPoint ?? activeSelection;
  const validMapsUrl = isGoogleMapsLink(mapsUrl.trim()) ? mapsUrl.trim() : "";

  function resolveLink(link: string) {
    lastResolved.current = link;
    setLinkNotice("กำลังอ่านพิกัดจากลิงก์…");
    startResolving(async () => {
      const result = await resolveGoogleMapsLink(link);
      if ("error" in result) {
        setLinkPoint(null);
        setLinkNotice(result.error);
        return;
      }
      const hasPin = result.latitude !== null && result.longitude !== null;
      setLinkPoint(hasPin ? { latitude: result.latitude as number, longitude: result.longitude as number } : null);
      // Fill the place name only when the address box is empty or holds a link.
      if (result.name && (!value.trim() || isGoogleMapsLink(value.trim()))) {
        suppressNextSearch.current = true;
        onChange(result.name);
      }
      setLinkNotice(
        hasPin
          ? `ได้พิกัดแล้ว${result.name ? `: ${result.name}` : ""} — ปุ่ม "เปิดพิกัด" บนเว็บจะเปิดลิงก์นี้`
          : "บันทึกลิงก์ได้ แต่อ่านพิกัดจากลิงก์ไม่ได้ — ปุ่ม \"เปิดพิกัด\" บนเว็บยังเปิดหน้าร้านจากลิงก์นี้ได้",
      );
    });
  }

  // Resolve a pasted/typed link shortly after the editor stops typing.
  useEffect(() => {
    const link = mapsUrl.trim();
    if (!link) {
      setLinkPoint(null);
      setLinkNotice("");
      lastResolved.current = "";
      return;
    }
    if (link === lastResolved.current) return;
    if (!isGoogleMapsLink(link)) {
      setLinkPoint(null);
      setLinkNotice("ลิงก์นี้ไม่ใช่ลิงก์ Google Maps (คัดลอกจากปุ่ม \"แชร์\" ในแอป Google Maps)");
      return;
    }
    const timer = window.setTimeout(() => resolveLink(link), 300);
    return () => window.clearTimeout(timer);
  }, [mapsUrl]);

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
        setNotice(`${result.error ?? "ค้นหาสถานที่ไม่สำเร็จ"} — ใช้ช่อง "ลิงก์ Google Maps" ด้านบนแทนได้`);
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
    // A Maps link pasted into the name box belongs in the link box.
    if (isGoogleMapsLink(query)) {
      setResults([]);
      setNotice("");
      setMapsUrl(query);
      suppressNextSearch.current = true;
      onChange("");
      return;
    }
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
    <div className="space-y-4">
      <div>
        <label htmlFor="google_maps_url_input" className="text-sm font-semibold">ลิงก์ Google Maps</label>
        <input
          id="google_maps_url_input"
          type="url"
          inputMode="url"
          maxLength={2048}
          className={inputClass}
          value={mapsUrl}
          onChange={(event) => setMapsUrl(event.target.value)}
          placeholder="https://maps.app.goo.gl/…"
        />
        <input type="hidden" name="google_maps_url" value={validMapsUrl} />
        <p className="mt-1 text-xs text-neutral-500">เปิดร้านในแอป Google Maps → กด &quot;แชร์&quot; → คัดลอกลิงก์ แล้ววางที่นี่ (ฟรี ไม่ต้องใช้ API)</p>
        {(isResolving || linkNotice) && <p className="mt-2 text-xs text-neutral-600">{isResolving ? "กำลังอ่านพิกัดจากลิงก์…" : linkNotice}</p>}
      </div>

      <div>
        <label htmlFor="address" className="text-sm font-semibold">ชื่อสถานที่ / ที่อยู่</label>
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
            placeholder="พิมพ์ชื่อร้าน หรือเว้นไว้ให้ระบบเติมจากลิงก์"
          />
          <button type="button" onClick={() => search()} disabled={isPending} className="shrink-0 rounded-xl border border-[#DA3D0D] px-3 text-sm font-bold text-[#B62F08] hover:bg-[#FFF2ED] disabled:cursor-wait disabled:opacity-60">
            {isPending ? "กำลังค้นหา…" : "ค้นหา"}
          </button>
        </div>
        <input type="hidden" name="latitude" value={point?.latitude ?? ""} />
        <input type="hidden" name="longitude" value={point?.longitude ?? ""} />
        <input type="hidden" name="google_place_id" value={linkPoint ? "" : activeSelection?.placeId ?? ""} />
        <p className="mt-1 text-xs text-neutral-500">ใช้เป็นที่อยู่ที่แสดงในข้อมูลรีวิว (ปุ่มค้นหาใช้ได้เมื่อเปิด Places API แล้ว)</p>
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
    </div>
  );
}
