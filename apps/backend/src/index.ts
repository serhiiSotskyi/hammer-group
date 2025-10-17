import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { Prisma, PrismaClient, SchemaStatus } from "@prisma/client";
import { getDailyUsdToUah, convertCentsUsdToUah } from "./services/fx";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import {
  priceQuote,
  sha256Json,
  SelectionValidationError,
} from "./services/pricing";
import { ParamSchemaJSON, Control, SelectControl, RadioControl, BooleanControl, RangeControl } from "./types/paramSchema";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Security + CORS
const FRONTEND_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(
  helmet({
    // Allow serving images/assets to a different origin in dev (frontend on 8080)
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "hg_admin";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true" ? true : false; // set true in prod
const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE as any) || "lax"; // 'lax' or 'none'
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

// Serve static uploaded files
// In production (Azure), set UPLOADS_DIR=/home/uploads. For local dev, default to ./uploads
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

app.get("/", (_req, res) => {
  res.send("Hammer Group API is running 🚀");
});

// Normalize known schema quirks to ensure UI works even if config is incomplete
function normalizeSchema(slug: string, schema: any): ParamSchemaJSON {
  if (!schema || typeof schema !== 'object') return schema as ParamSchemaJSON;
  try {
    if (slug === 'interior') {
      const sizes = schema.groups?.find((g: any) => g.id === 'sizes');
      if (sizes) {
        const ensureRange = (id: string, min: number, max: number, def: number) => {
          let c = sizes.controls?.find((x: any) => x.id === id);
          if (c) {
            if ((c.min === 0 && c.max === 0) || c.min == null || c.max == null) {
              c.min = min; c.max = max; c.step = 10; c.defaultValue = def;
            } else {
              // Always enforce desired defaults when missing
              c.step = c.step ?? 10;
              if (c.defaultValue == null) c.defaultValue = def;
            }
          }
        };
        // Height default 2070, keep 1900–2400 range
        ensureRange('heightMm', 1900, 2400, 2070);
        // Width 600–1200, default 900
        ensureRange('widthMm', 600, 1200, 900);
        // Depth 10–100, default 10
        ensureRange('depthMm', 10, 100, 10);
        // Depth pricing: per each 10mm over default
        const d = sizes.controls?.find((x: any) => x.id === 'depthMm');
        if (d && (!d.priceStrategy || d.priceStrategy.type !== 'PER_UNIT')) {
          d.priceStrategy = { type: 'PER_UNIT', unit: 'TEN_MM', rateCents: 0, unitsFrom: 'deltaFromDefault' };
        }
      }
      // Remove legacy 'dimensions' group that duplicates height/width rules with per-unit pricing
      if (Array.isArray(schema.groups)) {
        schema.groups = schema.groups.filter((g: any) => g.id !== 'dimensions');
      }
      const finish = schema.groups?.find((g: any) => g.id === 'finishCoat');
      const fc = finish?.controls?.find((c: any) => c.id === 'finishCoat');
      if (fc && Array.isArray(fc.options)) {
        if (!fc.options.find((o: any) => o.id === 'standard')) {
          fc.options.unshift({ id: 'standard', label: 'Standard', priceStrategy: { type: 'FIXED', amountCents: 0 } });
        }
        fc.defaultValue = 'standard';
      }
    } else if (slug === 'concealed') {
      // Ensure sizes group exists and appears first
      let sizes = schema.groups?.find((g: any) => g.id === 'sizes');
      if (!sizes) {
        sizes = { id: 'sizes', label: 'Sizes', controls: [] };
        schema.groups = [sizes, ...(schema.groups || [])];
      } else {
        // Move to front
        schema.groups = [sizes, ...schema.groups.filter((g: any) => g !== sizes)];
      }
      const ensureRange = (id: string, min: number, max: number, def: number) => {
        let c = sizes.controls?.find((x: any) => x.id === id);
        if (!c) {
          c = { id, type: 'range', label: id, min, max, step: 10, unit: 'mm', defaultValue: def };
          sizes.controls.push(c);
        } else {
          // For concealed, enforce the agreed bounds/defaults explicitly
          c.min = min; c.max = max; c.step = 10; c.defaultValue = def; c.unit = 'mm';
        }
      };
      // Height 1800–3000, default 2100; Width default 900; Depth default 10
      ensureRange('heightMm', 1800, 3000, 2100);
      ensureRange('widthMm', 600, 1200, 900);
      ensureRange('depthMm', 10, 100, 10);

      // Ensure hinges control exists (radio 3/4/5) with zero amounts by default
      let hingesGroup = schema.groups?.find((g: any) => g.id === 'hinges');
      if (!hingesGroup) {
        hingesGroup = { id: 'hinges', label: 'Hinges', controls: [] };
        schema.groups.push(hingesGroup);
      }
      let hingesCtrl = hingesGroup.controls.find((c: any) => c.id === 'hinges');
      if (!hingesCtrl) {
        hingesCtrl = { id: 'hinges', type: 'radio', label: 'Hinges', options: [] };
        hingesGroup.controls.push(hingesCtrl);
      }
      const hingeOpt = (id: string, label: string) => {
        let o = hingesCtrl.options.find((x: any) => x.id === id);
        if (!o) { o = { id, label }; hingesCtrl.options.push(o); }
        if (!o.priceStrategy) o.priceStrategy = { type: 'FIXED', amountCents: 0 };
      };
      hingeOpt('3', '3'); hingeOpt('4', '4'); hingeOpt('5', '5');

      // Remove profile/markup group from effective schema (pricing handled elsewhere)
      if (Array.isArray(schema.groups)) {
        schema.groups = schema.groups.filter((g: any) => g.id !== 'profile' && g.id !== 'finish');
      }

      // Ensure Opening group exists (no pricing impact)
      let opening = schema.groups?.find((g: any) => g.id === 'opening');
      if (!opening) {
        opening = { id: 'opening', label: 'Opening', controls: [] };
        schema.groups.push(opening);
      }
      let openingCtrl = opening.controls.find((c: any) => c.id === 'opening');
      if (!openingCtrl) {
        openingCtrl = { id: 'opening', type: 'radio', label: 'Opening', options: [
          { id: 'standard', label: 'Standard', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'reverse', label: 'Reverse', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ], defaultValue: 'standard' };
        opening.controls.push(openingCtrl);
      }

      // Limit frame options to Timber/Aluminium only
      const construction = schema.groups?.find((g: any) => g.id === 'construction');
      const frame = construction?.controls?.find((c: any) => c.id === 'frame');
      if (frame && Array.isArray(frame.options)) {
        frame.options = frame.options.filter((o: any) => o.id === 'wood' || o.id === 'aluminium');
        if (!frame.defaultValue || (frame.defaultValue !== 'wood' && frame.defaultValue !== 'aluminium')) {
          frame.defaultValue = 'wood';
        }
      }

      // Restrict hardware to exactly four toggles with friendly labels
      let hardware = schema.groups?.find((g: any) => g.id === 'hardware');
      if (!hardware) { hardware = { id: 'hardware', label: 'Hardware', controls: [] }; schema.groups.push(hardware); }
      const mkBool = (id: string, label: string) => ({ id, type: 'boolean', label, defaultValue: false, priceStrategy: { type: 'FIXED', amountCents: 0 } });
      hardware.controls = [
        mkBool('magneticLock', 'Magnetic lock'),
        mkBool('magneticStopper', 'Magnetic stopper'),
        mkBool('dropDownThreshold', 'Drop-down threshold'),
        mkBool('paintFrameCasing', 'Painting of frame and casing'),
      ];
    }
  } catch (_) {}
  return schema as ParamSchemaJSON;
}

// Filter helper: keep only controls shown in the Interior customizer
function filterInterior<T extends { groupId: string; controlId: string }>(lines: T[]): T[] {
  const allowedGroups = new Set(["doorBlock", "sizes", "finishCoat", "casings", "opening"]);
  const allowedControls = new Set(["doorBlock", "heightMm", "widthMm", "depthMm", "finishCoat", "casingFront", "casingInner", "opening"]);
  return (lines || []).filter((l) => allowedGroups.has(l.groupId) && allowedControls.has(l.controlId));
}

function filterConcealed<T extends { groupId: string; controlId: string }>(lines: T[]): T[] {
  const allowedGroups = new Set(["sizes", "construction", "hardware", "install", "hinges", "opening"]);
  const allowedControls = new Set([
    'heightMm',
    'frame',
    'magneticLock','magneticStopper','dropDownThreshold','paintFrameCasing',
    'installType','hinges','opening'
  ]);
  return (lines || []).filter((l) => allowedGroups.has(l.groupId) && allowedControls.has(l.controlId));
}

// Auth helpers
type JwtClaims = { sub: string; role: "ADMIN" };
function signAdminJwt(sub: string) {
  return jwt.sign({ sub, role: "ADMIN" } as JwtClaims, SESSION_SECRET, { expiresIn: "7d" });
}

function authenticate(req: any, res: any, next: any) {
  try {
    let token = req.cookies?.[COOKIE_NAME];
    // Fallback to Authorization: Bearer <token>
    if (!token && typeof req.headers?.authorization === 'string') {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) token = parts[1];
    }
    if (!token) return res.status(401).json({ error: "Unauthenticated" });
    const payload = jwt.verify(token, SESSION_SECRET) as JwtClaims;
    (req as any).user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid session" });
  }
}

function requireAdmin(_req: any, res: any, next: any) {
  // payload already checked; only one admin role
  next();
}

// Auth routes
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  const user = await prisma.adminUser.findUnique({ where: { email: String(email).toLowerCase() } });
  const bcrypt = await import("bcryptjs");
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = signAdminJwt(String(user.id));
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE as any,
    domain: COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  // Also return the token for clients that cannot store cross-site cookies
  res.status(200).json({ token });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAMESITE as any, domain: COOKIE_DOMAIN, path: "/" });
  res.status(204).end();
});

