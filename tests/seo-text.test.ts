import assert from "node:assert/strict";
import test from "node:test";
import { buildMetaDescription, truncateDescription, MAX_META_DESCRIPTION_LENGTH } from "../lib/seo-text";

test("truncateDescription: leaves short text untouched", () => {
    const text = "รีวิวร้านอาหารอร่อยมาก";
    assert.equal(truncateDescription(text, 155), text);
});

test("truncateDescription: cuts long text down to the limit and adds an ellipsis", () => {
    const long = "ก".repeat(300);
    const result = truncateDescription(long, 155);
    assert.ok([...result].length <= 156, "result (incl. ellipsis) should not exceed limit + 1");
    assert.ok(result.endsWith("…"));
});

test("truncateDescription: backs off to a word boundary instead of cutting mid-word", () => {
    const text = "หนึ่งสองสามสี่ห้า หกเจ็ดแปดเก้าสิบ สิบเอ็ดสิบสองสิบสามสิบสี่สิบห้า สิบหกสิบเจ็ดสิบแปด";
    const result = truncateDescription(text, 20);
    const withoutEllipsis = result.replace(/…$/, "");
    assert.ok(
          text.startsWith(withoutEllipsis) && (text[withoutEllipsis.length] === " " || withoutEllipsis.length === 0),
          `expected a clean word boundary, got "${result}"`
        );
});

test("truncateDescription: does not split an emoji (surrogate pair) in half", () => {
    const text = `${"ก".repeat(19)}😀${"ข".repeat(19)}`;
    const result = truncateDescription(text, 20);
    for (const char of result) {
          assert.ok(char.codePointAt(0) !== undefined);
    }
    assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(result), "must not contain an unpaired high surrogate");
});

test("buildMetaDescription: appends the keyword suffix when it fits", () => {
    const raw = "รีวิวร้านก๋วยเตี๋ยวเจ๊หนู อร่อยน้ำซุปเข้มข้น";
    const result = buildMetaDescription(raw, "ร้านอาหารสุพรรณบุรี, ที่เที่ยวสุพรรณบุรี", MAX_META_DESCRIPTION_LENGTH);
    assert.ok(result.includes("ร้านอาหารสุพรรณบุรี"));
    assert.ok([...result].length <= MAX_META_DESCRIPTION_LENGTH);
});

test("buildMetaDescription: drops the keyword suffix when the raw caption alone is already long", () => {
    const raw =
          "รีวิวร้านอาหาร เจ๊หนูก๋วยเตี๋ยวเรือ สำหรับผู้ที่กำลังค้นหาร้านอาหารสุพรรณบุรีในจังหวัดสุพรรณบุรี " +
          "เมนูแนะนำคือก๋วยเตี๋ยวเรือน้ำตกและก๋วยเตี๋ยวคั่วไก่ รสชาติเข้มข้นถึงเครื่อง เปิดทุกวันตั้งแต่เช้าจรดเย็น " +
          "บรรยากาศร้านเป็นกันเอง ที่จอดรถสะดวกสบายรองรับลูกค้าได้จำนวนมาก";
    const result = buildMetaDescription(raw, "ร้านอาหารสุพรรณบุรี, ที่เที่ยวสุพรรณบุรี", MAX_META_DESCRIPTION_LENGTH);
    assert.ok([...result].length <= MAX_META_DESCRIPTION_LENGTH, `expected <= ${MAX_META_DESCRIPTION_LENGTH} chars, got ${[...result].length}`);
});

test("buildMetaDescription: never exceeds the max length regardless of input length", () => {
    const raw = "รีวิว".repeat(100);
    const result = buildMetaDescription(raw, "ร้านอาหารสุพรรณบุรี, ที่เที่ยวสุพรรณบุรี", MAX_META_DESCRIPTION_LENGTH);
    assert.ok([...result].length <= MAX_META_DESCRIPTION_LENGTH);
});
