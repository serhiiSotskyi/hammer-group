// Read-only client for the real Hammer Group backend (proxied by Vite at /api and /uploads).
// The prototype never calls write endpoints such as POST /api/quotes.
import { useEffect, useState } from "react";
import labels from "./schema-uk.json";
import type { Product } from "./data";

export type PublicPromo = { id: number; title: string; subtitle?: string | null; kind: "PERCENT" | "AMOUNT_OFF" | "ANNOUNCEMENT"; value: number | null; label: string; endsAt: string | null; imageUrl?: string | null };
export type ActivePromos = {
  ticker: PublicPromo[];
  dealOfWeek: (PublicPromo & { product: ApiProduct | null }) | null;
  popup: (PublicPromo & { code: string | null }) | null;
};
export type Activity = { productName: string; categorySlug: string; createdAt: string };

export type ApiProduct = {
  id: number; name: string; slug: string; basePriceCents: number; imageUrl?: string | null;
  promotion?: PublicPromo | null; promoPriceCents?: number | null; featuredSource?: "manual" | "popular" | "catalog";
  description?: string | null; doorType?: "STANDARD" | "BUDGET";
  convertedPriceCents?: number; currency?: string;
  category?: { slug: string; name: string }; collection?: { slug: string; name: string } | null;
};
export type ApiCollection = { id: number; name: string; slug: string; imageUrl?: string | null };
export type ApiPortfolio = { id: number; name: string; slug?: string; coverUrl: string; albumUrls?: string[]; projectType: "DOORS" | "FURNITURE" };

export type Ctrl = {
  id: string; type: "select" | "radio" | "range" | "boolean"; label?: string; defaultValue?: unknown;
  options?: { id: string; label?: string }[]; min?: number; max?: number; step?: number; unit?: string;
};
export type Schema = { groups: { id: string; label?: string; controls: Ctrl[] }[] };
export type PriceLine = { controlId: string; controlLabel?: string; groupId?: string; displayValue?: string; deltaCents: number };
export type Price = { currency: string; basePriceCents: number; adjustmentsCents: number; totalPriceCents: number; totalBeforeDiscountCents?: number; breakdown: PriceLine[]; promotion?: (PublicPromo & { discountCents: number }) | null };

// Dev: empty, so /api and /uploads go through the Vite proxy. Hosted builds set VITE_API_ORIGIN to the backend URL.
export const API_ORIGIN = ((import.meta.env.VITE_API_ORIGIN as string | undefined) ?? "").replace(/\/$/, "");
const withOrigin = (path: string) => (/^\/(api|uploads)\//.test(path) ? `${API_ORIGIN}${path}` : path);

export const img = (u?: string | null) => (!u ? "/img/oak-flush.jpg" : /^https?:/.test(u) ? u : withOrigin(u.startsWith("/") ? u : `/${u}`));

const cache = new Map<string, Promise<unknown>>();
export function getJSON<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(url, fetch(withOrigin(url)).then((r) => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }).catch((e) => { cache.delete(url); throw e; }));
  }
  return cache.get(url) as Promise<T>;
}

/** Tiny fetch hook: { data, error, loading }. */
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: !!url });
  useEffect(() => {
    if (!url) return;
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    getJSON<T>(url).then((data) => live && setState({ data, loading: false })).catch((e) => live && setState({ error: String(e.message ?? e), loading: false }));
    return () => { live = false; };
  }, [url]);
  return state;
}

/** Active promotions. `unavailable` = backend has no promotions API yet (e.g. production before deploy). */
export function usePromotions() {
  const r = useApi<ActivePromos>("/api/promotions/active");
  return { promos: r.data, loading: r.loading, unavailable: !!r.error };
}

export const productsUrl = (q: Record<string, string>) => `/api/products?${new URLSearchParams(q)}`;

/** API product → card model. Price is the converted UAH "from" price shown on the live site. */
export const toCard = (p: ApiProduct): Product => ({
  slug: p.slug,
  name: p.name.trim(),
  image: img(p.imageUrl),
  // Promotion prices come from the backend (same rules as /api/price); never invented on the client.
  price: Math.round((p.promoPriceCents ?? p.convertedPriceCents ?? p.basePriceCents) / 100),
  oldPrice: p.promoPriceCents != null ? Math.round((p.convertedPriceCents ?? p.basePriceCents) / 100) : undefined,
  tag: p.promotion && p.promoPriceCents != null ? "−%" : undefined,
  finish: p.collection?.name ?? p.category?.name ?? "",
  note: p.collection?.name ? `Колекція «${p.collection.name}»` : p.doorType === "BUDGET" ? "Стандартні розміри" : "Під ваш розмір",
});

export const customizerPath = (p: ApiProduct | Product, kind: "interior" | "concealed") =>
  `${kind === "concealed" ? "/concealed-customizer" : "/customizer"}?slug=${encodeURIComponent(p.slug)}`;

export async function fetchPrice(productSlug: string, selections: Record<string, unknown>): Promise<Price> {
  const r = await fetch(withOrigin("/api/price"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productSlug, selections }) });
  if (!r.ok) throw new Error(`price ${r.status}`);
  return r.json();
}

// Ukrainian labels, copied from the live site's i18n (apps/frontend/src/i18n/uk.json → schema).
type L = { groups: Record<string, string>; controls: Record<string, string>; options: Record<string, Record<string, string>> };
const L = labels as unknown as L;
export const tGroup = (id: string, fb?: string) => L.groups[id] ?? fb ?? id;
export const tCtrl = (id: string, fb?: string) => L.controls[id] ?? (fb && fb !== id ? fb : id);
export const tOpt = (ctrl: string, id: string, fb?: string) => L.options[ctrl]?.[id] ?? (fb && fb !== id ? fb : id);