app.get("/api/auth/me", authenticate, async (_req, res) => {
  res.json({ role: "ADMIN" });
});

function buildResolvedSelections(
  schema: ParamSchemaJSON,
  selections: Record<string, unknown>,
) {
  const controlMap: Record<string, { control: Control; groupId: string; groupLabel: string }> = {};
  for (const group of schema.groups) {
    for (const control of group.controls) {
      controlMap[control.id] = { control, groupId: group.id, groupLabel: group.label };
    }
  }
  return Object.entries(selections).map(([controlId, value]) => {
    const meta = controlMap[controlId];
    if (!meta) {
      return { controlId, controlLabel: controlId, groupId: "", groupLabel: "", value, displayValue: String(value ?? "") };
    }
    const { control, groupId, groupLabel } = meta;
    let displayValue = String(value ?? "");
    if (control.type === "radio" || control.type === "select") {
      const options = (control as SelectControl).options;
      const found = options.find((o) => o.id === value);
      if (found) displayValue = found.label;
    } else if (control.type === "boolean") {
      displayValue = (value ? "Yes" : "No") as string;
    } else if (control.type === "range") {
      const unit = (control as RangeControl).unit ?? "";
      displayValue = unit ? `${value} ${unit}` : String(value);
    }
    return {
      groupId,
      groupLabel,
      controlId,
      controlLabel: control.label,
      value,
      displayValue,
    };
  });
}

app.get("/api/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        products: true,
        activeSchema: true,
      },
      orderBy: { id: "asc" },
    });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const { categoryId, categorySlug, slug, includeInactive, collection } = req.query as Record<string, string | undefined>;
    const showInactive = includeInactive === "true";
    const products = await prisma.product.findMany({
      where: {
        ...(categoryId ? { categoryId: Number(categoryId) } : {}),
        ...(categorySlug ? { category: { is: { slug: categorySlug } } } : {}),
        ...(slug ? { slug } : {}),
        ...(collection
          ? { collection: { is: { slug: collection } } }
          : {}),
        ...(showInactive ? {} : { isActive: true }),
      },
      include: { category: true, collection: true },
      orderBy: { id: "asc" },
    });
    // Attach converted base price in UAH using today's FX
    let fxRate: number | null = null;
    try {
      const fx = await getDailyUsdToUah(prisma);
      fxRate = fx.rate;
    } catch {
      // ignore; show raw USD if FX unavailable
    }
    const mapped = products.map((p) => ({
      ...p,
      currency: fxRate ? "UAH" : "USD",
      convertedPriceCents: fxRate ? Math.round((p.basePriceCents / 100) * fxRate * 100) : p.basePriceCents,
    }));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Collections list by category
