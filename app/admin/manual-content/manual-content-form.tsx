"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createManualReview,
  importFacebookDraft,
  updateManualReview,
  type FacebookImportState,
} from "./actions";

type FormCategory = "restaurant" | "attraction";

interface FormValues {
  category: FormCategory;
  placeName: string;
  reviewContent: string;
  referenceUrl: string;
  imageUrl: string;
  address: string;
}

export interface EditableManualReview extends FormValues {
  slug: string;
}

interface ManualContentFormProps {
  initialReview?: EditableManualReview | null;
}

const initialImportState: FacebookImportState = { status: "idle" };

const inputClass =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#DA3D0D] focus:ring-2 focus:ring-[#DA3D0D]/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

function emptyValues(): FormValues {
  return {
    category: "restaurant",
    placeName: "",
    reviewContent: "",
    referenceUrl: "",
    imageUrl: "",
    address: "",
  };
}

function ImportSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 rounded-xl border border-[#DA3D0D] px-4 py-2 text-sm font-bold text-[#B62F08] transition hover:bg-[#FFF2ED] disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "กำลังดึงข้อมูล..." : "ดึงข้อมูลเป็นฉบับร่าง"}
    </button>
  );
}

export function ManualContentForm({ initialReview }: ManualContentFormProps) {
  const [importState, importAction] = useFormState(importFacebookDraft, initialImportState);
  const [values, setValues] = useState<FormValues>(initialReview ?? emptyValues());
  const isEditing = Boolean(initialReview);

  useEffect(() => {
    if (importState.status !== "success") return;

    setValues({
      category: importState.draft.category,
      placeName: importState.draft.placeName,
      reviewContent: importState.draft.reviewContent,
      referenceUrl: importState.draft.referenceUrl,
      imageUrl: importState.draft.imageUrl,
      address: importState.draft.address,
    });
  }, [importState]);

  function updateValue<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      {!isEditing && (
        <section className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900/50 dark:bg-orange-950/20">
          <h2 className="text-base font-extrabold">นำเข้าจาก Facebook</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            วางลิงก์โพสต์, Reel หรือวิดีโอโดยตรง ระบบจะดึงคำบรรยายและรูปหน้าปกมาเติมฟอร์มด้านล่างเป็นฉบับร่าง
          </p>
          <form action={importAction} className="mt-3">
            <label htmlFor="facebook_url" className="text-sm font-semibold">ลิงก์ Facebook</label>
            <input
              id="facebook_url"
              name="facebook_url"
              type="url"
              inputMode="url"
              required
              maxLength={2000}
              placeholder="https://www.facebook.com/reel/..."
              className={inputClass}
            />
            <ImportSubmitButton />
          </form>
          {importState.status === "error" && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
              {importState.message}
            </p>
          )}
          {importState.status === "success" && (
            <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950/30 dark:text-green-100">
              {importState.draft.notice}
            </p>
          )}
        </section>
      )}

      <form
        action={isEditing ? updateManualReview : createManualReview}
        className="mt-6 space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        {isEditing && <input type="hidden" name="original_slug" value={initialReview?.slug} />}
        <div>
          <label htmlFor="category" className="text-sm font-semibold">หมวดหมู่</label>
          <select
            id="category"
            name="category"
            required
            className={inputClass}
            value={values.category}
            onChange={(event) => updateValue("category", event.target.value as FormCategory)}
          >
            <option value="restaurant">ร้านอาหาร (Restaurant)</option>
            <option value="attraction">สถานที่ท่องเที่ยว (Attraction)</option>
          </select>
        </div>

        <div>
          <label htmlFor="place_name" className="text-sm font-semibold">ชื่อสถานที่</label>
          <input
            id="place_name"
            name="place_name"
            type="text"
            required
            maxLength={160}
            className={inputClass}
            value={values.placeName}
            onChange={(event) => updateValue("placeName", event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="review_content" className="text-sm font-semibold">รายละเอียด / เนื้อหารีวิว</label>
          <textarea
            id="review_content"
            name="review_content"
            required
            maxLength={6000}
            rows={8}
            className={inputClass}
            value={values.reviewContent}
            onChange={(event) => updateValue("reviewContent", event.target.value)}
          />
          <p className="mt-1 text-xs text-neutral-500">ระบบสร้าง title, slug, H1 และ meta description ให้ตามหมวดหมู่เมื่อบันทึก</p>
        </div>

        <div>
          <label htmlFor="reference_url" className="text-sm font-semibold">ลิงก์โพสต์ Facebook หรือลิงก์อ้างอิง</label>
          <input
            id="reference_url"
            name="reference_url"
            type="url"
            inputMode="url"
            className={inputClass}
            placeholder="https://..."
            value={values.referenceUrl}
            onChange={(event) => updateValue("referenceUrl", event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="image_url" className="text-sm font-semibold">URL รูปภาพ</label>
          <input
            id="image_url"
            name="image_url"
            type="url"
            inputMode="url"
            className={inputClass}
            placeholder="https://..."
            value={values.imageUrl}
            onChange={(event) => updateValue("imageUrl", event.target.value)}
          />
          <p className="mt-1 text-xs text-neutral-500">ตรวจ URL รูปก่อนบันทึก หาก Facebook ไม่คืนรูปหน้าปก ให้ใส่ URL รูปเอง</p>
        </div>

        <div>
          <label htmlFor="address" className="text-sm font-semibold">ที่อยู่ / พื้นที่</label>
          <textarea
            id="address"
            name="address"
            required
            maxLength={500}
            rows={3}
            className={inputClass}
            value={values.address}
            onChange={(event) => updateValue("address", event.target.value)}
          />
          <p className="mt-1 text-xs text-neutral-500">ระบบใช้ข้อความนี้หาพิกัดสำหรับ GEO หากตั้งค่า GEOCODING_API_KEY แล้ว</p>
        </div>

        <button type="submit" className="w-full rounded-xl bg-[#DA3D0D] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#B62F08]">
          {isEditing ? "บันทึกการแก้ไข" : "บันทึกและเผยแพร่"}
        </button>
      </form>
    </>
  );
}
