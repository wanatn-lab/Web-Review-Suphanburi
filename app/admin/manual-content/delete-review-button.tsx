"use client";

import { deleteManualReview } from "./actions";

export function DeleteReviewButton({ slug, title }: { slug: string; title: string }) {
  return (
    <form
      action={deleteManualReview}
      onSubmit={(event) => {
        if (!window.confirm(`ยืนยันลบ "${title}" ออกจากเว็บไซต์หรือไม่?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="original_slug" value={slug} />
      <input type="hidden" name="confirm_delete" value="DELETE" />
      <button
        type="submit"
        className="text-sm font-semibold text-red-700 underline hover:text-red-900"
      >
        ลบ
      </button>
    </form>
  );
}