app.get("/api/collections", async (req, res) => {
  try {
    const { categorySlug } = req.query as { categorySlug?: string };
    // Be lenient: default to 'interior' if not provided
    const slug = (categorySlug || 'interior').toString();
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) return res.status(404).json({ error: "Category not found" });
    const collections = await prisma.collection.findMany({ where: { categoryId: category.id }, orderBy: { id: "asc" } });
    res.json(collections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

// Admin: create a collection
app.post("/api/admin/collections", authenticate, requireAdmin, async (req, res) => {
  try {
    const { categorySlug, name, slug, imageUrl } = req.body ?? {};
    if (!categorySlug || !name || !slug) return res.status(400).json({ error: "categorySlug, name, slug are required" });
    const category = await prisma.category.findUnique({ where: { slug: String(categorySlug) } });
    if (!category) return res.status(404).json({ error: "Category not found" });
    const created = await prisma.collection.create({ data: { categoryId: category.id, name: String(name), slug: String(slug), imageUrl: imageUrl ?? null } });
    res.status(201).json(created);
  } catch (error: any) {
    if (error?.code === "P2002") return res.status(409).json({ error: "Collection slug must be unique within category" });
    console.error(error);
    res.status(500).json({ error: "Failed to create collection" });
  }
});

// Admin: update a collection
app.put("/api/admin/collections/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, slug, imageUrl } = req.body ?? {};
    const updated = await prisma.collection.update({ where: { id }, data: { ...(name !== undefined ? { name: String(name) } : {}), ...(slug !== undefined ? { slug: String(slug) } : {}), ...(imageUrl !== undefined ? { imageUrl: imageUrl ?? null } : {}) } });
    res.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") return res.status(409).json({ error: "Collection slug must be unique within category" });
    if (error?.code === "P2025") return res.status(404).json({ error: "Collection not found" });
    console.error(error);
    res.status(500).json({ error: "Failed to update collection" });
  }
});

// Admin: delete a collection (only if empty)
app.delete("/api/admin/collections/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.$transaction(async (tx) => {
      // Delete quotes for products in this collection
      const productIds = (await tx.product.findMany({ where: { collectionId: id }, select: { id: true } })).map(p => p.id);
      if (productIds.length > 0) {
        await tx.quote.deleteMany({ where: { productId: { in: productIds } } });
        await tx.product.deleteMany({ where: { id: { in: productIds } } });
      }
      await tx.collection.delete({ where: { id } });
    });
    res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ error: "Collection not found" });
    console.error(error);
    res.status(500).json({ error: "Failed to delete collection" });
  }
});

// Furniture portfolio CRUD
// Utility: simple album store on filesystem to avoid DB migration churn
const albumsStorePath = path.join(uploadsDir, 'portfolio_albums.json');
async function readAlbumsStore(): Promise<Record<string, string[]>> {
  try {
    const raw = await fs.promises.readFile(albumsStorePath, 'utf8');
    const json = JSON.parse(raw);
    return (json && typeof json === 'object') ? json as Record<string, string[]> : {};
  } catch {
    return {};
  }
}
async function writeAlbumsStore(data: Record<string, string[]>) {
  await fs.promises.writeFile(albumsStorePath, JSON.stringify(data, null, 2), 'utf8');
}

app.get("/api/furniture/portfolio", async (_req, res) => {
  try {
    const [items, albums] = await Promise.all([
      prisma.furniturePortfolio.findMany({ orderBy: { createdAt: "desc" } }),
      readAlbumsStore(),
    ]);
    // Map legacy imageUrl as coverUrl and attach albumUrls from store
    const result = items.map((it: any) => ({
      id: it.id,
      name: it.name,
      coverUrl: it.imageUrl, // legacy field
      albumUrls: Array.isArray(albums[String(it.id)]) ? albums[String(it.id)] : [],
      createdAt: it.createdAt,
      updatedAt: it.updatedAt,
    }));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

app.post("/api/furniture/portfolio", async (req, res) => {
  try {
    const { name } = req.body ?? {};
    const coverUrl = req.body?.coverUrl || req.body?.imageUrl; // backward compat
    const albumUrls = Array.isArray(req.body?.albumUrls) ? req.body.albumUrls as string[] : [];
    if (!name || !coverUrl) return res.status(400).json({ error: "name and coverUrl are required" });
    const item = await prisma.furniturePortfolio.create({ data: { name: String(name), imageUrl: String(coverUrl) } });
    // Persist album mapping
    const albums = await readAlbumsStore();
    albums[String(item.id)] = albumUrls;
    await writeAlbumsStore(albums);
    res.status(201).json({ id: item.id, name: item.name, coverUrl: coverUrl, albumUrls });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create portfolio item" });
  }
});

app.put("/api/furniture/portfolio/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name } = req.body ?? {};
    const coverUrl = (req.body?.coverUrl ?? req.body?.imageUrl) as string | undefined;
    const albumUrls = Array.isArray(req.body?.albumUrls) ? (req.body.albumUrls as string[]) : undefined;
    const item = await prisma.furniturePortfolio.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name) } : {}),
        ...(coverUrl !== undefined ? { imageUrl: String(coverUrl) } : {}),
      },
    });
    if (albumUrls) {
      const albums = await readAlbumsStore();
      albums[String(id)] = albumUrls;
      await writeAlbumsStore(albums);
    }
    res.json({ id: item.id, name: item.name, coverUrl: item.imageUrl, albumUrls: albumUrls ?? (await readAlbumsStore())[String(id)] ?? [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update portfolio item" });
  }
});

