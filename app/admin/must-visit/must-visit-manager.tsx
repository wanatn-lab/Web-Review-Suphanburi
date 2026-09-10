"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMustVisitOrder, setMustVisit } from "./actions";

export interface MustVisitItem { id: string; title: string; location_text: string | null; category: string | null; }

export function MustVisitManager({ pinned, available }: { pinned: MustVisitItem[]; available: MustVisitItem[] }) {
  const [items, setItems] = useState(pinned);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => setItems(pinned), [pinned]);

  function run(task: () => Promise<void>) {
    setMessage("");
    startTransition(async () => { try { await task(); router.refresh(); } catch { setMessage("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง"); router.refresh(); } });
  }
  function persist(next: MustVisitItem[]) { setItems(next); run(() => saveMustVisitOrder(next.map((item) => item.id))); }
  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); persist(next);
  }

  return <section className="mt-8 rounded-2xl border border-orange-200 bg-[#FFF8F5] p-5 dark:border-orange-900/50 dark:bg-orange-950/20">
    <h2 className="text-lg font-extrabold">มาสุพรรณบุรีต้องแวะ</h2>
    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">ปักหมุดสถานที่ แล้วลากเพื่อเรียงลำดับที่แสดงบนหน้าเว็บ</p>
    {message && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{message}</p>}
    <div className="mt-5 space-y-2">
      {items.length === 0 ? <p className="rounded-xl border border-dashed border-orange-200 p-4 text-sm text-neutral-500">ยังไม่มีพิกัดที่ปักหมุด</p> : items.map((item, index) => <div key={item.id} draggable onDragStart={() => setDragId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { const from = items.findIndex((entry) => entry.id === dragId); if (from >= 0) move(from, index); setDragId(null); }} className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-white p-3 shadow-sm dark:border-orange-900/50 dark:bg-neutral-900">
        <span className="cursor-grab select-none text-lg text-[#B62F08]" aria-hidden="true">⠿</span>
        <span className="w-6 text-sm font-extrabold text-[#B62F08]">{index + 1}</span>
        <div className="min-w-40 flex-1"><p className="font-semibold">{item.title}</p><p className="text-xs text-neutral-500">{item.location_text ?? "ไม่ระบุพื้นที่"}</p></div>
        <button type="button" onClick={() => move(index, index - 1)} disabled={pending || index === 0} className="min-h-11 min-w-11 rounded-lg border px-2 py-1 text-sm disabled:opacity-40" aria-label="เลื่อนขึ้น">↑</button>
        <button type="button" onClick={() => move(index, index + 1)} disabled={pending || index === items.length - 1} className="min-h-11 min-w-11 rounded-lg border px-2 py-1 text-sm disabled:opacity-40" aria-label="เลื่อนลง">↓</button>
        <button type="button" onClick={() => run(() => setMustVisit(item.id, false))} disabled={pending} className="min-h-11 rounded-lg px-2 py-1 text-sm font-bold text-red-700 hover:bg-red-50">เลิกปักหมุด</button>
      </div>)}</div>
    <h3 className="mt-8 text-base font-extrabold">รีวิวที่ปักหมุดได้</h3>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {available.length === 0 ? <p className="text-sm text-neutral-500">ไม่มีรีวิวอื่นในระบบ</p> : available.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"><div><p className="text-sm font-semibold">{item.title}</p><p className="text-xs text-neutral-500">{item.location_text ?? "ไม่ระบุพื้นที่"}</p></div><button type="button" onClick={() => run(() => setMustVisit(item.id, true))} disabled={pending} className="min-h-11 rounded-lg bg-[#DA3D0D] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">ปักหมุด</button></div>)}
    </div>
  </section>;
}