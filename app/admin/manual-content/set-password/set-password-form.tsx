"use client";

// ฟอร์ม "ตั้งรหัสผ่านแอดมิน" — ใช้เปิดจากลิงก์เชิญ/รีเซ็ตรหัสผ่านที่ Supabase Auth
// ส่งให้ทางอีเมลเท่านั้น (ตอนผู้ดูแลระบบกด "Invite user" ในหน้า Supabase Dashboard
// ให้อีเมลใน ADMIN_ALLOWED_EMAILS) ลิงก์นั้นจะแนบ token มาใน URL แล้ว Supabase client
// (detectSessionInUrl: true ใน lib/supabase-browser-auth.ts) จะอ่านให้เองอัตโนมัติ
// ตอนหน้าโหลด — ถ้าไม่มี token/หมดอายุแล้ว จะไม่มี session ให้ตั้งรหัสผ่านได้

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowserAuthClient } from "@/lib/supabase-browser-auth";

type Status = "checking" | "ready" | "no-session" | "saving" | "done";

const passwordInputClass =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#DA3D0D] focus:ring-2 focus:ring-[#DA3D0D]/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export function SetPasswordForm() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserAuthClient();

    supabase.auth.getSession().then(({ data }) => {
      setStatus((current) => (current === "checking" ? (data.session ? "ready" : "no-session") : current));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus((current) => {
        if (current === "saving" || current === "done") return current;
        return session ? "ready" : "no-session";
      });
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setStatus("saving");
    const supabase = getSupabaseBrowserAuthClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message || "ตั้งรหัสผ่านไม่สำเร็จ ลองใหม่อีกครั้ง");
      setStatus("ready");
      return;
    }

    // เคลียร์ session ของ Supabase Auth ในเบราว์เซอร์ทิ้ง — หน้านี้ใช้แค่ตอนตั้ง/
    // เปลี่ยนรหัสผ่านครั้งเดียว การ login เข้าแอดมินจริงใช้ ADMIN_SESSION_COOKIE
    // คนละใบผ่านหน้า /admin/manual-content ตามปกติ ไม่ต้องพึ่ง session นี้ต่อ
    await supabase.auth.signOut();
    setStatus("done");
  }

  if (status === "checking") {
    return <p className="mt-4 text-sm text-neutral-500">กำลังตรวจสอบลิงก์...</p>;
  }

  if (status === "no-session") {
    return (
      <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        ลิงก์นี้หมดอายุหรือไม่ถูกต้อง กรุณาให้ผู้ดูแลระบบส่งลิงก์เชิญ/รีเซ็ตรหัสผ่านใหม่จากหน้า Supabase Dashboard
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          ตั้งรหัสผ่านสำเร็จ ใช้อีเมลนี้พร้อมรหัสผ่านใหม่เข้าสู่ระบบได้เลย
        </div>
        <Link href="/admin/manual-content" className="inline-block text-sm font-bold text-[#B62F08] underline">
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-3">
      <div>
        <label htmlFor="password" className="text-sm font-semibold">รหัสผ่านใหม่</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={256}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={passwordInputClass}
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="text-sm font-semibold">ยืนยันรหัสผ่านใหม่</label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={256}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={passwordInputClass}
        />
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</div>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-2 w-full rounded-xl bg-[#DA3D0D] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#B62F08] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "saving" ? "กำลังบันทึก..." : "บันทึกรหัสผ่าน"}
      </button>
    </form>
  );
}