app.delete("/api/furniture/portfolio/:id", async (req, res) => {
  try {
    const id = String(Number(req.params.id));
    await prisma.furniturePortfolio.delete({ where: { id: Number(id) } });
    const albums = await readAlbumsStore();
    if (albums[id]) { delete albums[id]; await writeAlbumsStore(albums); }
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete portfolio item" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Create product
app.post("/api/products", authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, slug, basePriceCents, imageUrl, categoryId, categorySlug, isActive, description, collectionId, doorType } = req.body ?? {};

    if (!name || !slug || typeof basePriceCents !== "number") {
      return res.status(400).json({ error: "name, slug, basePriceCents are required" });
    }

    let resolvedCategoryId: number | undefined = categoryId ? Number(categoryId) : undefined;
    if (!resolvedCategoryId && categorySlug) {
      const cat = await prisma.category.findUnique({ where: { slug: String(categorySlug) }, select: { id: true } });
      if (!cat) return res.status(400).json({ error: "Invalid categorySlug" });
      resolvedCategoryId = cat.id;
    }
    if (!resolvedCategoryId) {
      return res.status(400).json({ error: "categoryId or categorySlug is required" });
    }

    const product = await prisma.product.create({
      data: {
        name: String(name),
        slug: String(slug),
        basePriceCents: Math.round(basePriceCents),
        imageUrl: imageUrl ?? null,
        categoryId: resolvedCategoryId,
        description: description ?? null,
        collectionId: collectionId ? Number(collectionId) : null,
        doorType: doorType === 'BUDGET' ? 'BUDGET' as any : 'STANDARD',
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    });

    res.status(201).json(product);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Slug must be unique" });
    }
    console.error(error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// Update product
app.put("/api/products/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, slug, basePriceCents, imageUrl, categoryId, isActive, description, collectionId, doorType } = req.body ?? {};

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name) } : {}),
        ...(slug !== undefined ? { slug: String(slug) } : {}),
        ...(basePriceCents !== undefined ? { basePriceCents: Math.round(Number(basePriceCents)) } : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl ?? null } : {}),
        ...(categoryId !== undefined ? { categoryId: Number(categoryId) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(description !== undefined ? { description: description === null ? null : String(description) } : {}),
        ...(collectionId !== undefined ? { collectionId: collectionId === null ? null : Number(collectionId) } : {}),
        ...(doorType !== undefined ? { doorType: doorType === 'BUDGET' ? 'BUDGET' as any : 'STANDARD' as any } : {}),
      },
    });

    res.json(product);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Slug must be unique" });
    }
    console.error(error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Delete product
app.delete("/api/products/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.$transaction(async (tx) => {
      await tx.quote.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
    res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }
    console.error(error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Generic: Get active published schema by category slug
app.get("/api/categories/:slug/schema", async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const category = await prisma.category.findUnique({
      where: { slug },
      include: { activeSchema: true },
    });

    if (!category || !category.activeSchema || category.activeSchema.status !== SchemaStatus.PUBLISHED) {
      return res.status(404).json({ error: `Schema not found for category ${slug}` });
    }

    const normalized = normalizeSchema(slug, category.activeSchema.json);
    res.json({
      categoryId: category.id,
      version: category.activeSchema.version,
      label: category.activeSchema.label,
      checksum: category.activeSchema.checksum,
      publishedAt: category.activeSchema.publishedAt,
      schema: normalized,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load schema" });
  }
});

app.post("/api/price", async (req, res) => {
  const { productSlug, selections } = req.body ?? {};

  if (!productSlug) {
    return res.status(400).json({ error: "productSlug is required" });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { slug: productSlug },
      include: {
        category: {
          include: { activeSchema: true },
        },
      },
    });

    if (!product || !product.category) {
      return res.status(404).json({ error: "Product not found" });
    }

    const schemaRecord = product.category.activeSchema;

    if (!schemaRecord || schemaRecord.status !== SchemaStatus.PUBLISHED) {
      return res.status(404).json({ error: "Pricing schema not available" });
    }

    let schema = normalizeSchema(product.category.slug, schemaRecord.json as any) as unknown as ParamSchemaJSON;
    // Concealed Budget: cap height to 2100
    if (product.category.slug === 'concealed' && (product as any).doorType === 'BUDGET') {
      const sizes = (schema as any).groups?.find((g: any) => g.id === 'sizes');
      const h = sizes?.controls?.find((c: any) => c.id === 'heightMm');
      if (h) { h.max = 2100; if (h.defaultValue > 2100) h.defaultValue = 2100; }
    }
    const result = priceQuote(product.basePriceCents, schema, selections ?? {});
    const fx = await getDailyUsdToUah(prisma);
    const conv = (c: number) => convertCentsUsdToUah(c, fx.rate);
    const { normalizedSelections, ...priced } = result;
    res.json({
      currency: "UAH",
      basePriceCents: conv(priced.basePriceCents),
      adjustmentsCents: conv(priced.adjustmentsCents),
      totalPriceCents: conv(priced.totalPriceCents),
      rounding: priced.rounding,
      breakdown: priced.breakdown.map((b) => ({ ...b, deltaCents: conv(b.deltaCents) })),
      fx: { base: "USD", quote: "UAH", rate: fx.rate, asOf: fx.asOf, source: fx.source },
    });
  } catch (error) {
    if (error instanceof SelectionValidationError) {
      return res.status(422).json({ errors: error.issues });
    }

    console.error(error);
    res.status(500).json({ error: "Failed to calculate price" });
  }
});

