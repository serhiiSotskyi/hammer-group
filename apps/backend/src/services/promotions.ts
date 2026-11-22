import type { PrismaClient, Promotion } from "@prisma/client";

export type ActivePromotion = Promotion & { products: { productId: number }[] };
export type ProductTarget = { id: number; categoryId: number; collectionId: number | null };

export const PROMO_GROUP_ID = "promotion";

/** Promotions that are switched on and inside their date window, highest priority first. */
export function getActivePromotions(prisma: PrismaClient, now = new Date()): Promise<ActivePromotion[]> {
  return prisma.promotion.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: { products: { select: { productId: true } } },
    orderBy: [{ priority: "desc" }, { id: "desc" }],
  }) as Promise<ActivePromotion[]>;
}

/**
 * Targeting rules (OR-ed): listed products, a collection, or a whole category.
 * A collection target is more specific than its category, so categoryId is ignored when collectionId is set.
 * A promotion with no target at all applies to every product.
 */
export function appliesTo(promo: ActivePromotion, product: ProductTarget): boolean {
  const hasProducts = promo.products.length > 0;
  const hasTarget = hasProducts || promo.collectionId != null || promo.categoryId != null;
  if (!hasTarget) return true;
  if (hasProducts && promo.products.some((p) => p.productId === product.id)) return true;
  if (promo.collectionId != null) return promo.collectionId === product.collectionId;
  if (promo.categoryId != null) return promo.categoryId === product.categoryId;
  return false;
}

/** Discount in the same minor units as `totalCents` (USD cents in the pricing engine). */
export function discountFor(promo: Pick<Promotion, "kind" | "value">, totalCents: number): number {
  if (totalCents <= 0 || promo.value == null) return 0;
  if (promo.kind === "PERCENT") {
    const pct = Math.min(90, Math.max(0, promo.value));
    return Math.round((totalCents * pct) / 100);
  }
  if (promo.kind === "AMOUNT_OFF") return Math.min(Math.max(0, promo.value), totalCents);
  return 0; // ANNOUNCEMENT: shown on the site, never changes prices
}

/** One promotion per product: highest priority wins, then the biggest discount. No stacking. */
export function bestPromotion(
  promos: ActivePromotion[],
  product: ProductTarget,
  totalCents: number,
): { promo: ActivePromotion; discountCents: number } | null {
  let best: { promo: ActivePromotion; discountCents: number } | null = null;
  for (const promo of promos) {
    if (!appliesTo(promo, product)) continue;
    const d = discountFor(promo, totalCents);
    if (d <= 0) continue;
    if (!best || promo.priority > best.promo.priority || (promo.priority === best.promo.priority && d > best.discountCents)) {
      best = { promo, discountCents: d };
    }
  }
  return best;
}

export const promoLabel = (p: Pick<Promotion, "kind" | "value">) =>
  p.kind === "PERCENT" ? `−${p.value}%` : p.kind === "AMOUNT_OFF" ? "знижка" : "";

/** Public, non-sensitive view of a promotion. */
export const publicPromotion = (p: Promotion) => ({
  id: p.id,
  title: p.title,
  subtitle: p.subtitle,
  kind: p.kind,
  value: p.value,
  label: promoLabel(p),
  endsAt: p.endsAt,
  imageUrl: p.imageUrl,
});

/** Popup codes are free text from visitors: keep them short and uppercase, or drop them. */
export function sanitizePromoCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
  return code || null;
}
