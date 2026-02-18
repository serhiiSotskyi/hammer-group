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
// Behind Azure (or any reverse proxy), Express must trust the proxy so that
// req.ip and middleware like express-rate-limit read X-Forwarded-For safely.
// Controlled by env; default on for production.
const TRUST_PROXY = (process.env.TRUST_PROXY ?? 'true').toLowerCase() !== 'false';
if (TRUST_PROXY) {
  const hopsRaw = process.env.TRUST_PROXY_HOPS ?? '1';
  const hops = Number(hopsRaw);
  app.set('trust proxy', Number.isFinite(hops) ? hops : true);
}
const prisma = new PrismaClient();
const dbUrl = process.env.DATABASE_URL || "";
const isSqlite = dbUrl.startsWith("file:") || dbUrl.startsWith("sqlite:");

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function generateUniqueSlug(
  source: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = toSlug(source) || "item";
  let candidate = base;
  let counter = 2;
  while (await isTaken(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}

// Security + CORS
// Support multiple origins via CORS_ORIGINS (comma-separated) or legacy CORS_ORIGIN
const rawOrigins =
  process.env.CORS_ORIGINS ||
  process.env.CORS_ORIGIN ||
  "http://localhost:5173";
const ALLOWED_ORIGINS = rawOrigins
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);
app.use(
  helmet({
    // Allow serving images/assets to a different origin in dev (frontend on 8080)
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
// Use a dynamic origin function to support multiple allowed origins
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Allow non-browser or same-origin requests without an Origin header
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: Origin not allowed: ${origin}`));
    },
  }),
);
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

async function ensureFurniturePortfolioSchema() {
  if (!isSqlite) return;
  try {
    const rows = await prisma.$queryRaw`PRAGMA table_info('FurniturePortfolio')`;
    const cols = Array.isArray(rows) ? rows : [];
    if (cols.length === 0) {
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "FurniturePortfolio" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "slug" TEXT,
        "imageUrl" TEXT NOT NULL,
        "albumJson" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`;
      await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "FurniturePortfolio_slug_key" ON "FurniturePortfolio"("slug")`;
      console.warn("Created missing FurniturePortfolio table");
      return;
    }
    const hasAlbumJson = cols.some((col: any) => col?.name === "albumJson");
    if (!hasAlbumJson) {
      await prisma.$executeRaw`ALTER TABLE "FurniturePortfolio" ADD COLUMN "albumJson" TEXT`;
      console.warn("Added missing FurniturePortfolio.albumJson column");
    }
    const hasSlug = cols.some((col: any) => col?.name === "slug");
    if (!hasSlug) {
      await prisma.$executeRaw`ALTER TABLE "FurniturePortfolio" ADD COLUMN "slug" TEXT`;
      console.warn("Added missing FurniturePortfolio.slug column");
    }
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "FurniturePortfolio_slug_key" ON "FurniturePortfolio"("slug")`;
  } catch (error) {
    console.error("Failed to ensure FurniturePortfolio schema", error);
  }
}
void ensureFurniturePortfolioSchema();

async function backfillFurniturePortfolioSlugs() {
  try {
    const items = await prisma.furniturePortfolio.findMany({
      where: {
        OR: [{ slug: null }, { slug: "" }],
      },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });

    for (const item of items) {
      const uniqueSlug = await generateUniqueSlug(item.name, async (candidate) => {
        const existing = await prisma.furniturePortfolio.findFirst({
          where: { slug: candidate, NOT: { id: item.id } },
          select: { id: true },
        });
        return Boolean(existing);
      });
      await prisma.furniturePortfolio.update({
        where: { id: item.id },
        data: { slug: uniqueSlug },
      });
    }
  } catch (error) {
    console.error("Failed to backfill FurniturePortfolio slugs", error);
  }
}
void backfillFurniturePortfolioSlugs();

app.get("/", (_req, res) => {
  res.send("Hammer Group API is running 🚀");
});

// Normalize known schema quirks to ensure UI works even if config is incomplete
function normalizeSchema(slug: string, schema: any): ParamSchemaJSON {
  if (!schema || typeof schema !== 'object') return schema as ParamSchemaJSON;
  try {
    if (slug === 'interior') {
      // Ensure groups array
      schema.groups = Array.isArray(schema.groups) ? [...schema.groups] : [];

      // Sizes group (dropdowns)
      let sizes = schema.groups.find((g: any) => g.id === 'sizes');
      if (!sizes) { sizes = { id: 'sizes', label: 'Розміри', controls: [] }; schema.groups.unshift(sizes); }
      const ensureSelect = (group: any, id: string, label: string, values: number[], def: number) => {
        let existing = group.controls?.find((x: any) => x.id === id);
        if (!existing || existing.type !== 'select') {
          const preservedStrategy = existing?.priceStrategy;
          const c: any = { id, type: 'select', label, required: true, defaultValue: String(def), options: [] };
          if (preservedStrategy) c.priceStrategy = preservedStrategy; // preserve control-level strategy (e.g., PER_UNIT for depth)
          group.controls = (group.controls || []).filter((x: any) => x.id !== id);
          group.controls.push(c);
          existing = c;
        }
        if (!Array.isArray((existing as any).options) || (existing as any).options.length === 0) {
          (existing as any).options = values.map((v: number) => ({ id: String(v), label: `${v} mm`, priceStrategy: { type: 'FIXED', amountCents: 0 } }));
        }
        if (!(existing as any).defaultValue) (existing as any).defaultValue = String(def);
      };
      const range = (min: number, max: number, step: number) => { const out: number[] = []; for (let v = min; v <= max; v += step) out.push(v); return out; };
      ensureSelect(sizes, 'heightMm', 'Висота (мм)', range(2000, 2400, 10), 2000);
      ensureSelect(sizes, 'widthMm', 'Ширина (мм)', range(300, 900, 10), 800);
      ensureSelect(sizes, 'depthMm', 'Глибина (мм)', range(100, 400, 10), 100);

      // Opening
      let opening = schema.groups.find((g: any) => g.id === 'opening');
      if (!opening) { opening = { id: 'opening', label: 'Відкривання', controls: [] }; schema.groups.push(opening); }
      let openingCtrl = opening.controls.find((c: any) => c.id === 'opening');
      const openingDefaults = [
        { id: 'left', label: 'Ліве', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        { id: 'right', label: 'Праве', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        { id: 'leftInside', label: 'Ліве (Inside)', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        { id: 'rightInside', label: 'Праве (Inside)', priceStrategy: { type: 'FIXED', amountCents: 0 } },
      ];
      if (!openingCtrl) {
        openingCtrl = { id: 'opening', type: 'select', label: 'Відкривання', defaultValue: 'left', options: openingDefaults };
        opening.controls.push(openingCtrl);
      } else {
        // Ensure all 4 opening options exist; do not remove any existing
        openingCtrl.type = 'select';
        openingCtrl.options = Array.isArray(openingCtrl.options) ? openingCtrl.options : [];
        for (const def of openingDefaults) {
          if (!openingCtrl.options.find((o: any) => o.id === def.id)) openingCtrl.options.push(def);
        }
        if (!openingCtrl.defaultValue || !openingCtrl.options.find((o: any) => o.id === openingCtrl.defaultValue)) {
          (openingCtrl as any).defaultValue = 'left';
        }
      }

      // Frame (Короб)
      let frame = schema.groups.find((g: any) => g.id === 'frame');
      if (!frame) { frame = { id: 'frame', label: 'Короб', controls: [] }; schema.groups.push(frame); }
      let frameType = frame.controls.find((c: any) => c.id === 'frameType');
      if (!frameType) {
        frameType = { id: 'frameType', type: 'select', label: 'Короб', defaultValue: 'standard', options: [
          { id: 'standard', label: 'Стандарт', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'complanar', label: 'Компланарний', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'inside', label: 'Inside', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ]};
        frame.controls.push(frameType);
      }

      // Lock (Замок)
      let lock = schema.groups.find((g: any) => g.id === 'lock');
      if (!lock) { lock = { id: 'lock', label: 'Замок', controls: [] }; schema.groups.push(lock); }
      let lockType = lock.controls.find((c: any) => c.id === 'lockType');
      if (!lockType) {
        lockType = { id: 'lockType', type: 'select', label: 'Тип замка', defaultValue: 'mechBlack', options: [
          { id: 'mechBlack', label: 'Механічний Чорний', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'mechChrome', label: 'Механічний Хром', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'magBlack', label: 'Магнітний Чорний', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'magChrome', label: 'Магнітний Хром', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ]};
        lock.controls.push(lockType);
      }

      // Casings (Лиштва): Outer only 'Звичайні'; Inner 'Звичайні' and 'Телескопічні'
      let casings = schema.groups.find((g: any) => g.id === 'casings');
      if (!casings) { casings = { id: 'casings', label: 'Лиштва', controls: [] }; schema.groups.push(casings); }
      let casingOuter = casings.controls.find((c: any) => c.id === 'casingOuter');
      if (!casingOuter) {
        casingOuter = { id: 'casingOuter', type: 'select', label: 'З зовнішньої сторони', defaultValue: 'normal', options: [
          { id: 'normal', label: 'Звичайні', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ]};
        casings.controls.push(casingOuter);
      } else {
        casingOuter.type = 'select';
        // Restrict to only 'normal'
        casingOuter.options = Array.isArray(casingOuter.options) ? casingOuter.options.filter((o: any) => o.id === 'normal') : [];
        if (!casingOuter.options.find((o: any) => o.id === 'normal')) {
          casingOuter.options.push({ id: 'normal', label: 'Звичайні', priceStrategy: { type: 'FIXED', amountCents: 0 } });
        }
        casingOuter.defaultValue = 'normal';
      }
      let casingInner = casings.controls.find((c: any) => c.id === 'casingInner');
      if (!casingInner) {
        casingInner = { id: 'casingInner', type: 'select', label: 'З внутрішньої сторони', defaultValue: 'normal', options: [
          { id: 'normal', label: 'Звичайні', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'telescopic', label: 'Телескопічні', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ]};
        casings.controls.push(casingInner);
      } else {
        casingInner.type = 'select';
        // Keep only allowed ids and remove legacy 'overlay'
        const allowed = new Set(['normal','telescopic']);
        const current = Array.isArray(casingInner.options) ? casingInner.options : [];
        casingInner.options = current.filter((o: any) => allowed.has(o.id));
        if (!casingInner.options.find((o: any) => o.id === 'normal')) casingInner.options.push({ id: 'normal', label: 'Звичайні', priceStrategy: { type: 'FIXED', amountCents: 0 } });
        if (!casingInner.options.find((o: any) => o.id === 'telescopic')) casingInner.options.push({ id: 'telescopic', label: 'Телескопічні', priceStrategy: { type: 'FIXED', amountCents: 0 } });
        casingInner.defaultValue = casingInner.defaultValue && ['normal','telescopic'].includes(casingInner.defaultValue) ? casingInner.defaultValue : 'normal';
      }

      // Hinges (Петлі)
      let hinges = schema.groups.find((g: any) => g.id === 'hinges');
      if (!hinges) { hinges = { id: 'hinges', label: 'Петлі', controls: [] }; schema.groups.push(hinges); }
      let hingeType = hinges.controls.find((c: any) => c.id === 'hingeType');
      if (!hingeType) {
        hingeType = { id: 'hingeType', type: 'select', label: 'Тип петель', defaultValue: 'standard', options: [
          { id: 'standard', label: 'Звичайні', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'hidden', label: 'Приховані', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ]};
        hinges.controls.push(hingeType);
      }
      let hingeCount = hinges.controls.find((c: any) => c.id === 'hingeCount');
      const countDefaults = [
        { id: '3', label: '3', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        { id: '4', label: '4', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        { id: '5', label: '5', priceStrategy: { type: 'FIXED', amountCents: 0 } },
      ];
      if (!hingeCount) {
        hingeCount = { id: 'hingeCount', type: 'select', label: 'Кількість петель', defaultValue: '3', options: countDefaults };
        hinges.controls.push(hingeCount);
      } else {
        // Force to select with exactly 3,4,5 options (remove legacy '2')
        hingeCount.type = 'select';
        hingeCount.options = countDefaults;
        hingeCount.defaultValue = ['3','4','5'].includes(hingeCount.defaultValue) ? hingeCount.defaultValue : '3';
      }

      // Stopper (Стопор)
      let stopper = schema.groups.find((g: any) => g.id === 'stopper');
      if (!stopper) { stopper = { id: 'stopper', label: 'Стопор', controls: [] }; schema.groups.push(stopper); }
      let stopperCtrl = stopper.controls.find((c: any) => c.id === 'stopper');
      if (!stopperCtrl) {
        stopperCtrl = { id: 'stopper', type: 'select', label: 'Стопор', defaultValue: 'none', options: [
          { id: 'none', label: 'Not Selected', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'phantom', label: 'Фантом', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'mvm', label: 'MVM', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ]};
        stopper.controls.push(stopperCtrl);
      }
      // Ensure 'Not Selected' exists and is first/default
      if (stopperCtrl) {
        stopperCtrl.type = 'select';
        const opts = Array.isArray(stopperCtrl.options) ? stopperCtrl.options : [];
        let none = opts.find((o: any) => o.id === 'none');
        if (!none) {
          opts.unshift({ id: 'none', label: 'Not Selected', priceStrategy: { type: 'FIXED', amountCents: 0 } });
        } else {
          none.label = 'Not Selected';
        }
        stopperCtrl.options = [opts.find((o: any) => o.id === 'none'), ...opts.filter((o: any) => o.id !== 'none')];
        stopperCtrl.defaultValue = 'none';
      }

      // Edge (Торець)
      let edge = schema.groups.find((g: any) => g.id === 'edge');
      if (!edge) { edge = { id: 'edge', label: 'Торець', controls: [] }; schema.groups.push(edge); }
      let edgeColor = edge.controls.find((c: any) => c.id === 'edgeColor');
      if (!edgeColor) {
        edgeColor = { id: 'edgeColor', type: 'select', label: 'Торець', defaultValue: 'none', options: [
          { id: 'none', label: 'Not Selected', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'black', label: 'Чорний', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'gold', label: 'Золотий', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'silver', label: 'Срібний', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ]};
        edge.controls.push(edgeColor);
      }
      // Ensure 'Not Selected' exists and is first/default for edge
      if (edgeColor) {
        edgeColor.type = 'select';
        const opts = Array.isArray(edgeColor.options) ? edgeColor.options : [];
        let none = opts.find((o: any) => o.id === 'none');
        if (!none) {
          opts.unshift({ id: 'none', label: 'Not Selected', priceStrategy: { type: 'FIXED', amountCents: 0 } });
        } else {
          none.label = 'Not Selected';
        }
        edgeColor.options = [opts.find((o: any) => o.id === 'none'), ...opts.filter((o: any) => o.id !== 'none')];
        edgeColor.defaultValue = 'none';
      }

      // Finish coat (Покриття)
      let finish = schema.groups.find((g: any) => g.id === 'finishCoat');
      if (!finish) { finish = { id: 'finishCoat', label: 'Покриття', controls: [] }; schema.groups.push(finish); }
      let fc = finish.controls.find((c: any) => c.id === 'finishCoat');
      if (!fc) {
        fc = { id: 'finishCoat', type: 'select', label: 'Покриття', defaultValue: 'pvc', options: [
          { id: 'pvc', label: 'ПВХ', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ]};
        finish.controls.push(fc);
      }

      // Set default displayMultiplier if missing
      (schema as any).displayMultiplier = typeof (schema as any).displayMultiplier === 'number' && (schema as any).displayMultiplier > 0 ? (schema as any).displayMultiplier : 1.3;
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
          // Always coerce to a numeric range control
          c.type = 'range';
          c.label = c.label || id;
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

      // Ensure install group exists (Під штукатурку / Під панелі)
      let install = schema.groups?.find((g: any) => g.id === 'install');
      if (!install) { install = { id: 'install', label: 'Installation', controls: [] }; schema.groups.push(install); }
      let installType = install.controls.find((c: any) => c.id === 'installType');
      if (!installType) {
        installType = { id: 'installType', type: 'radio', label: 'Тип монтажу', required: true, defaultValue: 'flushPlaster', options: [
          { id: 'flushPlaster', label: 'Під штукатурку', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'flushPanels', label: 'Під панелі', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ] };
        install.controls.push(installType);
      }

      // Ensure opening group exists
      let opening = schema.groups?.find((g: any) => g.id === 'opening');
      if (!opening) { opening = { id: 'opening', label: 'Сторона відкривання', controls: [] }; schema.groups.push(opening); }
      let openingCtrl = opening.controls.find((c: any) => c.id === 'opening');
      if (!openingCtrl) {
        openingCtrl = { id: 'opening', type: 'radio', label: 'Сторона', required: true, defaultValue: 'left', options: [
          { id: 'left', label: 'Ліве', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'right', label: 'Праве', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'leftInside', label: 'Ліве inside', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'rightInside', label: 'Праве inside', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ] };
        opening.controls.push(openingCtrl);
      }

      // Ensure edge group exists (visible to user)
      let edge = schema.groups?.find((g: any) => g.id === 'edge');
      if (!edge) { edge = { id: 'edge', label: 'Торець', controls: [] }; schema.groups.push(edge); }
      let edgeColor = edge.controls.find((c: any) => c.id === 'edgeColor');
      if (!edgeColor) {
        edgeColor = { id: 'edgeColor', type: 'select', label: 'Торець', defaultValue: 'black', options: [
          { id: 'black', label: 'Чорний', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'gold', label: 'Золотий', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'silver', label: 'Срібний', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ] };
        edge.controls.push(edgeColor);
      }

      // Remove profile/markup group from effective schema (pricing handled elsewhere)
      if (Array.isArray(schema.groups)) {
        schema.groups = schema.groups.filter((g: any) => g.id !== 'profile' && g.id !== 'finish');
      }

      // Opening already ensured above with direction options

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
  const allowedGroups = new Set([
    'sizes','opening','frame','lock','casings','hinges','stopper','edge','finishCoat'
  ]);
  const allowedControls = new Set([
    // sizes
    'heightMm','widthMm','depthMm',
    // opening
    'opening',
    // frame
    'frameType',
    // lock
    'lockType',
    // casings
    'casingOuter','casingInner',
    // hinges
    'hingeType','hingeCount','hinges',
    // stopper
    'stopper',
    // edge
    'edgeColor',
    // finish
    'finishCoat',
  ]);
  return (lines || []).filter((l) => allowedGroups.has(l.groupId) && allowedControls.has(l.controlId));
}

function filterConcealed<T extends { groupId: string; controlId: string }>(lines: T[]): T[] {
  const allowedGroups = new Set(["sizes", "construction", "hardware", "install", "hinges", "opening", "edge"]);
  const allowedControls = new Set([
    'heightMm',
    'frame',
    'magneticLock','magneticStopper','dropDownThreshold','paintFrameCasing',
    'installType','hinges','opening',
    'edgeColor',
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
    if (!categorySlug || !name) return res.status(400).json({ error: "categorySlug and name are required" });
    const category = await prisma.category.findUnique({ where: { slug: String(categorySlug) } });
    if (!category) return res.status(404).json({ error: "Category not found" });
    const uniqueSlug = await generateUniqueSlug(String(slug ?? name), async (candidate) => {
      const existing = await prisma.collection.findFirst({
        where: { categoryId: category.id, slug: candidate },
        select: { id: true },
      });
      return Boolean(existing);
    });
    const created = await prisma.collection.create({
      data: { categoryId: category.id, name: String(name), slug: uniqueSlug, imageUrl: imageUrl ?? null },
    });
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
    const current = await prisma.collection.findUnique({ where: { id }, select: { id: true, categoryId: true, name: true } });
    if (!current) return res.status(404).json({ error: "Collection not found" });

    const nextName = name !== undefined ? String(name) : current.name;
    let nextSlug: string | undefined;
    if (slug !== undefined || name !== undefined) {
      nextSlug = await generateUniqueSlug(String(slug ?? nextName), async (candidate) => {
        const existing = await prisma.collection.findFirst({
          where: { categoryId: current.categoryId, slug: candidate, NOT: { id } },
          select: { id: true },
        });
        return Boolean(existing);
      });
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: nextName } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl ?? null } : {}),
      },
    });
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
// Persist albums in DB (albumJson). Keep file-store fallback for legacy instances.
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
  try { await fs.promises.writeFile(albumsStorePath, JSON.stringify(data, null, 2), 'utf8'); } catch {}
}

app.get("/api/furniture/portfolio", async (_req, res) => {
  try {
    const [items, albums] = await Promise.all([
      prisma.furniturePortfolio.findMany({ orderBy: { createdAt: "desc" } }),
      readAlbumsStore(),
    ]);
    // Map: prefer DB albumJson; fallback to legacy file-store
    const result = items.map((it: any) => ({
      id: it.id,
      name: it.name,
      slug: it.slug ?? `${toSlug(String(it.name ?? "")) || "item"}-${it.id}`,
      coverUrl: it.imageUrl, // legacy field
      albumUrls: Array.isArray(it.albumJson as any) ? (it.albumJson as any) : (Array.isArray(albums[String(it.id)]) ? albums[String(it.id)] : []),
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
    const { name, slug } = req.body ?? {};
    const coverUrl = req.body?.coverUrl || req.body?.imageUrl; // backward compat
    const albumUrls = Array.isArray(req.body?.albumUrls) ? req.body.albumUrls as string[] : [];
    if (!name || !coverUrl) return res.status(400).json({ error: "name and coverUrl are required" });
    const uniqueSlug = await generateUniqueSlug(String(slug ?? name), async (candidate) => {
      const existing = await prisma.furniturePortfolio.findUnique({ where: { slug: candidate }, select: { id: true } });
      return Boolean(existing);
    });
    const item = await prisma.furniturePortfolio.create({
      data: { name: String(name), slug: uniqueSlug, imageUrl: String(coverUrl), albumJson: albumUrls as any },
    });
    // Legacy file-store write (best-effort)
    const albums = await readAlbumsStore();
    albums[String(item.id)] = albumUrls;
    await writeAlbumsStore(albums);
    res.status(201).json({ id: item.id, name: item.name, slug: item.slug, coverUrl: coverUrl, albumUrls });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create portfolio item" });
  }
});

app.put("/api/furniture/portfolio/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, slug } = req.body ?? {};
    const coverUrl = (req.body?.coverUrl ?? req.body?.imageUrl) as string | undefined;
    const albumUrls = Array.isArray(req.body?.albumUrls) ? (req.body.albumUrls as string[]) : undefined;
    const current = await prisma.furniturePortfolio.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!current) return res.status(404).json({ error: "Portfolio item not found" });

    const nextName = name !== undefined ? String(name) : current.name;
    let nextSlug: string | undefined;
    if (slug !== undefined || name !== undefined) {
      nextSlug = await generateUniqueSlug(String(slug ?? nextName), async (candidate) => {
        const existing = await prisma.furniturePortfolio.findFirst({
          where: { slug: candidate, NOT: { id } },
          select: { id: true },
        });
        return Boolean(existing);
      });
    }
    const item = await prisma.furniturePortfolio.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: nextName } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(coverUrl !== undefined ? { imageUrl: String(coverUrl) } : {}),
        ...(albumUrls !== undefined ? { albumJson: albumUrls as any } : {}),
      },
    });
    if (albumUrls) { const albums = await readAlbumsStore(); albums[String(id)] = albumUrls; await writeAlbumsStore(albums); }
    res.json({ id: item.id, name: item.name, slug: item.slug ?? null, coverUrl: item.imageUrl, albumUrls: (albumUrls ?? (item.albumJson as any) ?? []) });
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

    if (!name || typeof basePriceCents !== "number") {
      return res.status(400).json({ error: "name and basePriceCents are required" });
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

    const uniqueSlug = await generateUniqueSlug(String(slug ?? name), async (candidate) => {
      const existing = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
      return Boolean(existing);
    });

    const product = await prisma.product.create({
      data: {
        name: String(name),
        slug: uniqueSlug,
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
    const current = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!current) return res.status(404).json({ error: "Product not found" });

    const nextName = name !== undefined ? String(name) : current.name;
    let nextSlug: string | undefined;
    if (slug !== undefined || name !== undefined) {
      nextSlug = await generateUniqueSlug(String(slug ?? nextName), async (candidate) => {
        const existing = await prisma.product.findFirst({ where: { slug: candidate, NOT: { id } }, select: { id: true } });
        return Boolean(existing);
      });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: nextName } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
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
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
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
    const reqIsBudget = Boolean((selections as any)?.budget);
    const dbIsBudget = String((product as any)?.doorType || '').toUpperCase() === 'BUDGET';
    if (product.category.slug === 'concealed' && (dbIsBudget || reqIsBudget)) {
      const sizes = (schema as any).groups?.find((g: any) => g.id === 'sizes');
      const h = sizes?.controls?.find((c: any) => c.id === 'heightMm');
      if (h) { h.max = 2100; if (h.defaultValue > 2100) h.defaultValue = 2100; }
      // Flag schema so pricing engine uses Budget path reliably
      (schema as any).budget = true;
    }
    const result = priceQuote(product.basePriceCents, schema, selections ?? {});
    const fx = await getDailyUsdToUah(prisma);
    const conv = (c: number) => convertCentsUsdToUah(c, fx.rate);
    const { normalizedSelections, ...priced } = result;
    // Apply optional display multiplier to adjustments ONLY (never base)
    const mult = typeof (schema as any).displayMultiplier === 'number' && (schema as any).displayMultiplier > 0 ? (schema as any).displayMultiplier : 1;
    const scale = (v: number) => Math.round(v * mult);
    const scaledBase = priced.basePriceCents; // never multiply base price
    const scaledBreakdown = priced.breakdown.map((b) => ({ ...b, deltaCents: scale(b.deltaCents) }));
    const scaledAdjustments = scaledBreakdown.reduce((sum, b) => sum + b.deltaCents, 0);
    const scaledTotal = scaledBase + scaledAdjustments;
    res.json({
      currency: "UAH",
      basePriceCents: conv(scaledBase),
      adjustmentsCents: conv(scaledAdjustments),
      totalPriceCents: conv(scaledTotal),
      rounding: priced.rounding,
      breakdown: scaledBreakdown.map((b) => ({ ...b, deltaCents: conv(b.deltaCents) })),
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
    const reqIsBudget2 = Boolean((selections as any)?.budget);
    const dbIsBudget2 = String((product as any)?.doorType || '').toUpperCase() === 'BUDGET';
    if (product.category.slug === 'concealed' && (dbIsBudget2 || reqIsBudget2)) {
      const sizes = (schemaJson as any).groups?.find((g: any) => g.id === 'sizes');
      const h = sizes?.controls?.find((c: any) => c.id === 'heightMm');
      if (h) { h.max = 2100; if (h.defaultValue > 2100) h.defaultValue = 2100; }
      // Enforce Budget-specific restrictions
      // 1) Frame only wood
      const construction = (schemaJson as any).groups?.find((g: any) => g.id === 'construction');
      const frame = construction?.controls?.find((c: any) => c.id === 'frame');
      if (frame && Array.isArray(frame.options)) {
        frame.options = frame.options.filter((o: any) => o.id === 'wood');
        frame.defaultValue = 'wood';
      }
      // 2) Install type only flushPlaster
      const install = (schemaJson as any).groups?.find((g: any) => g.id === 'install');
      const installType = install?.controls?.find((c: any) => c.id === 'installType');
      if (installType && Array.isArray(installType.options)) {
        installType.options = installType.options.filter((o: any) => o.id === 'flushPlaster');
        installType.defaultValue = 'flushPlaster';
      }
      // 3) Hinges options 2/3/4 of type A (price totals configurable via admin)
      let hingesGroup = (schemaJson as any).groups?.find((g: any) => g.id === 'hinges');
      if (!hingesGroup) { hingesGroup = { id: 'hinges', label: 'Петлі', controls: [] }; (schemaJson as any).groups.push(hingesGroup); }
      let hingesCtrl2 = hingesGroup.controls.find((c: any) => c.id === 'hinges');
      if (!hingesCtrl2) {
        hingesCtrl2 = { id: 'hinges', type: 'select', label: 'Петлі', defaultValue: '3', options: [
          { id: '2', label: '2A', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: '3', label: '3A', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: '4', label: '4A', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ] };
        hingesGroup.controls.push(hingesCtrl2);
      } else {
        hingesCtrl2.type = 'select';
        const allowed = new Set(['2','3','4']);
        hingesCtrl2.options = (Array.isArray(hingesCtrl2.options) ? hingesCtrl2.options : []).filter((o: any) => allowed.has(o.id));
        // Ensure presence with A labels
        ['2','3','4'].forEach((id) => { if (!hingesCtrl2.options.find((o: any) => o.id === id)) hingesCtrl2.options.push({ id, label: `${id}A`, priceStrategy: { type: 'FIXED', amountCents: 0 } }); });
        // Normalize labels to include A suffix
        hingesCtrl2.options = hingesCtrl2.options.map((o: any) => ({ ...o, label: `${o.id}A` }));
        if (!hingesCtrl2.defaultValue || !allowed.has(hingesCtrl2.defaultValue)) hingesCtrl2.defaultValue = '3';
      }
      // 4) Edge colors Black/Gold/Silver
      let edgeGroup = (schemaJson as any).groups?.find((g: any) => g.id === 'edge');
      if (!edgeGroup) { edgeGroup = { id: 'edge', label: 'Торець', controls: [] }; (schemaJson as any).groups.push(edgeGroup); }
      let edgeCtrl = edgeGroup.controls.find((c: any) => c.id === 'edgeColor');
      if (!edgeCtrl) {
        edgeCtrl = { id: 'edgeColor', type: 'select', label: 'Торець', defaultValue: 'black', options: [
          { id: 'black', label: 'Чорний', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'gold', label: 'Золотий', priceStrategy: { type: 'FIXED', amountCents: 0 } },
          { id: 'silver', label: 'Срібний', priceStrategy: { type: 'FIXED', amountCents: 0 } },
        ] };
        edgeGroup.controls.push(edgeCtrl);
      }
      // 5) Mark as budget to disable opening surcharges
      (schemaJson as any).budget = true;
    }
    const priced = priceQuote(product.basePriceCents, schemaJson, selections ?? {});
    const fx = await getDailyUsdToUah(prisma);
    const conv = (c: number) => convertCentsUsdToUah(c, fx.rate);
    // Apply optional display multiplier to adjustments ONLY (never base)
    const mult = typeof (schemaJson as any).displayMultiplier === 'number' && (schemaJson as any).displayMultiplier > 0 ? (schemaJson as any).displayMultiplier : 1;
    const scale = (v: number) => Math.round(v * mult);
    const scaledBase = priced.basePriceCents; // never multiply base price
    const scaledBreakdown = priced.breakdown.map((b) => ({ ...b, deltaCents: scale(b.deltaCents) }));
    const scaledAdjustments = scaledBreakdown.reduce((sum, b) => sum + b.deltaCents, 0);
    const scaledTotal = scaledBase + scaledAdjustments;
    const normalizedSelections = priced.normalizedSelections;
    const payload = {
      currency: priced.currency,
      basePriceCents: scaledBase,
      adjustmentsCents: scaledAdjustments,
      totalPriceCents: scaledTotal,
      rounding: priced.rounding,
      breakdown: scaledBreakdown,
    };

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
    // Helpers: robust numeric parsing and validation (supports decimal commas like "12,5")
    const parseNumber = (val: any): number | undefined => {
      if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;
      if (typeof val === 'string') {
        const s = val.trim().replace(',', '.');
        if (!s) return undefined;
        const n = Number(s);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    };
    const requireId = (name: string, v: any) => {
      if (typeof v !== 'string' || v.trim().length === 0) {
        res.status(400).json({ error: `${name} required` });
        return false;
      }
      return true;
    };

    // Validate base requirements by action
    if (!requireId('action', action)) return;
    const requireGC = () => requireId('groupId', groupId) && requireId('controlId', controlId);
    const noGroupControl = new Set(['setDisplayMultiplier','setOpeningInsideSurcharge','setHingeUnitPrices','setHeightSurcharges']);
    const needsGroupControl = (act: string) => !noGroupControl.has(act);
    if (action === 'upsertOption' || action === 'upsertOptionTiered' || action === 'updateRange' || noGroupControl.has(action)) {
      if (needsGroupControl(action) && !requireGC()) return;
    } else {
      return res.status(400).json({ error: 'Unsupported action' });
    }

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

    // Special action: set display multiplier at schema root
    if (action === 'setDisplayMultiplier') {
      const m = parseNumber(req.body?.multiplier);
      if (!Number.isFinite(m!) || (m as number) <= 0) return res.status(400).json({ error: 'Valid multiplier required' });
      schema.displayMultiplier = m;
      // persists via update below
    } else if (action === 'setOpeningInsideSurcharge') {
      const woodUSD = parseNumber(req.body?.woodUSD);
      const aluminiumUSD = parseNumber(req.body?.aluminiumUSD);
      if (!Number.isFinite(woodUSD as number) || !Number.isFinite(aluminiumUSD as number)) return res.status(400).json({ error: 'woodUSD and aluminiumUSD required (numbers)' });
      const wood = Math.round((woodUSD as number) * MARKUP * 100);
      const aluminium = Math.round((aluminiumUSD as number) * MARKUP * 100);
      schema.openingInsideSurcharge = { wood, aluminium };
    } else if (action === 'setHingeUnitPrices') {
      const AUSD = parseNumber(req.body?.AUSD);
      const BUSD = parseNumber(req.body?.BUSD);
      if (!Number.isFinite(AUSD as number) || !Number.isFinite(BUSD as number)) return res.status(400).json({ error: 'AUSD and BUSD required (numbers)' });
      const A = Math.round((AUSD as number) * MARKUP * 100);
      const B = Math.round((BUSD as number) * MARKUP * 100);
      schema.hingeUnitPrices = { A, B };
    } else if (action === 'setHeightSurcharges') {
      const over2100USD = parseNumber(req.body?.over2100USD);
      const over2300USD = parseNumber(req.body?.over2300USD);
      if (!Number.isFinite(over2100USD as number) || !Number.isFinite(over2300USD as number)) return res.status(400).json({ error: 'over2100USD and over2300USD required (numbers)' });
      const over2100 = Math.round((over2100USD as number) * MARKUP * 100);
      const over2300 = Math.round((over2300USD as number) * MARKUP * 100);
      schema.heightSurcharges = { over2100, over2300 };
    }

    // Locate group/control only for actions that modify a specific control/option
    let group: any = undefined;
    let control: any = undefined;
    if (needsGroupControl(action)) {
      group = schema.groups.find((g: any) => g.id === groupId);
      if (!group) {
        if (typeof groupId !== 'string' || !groupId.trim()) return res.status(400).json({ error: 'groupId required' });
        group = { id: groupId, label: groupId, controls: [] };
        schema.groups.push(group);
      }
      control = group.controls.find((c: any) => c.id === controlId);
      if (!control) {
        if (typeof controlId !== 'string' || !controlId.trim()) return res.status(400).json({ error: 'controlId required' });
        control = { id: controlId, type: 'radio', label: controlId, options: [] };
        group.controls.push(control);
      }
    }

    const amountCentsNum = parseNumber(amountCents);
    const costUSDNum = parseNumber(costUSD);
    const rateCentsNum = parseNumber(rateCents);
    const rateUSDPer10Num = parseNumber(rateUSDPer10);
    const thresholdNum = parseNumber(threshold);
    const computeAmount = () => {
      if (Number.isFinite(amountCentsNum as number)) return Math.round(amountCentsNum as number);
      if (Number.isFinite(costUSDNum as number)) return Math.round((costUSDNum as number) * MARKUP * 100);
      return undefined;
    };

    if (action === 'upsertOption') {
      if (!optionId) return res.status(400).json({ error: 'optionId required' });
      const optList = (control.options ||= []);
      let opt = optList.find((o: any) => o.id === optionId);
      if (!opt) { opt = { id: optionId, label: optionId }; optList.push(opt); }
      const amt = computeAmount();
      if (!Number.isFinite(amt as number)) return res.status(400).json({ error: 'Provide amountCents or costUSD (number)' });
      opt.priceStrategy = { type: 'FIXED', amountCents: amt };
      // Ensure a baseline 'standard' option exists for finishCoat if only 'standardPlus' was added
      if (groupId === 'finishCoat' && controlId === 'finishCoat' && optionId === 'standardPlus') {
        if (!optList.find((o: any) => o.id === 'standard')) {
          optList.push({ id: 'standard', label: 'Standard', priceStrategy: { type: 'FIXED', amountCents: 0 } });
        }
      }
    } else if (action === 'updateRange') {
      // For depthMm we keep select UI but set control-level PER_UNIT strategy
      if (controlId === 'depthMm') {
        let rc = Number.isFinite(rateCentsNum as number) ? Math.round(rateCentsNum as number) : undefined;
        if (rc === undefined && Number.isFinite(rateUSDPer10Num as number)) rc = Math.round((rateUSDPer10Num as number) * MARKUP * 100);
        if (!Number.isFinite(rc as number)) return res.status(400).json({ error: 'Provide rateCents or rateUSDPer10 (number)' });
        control.type = control.type || 'select';
        control.step = 10;
        // Base default depth for delta is 100mm
        control.defaultValue = control.defaultValue ?? '100';
        control.priceStrategy = { type: 'PER_UNIT', unit: 'TEN_MM', rateCents: rc, unitsFrom: 'deltaFromDefault' } as any;
      } else if (controlId === 'heightMm') {
        // Height threshold bump: set THRESHOLD_FIXED at 2100 by default
        const amt = computeAmount();
        if (!Number.isFinite(amt as number)) return res.status(400).json({ error: 'Provide amountCents or costUSD (number)' });
        const thr = Number.isFinite(thresholdNum as number) ? (thresholdNum as number) : 2100;
        control.priceStrategy = { type: 'THRESHOLD_FIXED', compare: 'GT', threshold: thr, amountCents: amt } as any;
      } else {
        // Other controls not supported via updateRange in Interior
        return res.status(400).json({ error: 'Unsupported control for updateRange' });
      }
    } else if (action === 'upsertOptionTiered') {
      // Set tiered pricing based on a reference control (concealed rules)
      if (!optionId) return res.status(400).json({ error: 'optionId required' });
      const optList = (control.options ||= []);
      let opt = optList.find((o: any) => o.id === optionId);
      if (!opt) { opt = { id: optionId, label: optionId }; optList.push(opt); }
      const refId = typeof (req.body?.controlRefId) === 'string' ? String(req.body.controlRefId) : 'heightMm';
      const thrRaw = parseNumber(req.body?.threshold);
      const thr = Number.isFinite(thrRaw as number) ? (thrRaw as number) : 2100;
      const belowUSD = parseNumber(req.body?.belowUSD);
      const aboveUSD = parseNumber(req.body?.aboveUSD);
      if (!Number.isFinite(belowUSD as number) || !Number.isFinite(aboveUSD as number)) return res.status(400).json({ error: 'belowUSD and aboveUSD required (numbers)' });
      const belowCents = Math.round((belowUSD as number) * MARKUP * 100);
      const aboveCents = Math.round((aboveUSD as number) * MARKUP * 100);
      opt.priceStrategy = { type: 'TIERED_BY_CONTROL', controlId: refId, threshold: thr, belowAmountCents: belowCents, aboveAmountCents: aboveCents };
    } else if (action === 'setDisplayMultiplier' || action === 'setOpeningInsideSurcharge' || action === 'setHingeUnitPrices' || action === 'setHeightSurcharges') {
      // already handled above (root-level schema changes)
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
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Failed to merge schema', details: message });
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