app.post("/api/quotes", async (req, res) => {
  const { productSlug, selections, customer, notes } = req.body ?? {};

  if (!productSlug) {
    return res.status(400).json({ error: "productSlug is required" });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { slug: productSlug },
      include: {
        category: {
          include: { activeSchema: true },
        },
      },
    });

    if (!product || !product.category) {
      return res.status(404).json({ error: "Product not found" });
    }

    const schemaRecord = product.category.activeSchema;

    if (!schemaRecord || schemaRecord.status !== SchemaStatus.PUBLISHED) {
      return res.status(404).json({ error: "Pricing schema not available" });
    }

    let schemaJson = normalizeSchema(product.category.slug, schemaRecord.json as any) as unknown as ParamSchemaJSON;
    if (product.category.slug === 'concealed' && (product as any).doorType === 'BUDGET') {
      const sizes = (schemaJson as any).groups?.find((g: any) => g.id === 'sizes');
      const h = sizes?.controls?.find((c: any) => c.id === 'heightMm');
      if (h) { h.max = 2100; if (h.defaultValue > 2100) h.defaultValue = 2100; }
    }
    const priced = priceQuote(product.basePriceCents, schemaJson, selections ?? {});
    const fx = await getDailyUsdToUah(prisma);
    const conv = (c: number) => convertCentsUsdToUah(c, fx.rate);
    const { normalizedSelections, ...payload } = priced;

    // Build resolved selections for admin readability
    const controlMap: Record<string, { control: Control; groupId: string; groupLabel: string }> = {};
    for (const group of schemaJson.groups) {
      for (const control of group.controls) {
        controlMap[control.id] = { control, groupId: group.id, groupLabel: group.label };
      }
    }
    let resolvedSelections = Object.entries(normalizedSelections).map(([controlId, value]) => {
      const meta = controlMap[controlId];
      if (!meta) {
        return { controlId, controlLabel: controlId, groupId: "", groupLabel: "", value, displayValue: String(value ?? "") };
      }
      const { control, groupId, groupLabel } = meta;
      let displayValue = String(value ?? "");
      if (control.type === "radio" || control.type === "select") {
        const options = (control as SelectControl).options;
        const found = options.find((o) => o.id === value);
        if (found) displayValue = found.label;
      } else if (control.type === "boolean") {
        displayValue = (value ? "Yes" : "No") as string;
      } else if (control.type === "range") {
        const unit = (control as RangeControl).unit ?? "";
        displayValue = unit ? `${value} ${unit}` : String(value);
      }
      return {
        groupId,
        groupLabel,
        controlId,
        controlLabel: control.label,
        value,
        displayValue,
      };
    });

    // Filter to customizer items
    if (product.category.slug === 'interior') {
      resolvedSelections = filterInterior(resolvedSelections as any) as any;
    } else if (product.category.slug === 'concealed') {
      resolvedSelections = filterConcealed(resolvedSelections as any) as any;
    }

    // Optionally filter breakdown as well
    const filteredBreakdown = product.category.slug === 'interior' ? filterInterior(payload.breakdown as any)
      : product.category.slug === 'concealed' ? filterConcealed(payload.breakdown as any)
      : payload.breakdown;

    const quote = await prisma.quote.create({
      data: {
        productId: product.id,
        categoryId: product.categoryId,
        selections: normalizedSelections as Prisma.InputJsonObject,
        schemaVersionId: schemaRecord.id,
        schemaLabel: schemaRecord.label,
        schemaChecksum: schemaRecord.checksum,
        schemaSnapshot: schemaJson as unknown as Prisma.InputJsonValue,
        basePriceCents: conv(payload.basePriceCents),
        adjustmentsCents: conv(payload.adjustmentsCents),
        totalPriceCents: conv(payload.totalPriceCents),
        breakdown: filteredBreakdown.map((b: any) => ({ ...b, deltaCents: conv(b.deltaCents) })) as unknown as Prisma.InputJsonValue,
        resolvedSelections: resolvedSelections as unknown as Prisma.InputJsonValue,
        customerName: customer?.name ?? null,
        customerEmail: customer?.email ?? null,
        customerPhone: customer?.phone ?? null,
        notes: notes ?? null,
        baseCurrency: "USD",
        quoteCurrency: "UAH",
        fxRate: fx.rate,
        fxSource: fx.source,
        fxAsOf: fx.asOf,
      },
    });

    res.status(201).json({
      quoteId: quote.id,
      totalPriceCents: quote.totalPriceCents,
      createdAt: quote.createdAt,
      schemaVersionId: quote.schemaVersionId,
      schemaChecksum: quote.schemaChecksum,
      fx: { base: quote.baseCurrency, quote: quote.quoteCurrency, rate: quote.fxRate, asOf: quote.fxAsOf, source: quote.fxSource },
    });
  } catch (error) {
    if (error instanceof SelectionValidationError) {
      return res.status(422).json({ errors: error.issues });
    }

    console.error(error);
    res.status(500).json({ error: "Failed to create quote" });
  }
});

// Admin quotes listing
app.use("/api/admin", authenticate, requireAdmin);

app.get("/api/admin/quotes", async (_req, res) => {
  try {
    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: true, category: true },
    });

    // Compute resolvedSelections for legacy quotes on the fly
    const enriched = quotes.map((q: any) => {
      if (!q.resolvedSelections && q.schemaSnapshot && q.selections) {
        try {
          const schema = q.schemaSnapshot as ParamSchemaJSON;
          const sels = q.selections as Record<string, unknown>;
          q.resolvedSelections = buildResolvedSelections(schema, sels);
        } catch (e) {
          // ignore, keep undefined
        }
      }
      // Always filter to customizer items
      if (q.category?.slug === 'interior') {
        if (Array.isArray(q.resolvedSelections)) {
          q.resolvedSelections = filterInterior(q.resolvedSelections as any);
        }
        try {
          const bd = Array.isArray(q.breakdown) ? q.breakdown as any[] : [];
          q.breakdown = filterInterior(bd);
        } catch {}
      } else if (q.category?.slug === 'concealed') {
        if (Array.isArray(q.resolvedSelections)) {
          q.resolvedSelections = filterConcealed(q.resolvedSelections as any);
        }
        try {
          const bd = Array.isArray(q.breakdown) ? q.breakdown as any[] : [];
          q.breakdown = filterConcealed(bd);
        } catch {}
      }
      return q;
    });

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

