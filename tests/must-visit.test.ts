import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHomeReviewSections,
  filterMustVisitCandidates,
  HOME_MUST_VISIT_LIMIT,
  MUST_VISIT_COLLECTION_LIMIT,
} from "@/lib/must-visit";

test("homepage sections exclude must-visit items and do not overlap", () => {
  const reviews = Array.from({ length: 10 }, (_, index) => ({ id: String(index + 1) }));
  const mustVisit = [{ id: "1" }, { id: "2" }];

  const { featuredReviews, latestReviews } = buildHomeReviewSections(reviews, mustVisit, 3, 4);

  assert.deepEqual(featuredReviews.map((review) => review.id), ["3", "4", "5"]);
  assert.deepEqual(latestReviews.map((review) => review.id), ["6", "7", "8", "9"]);
  assert.equal(new Set([...featuredReviews, ...latestReviews].map((review) => review.id)).size, 7);
});

test("admin candidate search matches title, location, and category", () => {
  const items = [
    { title: "ตลาดสามชุก", location_text: "อำเภอสามชุก", category: "market" },
    { title: "คาเฟ่ริมน้ำ", location_text: "อำเภอเมือง", category: "cafe" },
  ];

  assert.deepEqual(filterMustVisitCandidates(items, "สามชุก"), [items[0]]);
  assert.deepEqual(filterMustVisitCandidates(items, "CAFE"), [items[1]]);
  assert.deepEqual(filterMustVisitCandidates(items, "  "), items);
});

test("must-visit limits stay consistent", () => {
  assert.equal(HOME_MUST_VISIT_LIMIT, 6);
  assert.equal(MUST_VISIT_COLLECTION_LIMIT, 100);
});
