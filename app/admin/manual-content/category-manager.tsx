import { saveCategory } from "./actions";

export interface ManagedCategory {
  slug: string; label: string; seo_title: string | null; seo_description: string | null;
  sort_order: number; is_active: boolean;
}
const inputClass = "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-[#DA3D0D] focus:ring-2 focus:ring-[#DA3D0D]/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export function CategoryManager({ categories }: { categories: ManagedCategory[] }) {
  return (
    <section className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <h2 className="text-lg font-extrabold">จัดการหมวดหมู่</h2>
      <p className="mt-1 text-xs text-neutral-500">ชื่อหมวดชุดนี้ใช้ทั้งเมนูหน้าเว็บ ฟอร์มเพิ่มรีวิว หน้าหมวดหมู่ และ sitemap</p>
      <form action={saveCategory} className="mt-4 grid gap-3 rounded-xl border border-dashed border-neutral-300 p-4 sm:grid-cols-2">
        <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={48} placeholder="slug เช่น local-food" className={inputClass} />
        <input name="label" required maxLength={60} placeholder="ชื่อหมวด เช่น อาหารพื้นบ้าน" className={inputClass} />
        <input name="seo_title" maxLength={120} placeholder="SEO title (ไม่บังคับ)" className={inputClass} />
        <input name="sort_order" type="number" defaultValue={categories.length * 10 + 10} className={inputClass} />
        <textarea name="seo_description" maxLength={300} rows={2} placeholder="SEO description (ไม่บังคับ)" className={"sm:col-span-2 " + inputClass} />
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input name="is_active" type="checkbox" defaultChecked />แสดงหมวดนี้บนหน้าเว็บ</label>
        <button type="submit" className="w-fit rounded-xl bg-[#DA3D0D] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#B62F08] sm:col-span-2">เพิ่มหมวดหมู่</button>
      </form>
      <div className="mt-4 space-y-3">
        {categories.map((category) => (
          <form key={category.slug} action={saveCategory} className="grid gap-3 rounded-xl border border-neutral-200 p-4 sm:grid-cols-2 dark:border-neutral-800">
            <input type="hidden" name="original_slug" value={category.slug} />
            <div><p className="text-xs text-neutral-500">รหัสหมวด (คงที่เพื่อไม่ให้ลิงก์เก่าเสีย)</p><code className="text-sm font-semibold">{category.slug}</code></div>
            <input name="label" required maxLength={60} defaultValue={category.label} className={inputClass} aria-label={"ชื่อหมวด " + category.slug} />
            <input name="seo_title" maxLength={120} defaultValue={category.seo_title ?? ""} placeholder="SEO title (ไม่บังคับ)" className={inputClass} />
            <input name="sort_order" type="number" defaultValue={category.sort_order} className={inputClass} aria-label={"ลำดับ " + category.slug} />
            <textarea name="seo_description" maxLength={300} rows={2} defaultValue={category.seo_description ?? ""} placeholder="SEO description (ไม่บังคับ)" className={"sm:col-span-2 " + inputClass} />
            <label className="flex items-center gap-2 text-sm font-semibold"><input name="is_active" type="checkbox" defaultChecked={category.is_active} />แสดงบนหน้าเว็บ</label>
            <button type="submit" className="justify-self-start rounded-xl border border-[#DA3D0D] px-4 py-2 text-sm font-bold text-[#B62F08] hover:bg-[#FFF2ED]">บันทึกหมวดนี้</button>
          </form>
        ))}
      </div>
    </section>
  );
}