// Admin: small stats for undelivered items
app.get("/api/admin/stats", async (_req, res) => {
  try {
    const [undeliveredQuotes, undeliveredGeneral, undeliveredFurniture] = await Promise.all([
      prisma.quote.count({ where: { delivered: false } }),
      prisma.inquiry.count({ where: { delivered: false, type: "GENERAL" as any } }),
      prisma.inquiry.count({ where: { delivered: false, type: "FURNITURE" as any } }),
    ]);
    res.json({
      undelivered: {
        doorQuotes: undeliveredQuotes,
        general: undeliveredGeneral,
        furniture: undeliveredFurniture,
      },
      totals: {
        quotes: await prisma.quote.count(),
        inquiries: await prisma.inquiry.count(),
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load admin stats" });
  }
});

// Admin update quote delivery/note
app.patch("/api/admin/quotes/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const { delivered, adminNotes } = req.body ?? {};
    const data: Prisma.QuoteUpdateInput = {};
    if (delivered !== undefined) {
      const val = typeof delivered === "string" ? delivered === "true" : Boolean(delivered);
      (data as any).delivered = val;
    }
    if (adminNotes !== undefined) {
      (data as any).adminNotes = adminNotes === null ? null : String(adminNotes);
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "No changes provided" });
    const updated = await prisma.quote.update({ where: { id }, data });
    res.json(updated);
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ error: "Quote not found" });
    console.error(error);
    res.status(500).json({ error: "Failed to update quote" });
  }
});

