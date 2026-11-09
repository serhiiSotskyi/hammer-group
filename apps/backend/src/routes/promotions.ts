import { Router } from "express";
import type { PrismaClient, Product, PromotionKind } from "@prisma/client";
import { getDailyUsdToUah, convertCentsUsdToUah } from "../services/fx";
import { getActivePromotions, bestPromotion, publicPromotion, sanitizePromoCode, type ActivePromotion } from "../services/promotions";

const KINDS: PromotionKind[] = ["PERCENT", "AMOUNT_OFF", "ANNOUNCEMENT"];
const DAY = 24 * 60 * 60 * 1000;

async function fxConverter(prisma: PrismaClient) {
  try {
    const fx = await getDailyUsdToUah(prisma);
    return { currency: "UAH", conv: (c: number) => convertCentsUsdToUah(c, fx.rate) };
  } catch {
    return { currency: "USD", conv: (c: number) => c };
  }
}

type ProductWithRel = Product & { category?: { slug: string; name: string } | null; collection?: { slug: string; name: string } | null };

function withPromo(p: ProductWithRel, promos: ActivePromotion[], conv: (c: number) => number, currency: string) {
  const best = bestPromotion(promos, p, p.basePriceCents);
  return {
    ...p,
    currency,
    convertedPriceCents: conv(p.basePriceCents),
    promotion: best ? publicPromotion(best.promo) : null,
    promoPriceCents: best ? conv(p.basePriceCents - best.discountCents) : null,
  };
}

