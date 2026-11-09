import { test } from "node:test";
import assert from "node:assert/strict";
import { appliesTo, discountFor, bestPromotion, sanitizePromoCode, type ActivePromotion } from "./promotions";

const promo = (o: Partial<ActivePromotion>): ActivePromotion => ({
  id: 1, title: "t", subtitle: null, kind: "PERCENT", value: 10, categoryId: null, collectionId: null,
  startsAt: new Date(0), endsAt: null, showInTicker: true, isDealOfWeek: false, showPopup: false, popupCode: null,
  imageUrl: null, priority: 0, isActive: true, createdAt: new Date(0), updatedAt: new Date(0), products: [], ...o,
});
const door = { id: 7, categoryId: 2, collectionId: 4 };

test("untargeted promotion applies sitewide", () => assert.equal(appliesTo(promo({}), door), true));
test("product, collection and category targeting", () => {
  assert.equal(appliesTo(promo({ products: [{ productId: 7 }] }), door), true);
  assert.equal(appliesTo(promo({ products: [{ productId: 8 }] }), door), false);
  assert.equal(appliesTo(promo({ collectionId: 4 }), door), true);
  assert.equal(appliesTo(promo({ collectionId: 3, categoryId: 2 }), door), false); // collection is more specific
  assert.equal(appliesTo(promo({ categoryId: 2 }), door), true);
  assert.equal(appliesTo(promo({ categoryId: 5 }), door), false);
});
test("discount maths", () => {
  assert.equal(discountFor({ kind: "PERCENT", value: 15 }, 20000), 3000);
  assert.equal(discountFor({ kind: "PERCENT", value: 95 }, 10000), 9000); // capped at 90%
  assert.equal(discountFor({ kind: "AMOUNT_OFF", value: 5000 }, 3000), 3000); // never below zero
  assert.equal(discountFor({ kind: "ANNOUNCEMENT", value: 50 }, 10000), 0);
});
test("no stacking: priority first, then biggest discount", () => {
  const a = promo({ id: 1, value: 10, priority: 0 });
  const b = promo({ id: 2, value: 20, priority: 0 });
  const c = promo({ id: 3, value: 5, priority: 5 });
  assert.equal(bestPromotion([a, b], door, 10000)?.promo.id, 2);
  assert.equal(bestPromotion([a, b, c], door, 10000)?.promo.id, 3);
  assert.equal(bestPromotion([promo({ kind: "ANNOUNCEMENT" })], door, 10000), null);
});
test("promo codes are sanitised", () => {
  assert.equal(sanitizePromoCode(" hammer10 "), "HAMMER10");
  assert.equal(sanitizePromoCode("<script>"), "SCRIPT");
  assert.equal(sanitizePromoCode(42), null);
});