// Admin: simple base64 image upload endpoint
// Body: { filename?: string, contentType?: string, data: string (base64) }
app.post("/api/upload", async (req, res) => {
  try {
    const { filename, contentType, data } = req.body ?? {};
    if (!data || typeof data !== "string") {
      return res.status(400).json({ error: "data (base64) is required" });
    }

    // Basic type allowlist
    const allowed = ["image/jpeg", "image/png", "image/webp"]; 
    const ct = typeof contentType === "string" ? contentType : "image/jpeg";
    if (!allowed.includes(ct)) {
      return res.status(400).json({ error: "Unsupported content type" });
    }

    // Determine extension
    const ext = ct === "image/png" ? ".png" : ct === "image/webp" ? ".webp" : ".jpg";
    const safeName = (typeof filename === "string" && filename.trim() !== "")
      ? filename.replace(/[^a-z0-9-_]/gi, "_")
      : `upload_${Date.now()}`;
    const finalName = `${safeName}${ext}`;
    const filePath = path.join(uploadsDir, finalName);

    // Strip possible data URL prefix
    const base64 = data.includes(",") ? data.split(",").pop()! : data;
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > 20 * 1024 * 1024) { // 20 MB
      return res.status(413).json({ error: "File too large" });
    }

    await fs.promises.writeFile(filePath, buffer);
    const publicUrl = `/uploads/${finalName}`;
    res.status(201).json({ url: publicUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// Contact forms
app.post("/api/contact/general", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body ?? {};
    if (!name || !email) return res.status(400).json({ error: "name and email are required" });
    const inquiry = await prisma.inquiry.create({
      data: { type: "GENERAL", name: String(name), email: String(email), phone: phone ?? null, message: message ?? null },
    });
    res.status(201).json({ id: inquiry.id, createdAt: inquiry.createdAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit inquiry" });
  }
});

app.post("/api/contact/furniture", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body ?? {};
    if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });
    const inquiry = await prisma.inquiry.create({
      data: {
        type: "FURNITURE",
        name: String(name),
        email: email ? String(email) : null,
        phone: String(phone),
        message: message ? String(message) : null,
      },
    });
    res.status(201).json({ id: inquiry.id, createdAt: inquiry.createdAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit inquiry" });
  }
});

// Admin inquiries list
app.get("/api/admin/inquiries", async (req, res) => {
  try {
    const { type } = req.query as { type?: string };
    const inquiries = await prisma.inquiry.findMany({
      where: type ? { type: type.toUpperCase() as any } : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json(inquiries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch inquiries" });
  }
});

// Admin: update inquiry (delivered / adminNotes)
app.patch("/api/admin/inquiries/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { delivered, adminNotes } = req.body ?? {};
    const data: Prisma.InquiryUpdateInput = {};
    if (delivered !== undefined) {
      const val = typeof delivered === "string" ? delivered === "true" : Boolean(delivered);
      (data as any).delivered = val;
    }
    if (adminNotes !== undefined) {
      (data as any).adminNotes = adminNotes === null ? null : String(adminNotes);
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No changes provided" });
    }
    const updated = await prisma.inquiry.update({ where: { id }, data });
    res.json(updated);
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ error: "Inquiry not found" });
    console.error("Update inquiry failed:", error);
    res.status(500).json({ error: "Failed to update inquiry", detail: String(error?.message || error) });
  }
});

// Backwards-compat: interior default
app.post("/api/admin/schemas", async (req, res) => {
  const { id, label, json } = req.body ?? {};

  if (!json || typeof json !== "object") {
    return res.status(400).json({ error: "json payload is required" });
  }

  try {
    const category = await prisma.category.findUnique({ where: { slug: "interior" } });

    if (!category) {
      return res.status(404).json({ error: "Interior category not found" });
    }

    if (id) {
      const existing = await prisma.paramSchema.findUnique({ where: { id }, include: { category: true } });

      if (!existing || existing.categoryId !== category.id) {
        return res.status(404).json({ error: "Schema not found" });
      }

      if (existing.status !== SchemaStatus.DRAFT) {
        return res.status(400).json({ error: "Only draft schemas can be updated" });
      }

      const updated = await prisma.paramSchema.update({
        where: { id },
        data: {
          label: label ?? existing.label,
          json,
          checksum: sha256Json(json),
        },
      });

      return res.json(updated);
    }

    const latest = await prisma.paramSchema.findFirst({
      where: { categoryId: category.id },
      orderBy: { version: "desc" },
    });

    const nextVersion = latest ? latest.version + 1 : 1;

    const created = await prisma.paramSchema.create({
      data: {
        categoryId: category.id,
        version: nextVersion,
        status: SchemaStatus.DRAFT,
        label: label ?? `Interior v${nextVersion}`,
        json,
        checksum: sha256Json(json),
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save schema" });
  }
});

// Generic admin: create/update DRAFT schema for a category slug
app.post("/api/admin/categories/:slug/schemas", async (req, res) => {
  const { id, label, json } = req.body ?? {};
  const slug = String(req.params.slug);

  if (!json || typeof json !== "object") {
    return res.status(400).json({ error: "json payload is required" });
  }

  try {
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) return res.status(404).json({ error: `Category not found: ${slug}` });

    if (id) {
      const existing = await prisma.paramSchema.findUnique({ where: { id } });
      if (!existing || existing.categoryId !== category.id) {
        return res.status(404).json({ error: "Schema not found" });
      }
      if (existing.status !== SchemaStatus.DRAFT) {
        return res.status(400).json({ error: "Only draft schemas can be updated" });
      }
      const updated = await prisma.paramSchema.update({
        where: { id },
        data: { label: label ?? existing.label, json, checksum: sha256Json(json) },
      });
      return res.json(updated);
    }

    const latest = await prisma.paramSchema.findFirst({
      where: { categoryId: category.id },
      orderBy: { version: "desc" },
    });
    const nextVersion = latest ? latest.version + 1 : 1;

    const created = await prisma.paramSchema.create({
      data: {
        categoryId: category.id,
        version: nextVersion,
        status: SchemaStatus.DRAFT,
        label: label ?? `${slug} v${nextVersion}`,
        json,
        checksum: sha256Json(json),
      },
    });
    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save schema" });
  }
});

// Backwards-compat: publish interior by id
app.post("/api/admin/schemas/:id/publish", async (req, res) => {
  const schemaId = Number(req.params.id);

  try {
    const schema = await prisma.paramSchema.findUnique({
      where: { id: schemaId },
      include: { category: true },
    });

    if (!schema || !schema.category || schema.category.slug !== "interior") {
      return res.status(404).json({ error: "Schema not found" });
    }

    const checksum = sha256Json(schema.json);

    const result = await prisma.$transaction(async (tx) => {
      if (schema.category.activeSchemaId && schema.category.activeSchemaId !== schema.id) {
        await tx.paramSchema.update({
          where: { id: schema.category.activeSchemaId },
          data: { status: SchemaStatus.ARCHIVED },
        });
      }

      const published = await tx.paramSchema.update({
        where: { id: schema.id },
        data: {
          status: SchemaStatus.PUBLISHED,
          checksum,
          publishedAt: new Date(),
        },
      });

      await tx.category.update({
        where: { id: schema.categoryId },
        data: { activeSchemaId: schema.id },
      });

      return published;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to publish schema" });
  }
});

// Generic publish for category slug
app.post("/api/admin/categories/:slug/schemas/:id/publish", async (req, res) => {
  const schemaId = Number(req.params.id);
  const slug = String(req.params.slug);
  try {
    const schema = await prisma.paramSchema.findUnique({ where: { id: schemaId } });
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!schema || !category || schema.categoryId !== category.id) {
      return res.status(404).json({ error: "Schema not found" });
    }
    const checksum = sha256Json(schema.json);
    const result = await prisma.$transaction(async (tx) => {
      if (category.activeSchemaId && category.activeSchemaId !== schema.id) {
        await tx.paramSchema.update({ where: { id: category.activeSchemaId }, data: { status: SchemaStatus.ARCHIVED } });
      }
      const published = await tx.paramSchema.update({
        where: { id: schema.id },
        data: { status: SchemaStatus.PUBLISHED, checksum, publishedAt: new Date() },
      });
      await tx.category.update({ where: { id: category.id }, data: { activeSchemaId: schema.id } });
      return published;
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to publish schema" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// FX admin endpoints
app.get("/api/admin/fx/current", async (_req, res) => {
  try {
    const fx = await getDailyUsdToUah(prisma);
    res.json({ base: "USD", quote: "UAH", rate: fx.rate, asOf: fx.asOf, source: fx.source });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load FX rate" });
  }
});

app.post("/api/admin/fx", async (req, res) => {
  try {
    const { rate, asOfDate } = req.body ?? {};
    const parsed = Number(rate);
    if (!Number.isFinite(parsed) || parsed <= 0) return res.status(400).json({ error: "Valid rate is required" });
    const date = asOfDate ? new Date(asOfDate) : new Date();
    date.setHours(0, 0, 0, 0);
    const upsert = await prisma.fxRate.upsert({
      where: { base_quote_asOfDate: { base: "USD", quote: "UAH", asOfDate: date } as any },
      update: { rate: parsed, source: "MANUAL" },
      create: { base: "USD", quote: "UAH", rate: parsed, asOfDate: date, source: "MANUAL" },
    } as any);
    res.json({ base: "USD", quote: "UAH", rate: upsert.rate, asOf: upsert.asOfDate, source: upsert.source });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save FX rate" });
  }
});

// --- Schema Editor helpers ---
// Single-config mode: merge price changes directly into the active schema
app.post('/api/admin/schema/:slug/merge', authenticate, requireAdmin, async (req, res) => {
  const slug = String(req.params.slug);
  const {
    action,
    groupId,
    controlId,
    optionId,
    amountCents,
    costUSD,
    rateCents,
    rateUSDPer10,
    threshold,
    markup,
  } = req.body ?? {};

  const MARKUP = typeof markup === 'number' && markup > 0 ? Number(markup) : 1.3;

  try {
    const category = await prisma.category.findUnique({ where: { slug }, include: { activeSchema: true } });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    // Ensure an active schema exists (status PUBLISHED)
    let active = category.activeSchema;
    if (!active) {
      const baseJson = { currency: 'GBP', rounding: { mode: 'HALF_UP', minorUnit: 1 }, groups: [] as any[] };
      active = await prisma.paramSchema.create({
        data: {
          categoryId: category.id,
          version: 1,
          status: SchemaStatus.PUBLISHED,
          label: `${slug} v1`,
          json: baseJson as any,
          checksum: sha256Json(baseJson),
        },
      });
      await prisma.category.update({ where: { id: category.id }, data: { activeSchemaId: active.id } });
    }

    let schema = active.json as any;
    if (!schema || typeof schema !== 'object') schema = { currency: 'GBP', rounding: { mode: 'HALF_UP', minorUnit: 1 }, groups: [] };

    // Locate group/control
    let group = schema.groups.find((g: any) => g.id === groupId);
    if (!group) {
      group = { id: groupId, label: groupId, controls: [] };
      schema.groups.push(group);
    }
    let control = group.controls.find((c: any) => c.id === controlId);
    if (!control) {
      control = { id: controlId, type: 'radio', label: controlId, options: [] };
      group.controls.push(control);
    }

    const computeAmount = () => {
      if (typeof amountCents === 'number') return Math.round(amountCents);
      if (typeof costUSD === 'number') return Math.round(costUSD * MARKUP * 100);
      return undefined;
    };

    if (action === 'upsertOption') {
      if (!optionId) return res.status(400).json({ error: 'optionId required' });
      const optList = (control.options ||= []);
      let opt = optList.find((o: any) => o.id === optionId);
      if (!opt) { opt = { id: optionId, label: optionId }; optList.push(opt); }
      const amt = computeAmount();
      if (amt === undefined) return res.status(400).json({ error: 'Provide amountCents or costUSD' });
      opt.priceStrategy = { type: 'FIXED', amountCents: amt };
      // Ensure a baseline 'standard' option exists for finishCoat if only 'standardPlus' was added
      if (groupId === 'finishCoat' && controlId === 'finishCoat' && optionId === 'standardPlus') {
        if (!optList.find((o: any) => o.id === 'standard')) {
          optList.push({ id: 'standard', label: 'Standard', priceStrategy: { type: 'FIXED', amountCents: 0 } });
        }
      }
    } else if (action === 'updateRange') {
      // Ensure control has range config
      control.type = 'range';
      // Provide sensible defaults if not set yet
      if (control.min == null || control.max == null || (control.min === 0 && control.max === 0)) {
        if (controlId === 'heightMm') {
          control.min = 1900;
          control.max = 2400;
          control.defaultValue = 2070;
        } else if (controlId === 'widthMm') {
          control.min = 600;
          control.max = 1200;
          control.defaultValue = 900;
        } else if (controlId === 'depthMm') {
          control.min = 10;
          control.max = 100;
          control.defaultValue = 10;
        } else {
          control.min = control.min ?? 0;
          control.max = control.max ?? 100;
          control.defaultValue = control.defaultValue ?? control.min;
        }
      } else {
        control.min = control.min ?? 0;
        control.max = control.max ?? 0;
        control.defaultValue = control.defaultValue ?? control.min;
      }
      control.step = 10;
      if (controlId === 'depthMm') {
        // Depth pricing per 10mm over default
        let rc = typeof rateCents === 'number' ? Math.round(rateCents) : undefined;
        if (rc === undefined && typeof rateUSDPer10 === 'number') rc = Math.round(rateUSDPer10 * MARKUP * 100);
        if (rc === undefined) return res.status(400).json({ error: 'Provide rateCents or rateUSDPer10' });
        control.priceStrategy = { type: 'PER_UNIT', unit: 'TEN_MM', rateCents: rc, unitsFrom: 'deltaFromDefault' };
      } else if (control.priceStrategy?.type === 'THRESHOLD_FIXED' || (req.body?.strategyType === 'THRESHOLD_FIXED')) {
        const amt = computeAmount();
        if (threshold !== undefined) control.priceStrategy = { type: 'THRESHOLD_FIXED', compare: 'GT', threshold: Number(threshold), amountCents: amt ?? (control.priceStrategy?.amountCents ?? 0) };
        else if (amt !== undefined) control.priceStrategy = { ...(control.priceStrategy ?? { type: 'THRESHOLD_FIXED', compare: 'GT', threshold: 0 }), amountCents: amt };
      } else {
        // treat as PER_UNIT
        // For height/width we enforce threshold pricing; reject per-unit for these
        return res.status(400).json({ error: 'Only THRESHOLD_FIXED is supported for this control' });
      }
    } else if (action === 'upsertOptionTiered') {
      // Set tiered pricing based on a reference control (concealed rules)
      if (!optionId) return res.status(400).json({ error: 'optionId required' });
      const optList = (control.options ||= []);
      let opt = optList.find((o: any) => o.id === optionId);
      if (!opt) { opt = { id: optionId, label: optionId }; optList.push(opt); }
      const refId = typeof (req.body?.controlRefId) === 'string' ? String(req.body.controlRefId) : 'heightMm';
      const thr = typeof (req.body?.threshold) === 'number' ? Number(req.body.threshold) : 2100;
      if (typeof req.body?.belowUSD !== 'number' || typeof req.body?.aboveUSD !== 'number') return res.status(400).json({ error: 'belowUSD and aboveUSD required' });
      const belowCents = Math.round(req.body.belowUSD * MARKUP * 100);
      const aboveCents = Math.round(req.body.aboveUSD * MARKUP * 100);
      opt.priceStrategy = { type: 'TIERED_BY_CONTROL', controlId: refId, threshold: thr, belowAmountCents: belowCents, aboveAmountCents: aboveCents };
    } else {
      return res.status(400).json({ error: 'Unsupported action' });
    }

    const updated = await prisma.paramSchema.update({
      where: { id: active.id },
      data: { json: schema, checksum: sha256Json(schema), status: SchemaStatus.PUBLISHED },
    });
    res.json(updated);
  } catch (error) {
    console.error('schema merge failed', error);
    res.status(500).json({ error: 'Failed to merge schema' });
  }
});

// Single-config mode: publish endpoint becomes a no-op that returns the current active schema
app.post('/api/admin/schema/:slug/publishLatest', authenticate, requireAdmin, async (req, res) => {
  const slug = String(req.params.slug);
  try {
    const category = await prisma.category.findUnique({ where: { slug }, include: { activeSchema: true } });
    if (!category || !category.activeSchema) return res.status(404).json({ error: 'No active schema' });
    const json = category.activeSchema.json as any;
    const checksum = sha256Json(json);
    const updated = await prisma.paramSchema.update({ where: { id: category.activeSchema.id }, data: { status: SchemaStatus.PUBLISHED, checksum, publishedAt: category.activeSchema.publishedAt ?? new Date() } });
    if (category.activeSchemaId !== updated.id) {
      await prisma.category.update({ where: { id: category.id }, data: { activeSchemaId: updated.id } });
    }
    res.json(updated);
  } catch (error) {
    console.error('publishLatest no-op failed', error);
    res.status(500).json({ error: 'Failed to finalize schema' });
  }
});
