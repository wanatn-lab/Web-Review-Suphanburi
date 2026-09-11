"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { filterMustVisitCandidates, MUST_VISIT_COLLECTION_LIMIT } from "@/lib/must-visit";
import { saveMustVisitOrder, setMustVisit } from "./actions";

export interface MustVisitItem { id: string; title: string; location_text: string | null; category: string | null; }

export function MustVisitManager({ pinned, available }: { pinned: MustVisitItem[]; available: MustVisitItem[] }) {
  const [items, setItems] = useState(pinned);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const busyRef = useRef(false);
  const router = useRouter();
  const filteredAvailable = useMemo(() => filterMustVisitCandidates(available, query), [available, query]);
  const atLimit = items.length >= MUST_VISIT_COLLECTION_LIMIT;

  useEffect(() => setItems(pinned), [pinned]);

  async function run(task: () => Promise<void>, successMessage: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    setStatus(null);

    try {
      await task();
      setStatus({ kind: "success", text: successMessage });
      router.refresh();
    } catch {
      setStatus({ kind: "error", text: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" });
      router.refresh();
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  }

  function persist(next: MustVisitItem[]) {
    if (busyRef.current) return;
    setItems(next);
    void run(() => saveMustVisitOrder(next.map((item) => item.id)), "บันทึกลำดับแล้ว");
  }

  function move(from: number, to: number) {
    if (busyRef.current || to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    persist(next);
  }

  return (
    <section
      aria-busy={saving}
      className="mt-8 rounded-2xl border border-orange-200 bg-[#FFF8F5] p-5 dark:border-orange-900/50 dark:bg-orange-950/20"
    >
      <h2 className="text-lg font-extrabold">มาสุพรรณบุรีต้องแวะ</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        ปักหมุดสถานที่ แล้วลากหรือใช้ปุ่มลูกศรเพื่อเรียงลำดับ
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        ปักหมุดแล้ว {items.length}/{MUST_VISIT_COLLECTION_LIMIT} รายการ · หน้าแรกแสดง 6 รายการแรก
      </p>

      <div aria-live="polite" aria-atomic="true">
        {status && (
          <p
            className={`mt-3 rounded-lg p-3 text-sm ${
              status.kind === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            {status.text}
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-orange-200 p-4 text-sm text-neutral-500">
          ยังไม่มีพิกัดที่ปักหมุด แนะนำให้เลือก 3–6 รายการสำหรับหน้าแรก
        </p>
      ) : (
        <ol className="mt-5 space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              draggable={!saving}
              onDragStart={(event) => {
                if (busyRef.current) {
                  event.preventDefault();
                  return;
                }
                setDragId(item.id);
              }}
              onDragEnd={() => setDragId(null)}
              onDragOver={(event) => {
                if (!busyRef.current) event.preventDefault();
              }}
              onDrop={() => {
                if (busyRef.current) return;
                const from = items.findIndex((entry) => entry.id === dragId);
                if (from >= 0) move(from, index);
                setDragId(null);
              }}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-white p-3 shadow-sm dark:border-orange-900/50 dark:bg-neutral-900"
            >
              <span className={`select-none text-lg text-[#B62F08] ${saving ? "cursor-wait" : "cursor-grab"}`} aria-hidden="true">⠿</span>
              <span className="w-6 text-sm font-extrabold text-[#B62F08]">{index + 1}</span>
              <div className="min-w-40 flex-1">
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-neutral-500">{item.location_text ?? "ไม่ระบุพื้นที่"}</p>
              </div>
              <button type="button" onClick={() => move(index, index - 1)} disabled={saving || index === 0} className="min-h-11 min-w-11 rounded-lg border px-2 py-1 text-sm disabled:opacity-40" aria-label={`เลื่อน ${item.title} ขึ้น`}>↑</button>
              <button type="button" onClick={() => move(index, index + 1)} disabled={saving || index === items.length - 1} className="min-h-11 min-w-11 rounded-lg border px-2 py-1 text-sm disabled:opacity-40" aria-label={`เลื่อน ${item.title} ลง`}>↓</button>
              <button
                type="button"
                onClick={() => void run(() => setMustVisit(item.id, false), `เลิกปักหมุด ${item.title} แล้ว`)}
                disabled={saving}
                className="min-h-11 rounded-lg px-3 py-1 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                aria-label={`เลิกปักหมุด ${item.title}`}
              >
                เลิกปักหมุด
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold">รีวิวที่ปักหมุดได้</h3>
          <p className="mt-1 text-xs text-neutral-500">ค้นจากชื่อ สถานที่ หรือหมวดหมู่</p>
        </div>
        <label className="w-full sm:w-72">
          <span className="sr-only">ค้นหารีวิวที่ปักหมุดได้</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหารีวิว..."
            className="min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-[#DA3D0D] focus:outline-none focus:ring-2 focus:ring-[#DA3D0D]/30"
          />
        </label>
      </div>

      {atLimit && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          ครบ {MUST_VISIT_COLLECTION_LIMIT} รายการแล้ว ต้องเลิกปักหมุดอย่างน้อย 1 รายการก่อนเพิ่มใหม่
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {filteredAvailable.length === 0 ? (
          <p className="text-sm text-neutral-500">{query.trim() ? "ไม่พบรีวิวที่ตรงกับคำค้น" : "ไม่มีรีวิวอื่นในระบบ"}</p>
        ) : (
          filteredAvailable.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-neutral-500">{item.location_text ?? "ไม่ระบุพื้นที่"}</p>
              </div>
              <button
                type="button"
                onClick={() => void run(() => setMustVisit(item.id, true), `ปักหมุด ${item.title} แล้ว`)}
                disabled={saving || atLimit}
                className="min-h-11 shrink-0 rounded-lg bg-[#DA3D0D] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                aria-label={`ปักหมุด ${item.title}`}
              >
                ปักหมุด
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