/** Public, read-only endpoints. Short cache so admin changes show up within a minute. */
export function publicPromotionRoutes(prisma: PrismaClient) {
  const r = Router();

  r.get("/promotions/active", async (_req, res) => {
    try {
      const promos = await getActivePromotions(prisma);
      const { conv, currency } = await fxConverter(prisma);
      const dealPromo = promos.find((p) => p.isDealOfWeek) ?? null;
      let dealProduct: ReturnType<typeof withPromo> | null = null;
      if (dealPromo) {
        const target = dealPromo.products[0]?.productId;
        const product = await prisma.product.findFirst({
          where: target
            ? { id: target, isActive: true }
            : {
                isActive: true,
                ...(dealPromo.collectionId ? { collectionId: dealPromo.collectionId } : dealPromo.categoryId ? { categoryId: dealPromo.categoryId } : {}),
              },
          include: { category: true, collection: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        });
        if (product) dealProduct = withPromo(product, [dealPromo], conv, currency);
      }
      const popup = promos.find((p) => p.showPopup) ?? null;
      res.set("Cache-Control", "public, max-age=60");
      res.json({
        ticker: promos.filter((p) => p.showInTicker).map(publicPromotion),
        dealOfWeek: dealPromo ? { ...publicPromotion(dealPromo), product: dealProduct } : null,
        popup: popup ? { ...publicPromotion(popup), code: popup.popupCode } : null,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load promotions" });
    }
  });

  // Manual picks (featuredRank) first, then most-requested in the last 30 days, then catalogue order.
  r.get("/products/featured", async (req, res) => {
    try {
      const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 6));
      const include = { category: true, collection: true } as const;
      const manual = await prisma.product.findMany({
        where: { isActive: true, featuredRank: { not: null } },
        include, orderBy: { featuredRank: "asc" }, take: limit,
      });
      const picked = new Set(manual.map((p) => p.id));
      const out: (ProductWithRel & { featuredSource: string })[] = manual.map((p) => ({ ...p, featuredSource: "manual" }));

      if (out.length < limit) {
        const counts = await prisma.quote.groupBy({
          by: ["productId"],
          where: { createdAt: { gte: new Date(Date.now() - 30 * DAY) } },
          _count: { productId: true },
          orderBy: { _count: { productId: "desc" } },
          take: limit * 3,
        });
        const ids = counts.map((c) => c.productId).filter((id) => !picked.has(id));
        const popular = await prisma.product.findMany({ where: { id: { in: ids }, isActive: true }, include });
        for (const id of ids) {
          const p = popular.find((x) => x.id === id);
          if (p && out.length < limit) { out.push({ ...p, featuredSource: "popular" }); picked.add(p.id); }
        }
      }
      if (out.length < limit) {
        const rest = await prisma.product.findMany({
          where: { isActive: true, id: { notIn: [...picked] } },
          include, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: limit - out.length,
        });
        out.push(...rest.map((p) => ({ ...p, featuredSource: "catalog" })));
      }

      const promos = await getActivePromotions(prisma);
      const { conv, currency } = await fxConverter(prisma);
      res.set("Cache-Control", "public, max-age=60");
      res.json(out.map((p) => ({ ...withPromo(p, promos, conv, currency), featuredSource: p.featuredSource })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load featured products" });
    }
  });

  // Recent quote requests — product and time only. Never names, phones or emails.
  r.get("/activity/recent", async (req, res) => {
    try {
      const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 5));
      const quotes = await prisma.quote.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * DAY) } },
        select: { createdAt: true, product: { select: { name: true, category: { select: { slug: true } } } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      res.set("Cache-Control", "public, max-age=60");
      res.json(quotes.map((q) => ({ productName: q.product.name.trim(), categorySlug: q.product.category.slug, createdAt: q.createdAt })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load activity" });
    }
  });

  return r;
}

type PromoInput = {
  title: string; subtitle: string | null; kind: PromotionKind; value: number | null;
  categoryId: number | null; collectionId: number | null; productIds: number[];
  startsAt: Date; endsAt: Date | null; showInTicker: boolean; isDealOfWeek: boolean; showPopup: boolean;
  popupCode: string | null; imageUrl: string | null; priority: number; isActive: boolean;
};

const optInt = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number.isInteger(Number(v)) ? Number(v) : NaN);
const optStr = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function parsePromotionInput(body: any): { data?: PromoInput; errors?: string[] } {
  const errors: string[] = [];
  const title = optStr(body?.title, 120);
  if (!title) errors.push("title is required");
  const kind = KINDS.includes(body?.kind) ? (body.kind as PromotionKind) : null;
  if (!kind) errors.push("kind must be PERCENT, AMOUNT_OFF or ANNOUNCEMENT");
  let value = optInt(body?.value);
  if (kind === "PERCENT" && (value === null || Number.isNaN(value) || value < 1 || value > 90)) errors.push("value must be 1–90 for PERCENT");
  if (kind === "AMOUNT_OFF" && (value === null || Number.isNaN(value) || value < 1)) errors.push("value (USD cents) must be a positive integer for AMOUNT_OFF");
  if (kind === "ANNOUNCEMENT") value = null;
  const categoryId = optInt(body?.categoryId), collectionId = optInt(body?.collectionId), priority = optInt(body?.priority) ?? 0;
  if (Number.isNaN(categoryId) || Number.isNaN(collectionId) || Number.isNaN(priority)) errors.push("categoryId, collectionId and priority must be integers");
  const productIds = Array.isArray(body?.productIds) ? body.productIds.map(Number).filter(Number.isInteger) : [];
  const startsAt = body?.startsAt ? new Date(body.startsAt) : new Date();
  const endsAt = body?.endsAt ? new Date(body.endsAt) : null;
  if (Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) errors.push("startsAt/endsAt must be valid dates");
  else if (endsAt && endsAt <= startsAt) errors.push("endsAt must be after startsAt");
  const showPopup = Boolean(body?.showPopup);
  const popupCode = sanitizePromoCode(body?.popupCode);
  if (errors.length) return { errors };
  return {
    data: {
      title: title!, subtitle: optStr(body?.subtitle, 240), kind: kind!, value: value as number | null,
      categoryId: categoryId as number | null, collectionId: collectionId as number | null, productIds: [...new Set<number>(productIds)],
      startsAt, endsAt, showInTicker: body?.showInTicker !== false, isDealOfWeek: Boolean(body?.isDealOfWeek), showPopup,
      popupCode, imageUrl: optStr(body?.imageUrl, 500), priority: priority as number, isActive: body?.isActive !== false,
    },
  };
}

/** Admin endpoints. Mounted after the /api/admin auth middleware. */
export function adminPromotionRoutes(prisma: PrismaClient) {
  const r = Router();
  const include = {
    products: { select: { product: { select: { id: true, name: true, slug: true } } } },
    category: { select: { id: true, name: true, slug: true } },
    collection: { select: { id: true, name: true, slug: true } },
    _count: { select: { quotes: true } },
  } as const;

  const save = async (id: number | null, body: any) => {
    const { data, errors } = parsePromotionInput(body);
    if (!data) return { status: 400, json: { errors } };
    const { productIds, ...fields } = data;
    const existing = productIds.length ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } }) : [];
    if (existing.length !== productIds.length) return { status: 400, json: { errors: ["unknown productIds"] } };
    const promo = await prisma.$transaction(async (tx) => {
      const p = id
        ? await tx.promotion.update({ where: { id }, data: fields })
        : await tx.promotion.create({ data: fields });
      await tx.promotionProduct.deleteMany({ where: { promotionId: p.id } });
      if (productIds.length) await tx.promotionProduct.createMany({ data: productIds.map((productId) => ({ promotionId: p.id, productId })) });
      return tx.promotion.findUnique({ where: { id: p.id }, include });
    });
    return { status: id ? 200 : 201, json: promo };
  };

  r.get("/promotions", async (_req, res) => {
    const list = await prisma.promotion.findMany({ include, orderBy: [{ isActive: "desc" }, { startsAt: "desc" }] });
    res.json(list);
  });
  r.post("/promotions", async (req, res) => {
    try { const out = await save(null, req.body); res.status(out.status).json(out.json); }
    catch (e) { console.error(e); res.status(500).json({ error: "Failed to create promotion" }); }
  });
  r.put("/promotions/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });
    try {
      if (!(await prisma.promotion.findUnique({ where: { id } }))) return res.status(404).json({ error: "Not found" });
      const out = await save(id, req.body); res.status(out.status).json(out.json);
    } catch (e) { console.error(e); res.status(500).json({ error: "Failed to update promotion" }); }
  });
  r.delete("/promotions/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });
    try { await prisma.promotion.delete({ where: { id } }); res.status(204).end(); }
    catch { res.status(404).json({ error: "Not found" }); }
  });

  // Manual "featured" order for the top rail.
  r.get("/featured", async (_req, res) => {
    const list = await prisma.product.findMany({
      where: { featuredRank: { not: null } }, orderBy: { featuredRank: "asc" },
      select: { id: true, name: true, slug: true, imageUrl: true, featuredRank: true, isActive: true },
    });
    res.json(list);
  });
  r.put("/featured", async (req, res) => {
    const ids: number[] = Array.isArray(req.body?.productIds) ? [...new Set<number>(req.body.productIds.map(Number).filter(Number.isInteger))].slice(0, 24) : [];
    try {
      await prisma.$transaction([
        prisma.product.updateMany({ where: { featuredRank: { not: null } }, data: { featuredRank: null } }),
        ...ids.map((id, i) => prisma.product.update({ where: { id }, data: { featuredRank: i + 1 } })),
      ]);
      res.json({ productIds: ids });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Failed to save featured order (unknown product?)" });
    }
  });

  return r;
}
