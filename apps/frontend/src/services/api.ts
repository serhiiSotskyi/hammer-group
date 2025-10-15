import { ParamSchemaJSON, PricingBreakdownEntry } from "@/types/paramSchema";

export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "";
const API_URL = `${API_ORIGIN}/api`;

export interface ProductResponse {
  id: number;
  name: string;
  slug: string;
  basePriceCents: number;
  imageUrl?: string | null;
  categoryId: number;
  description?: string | null;
  collectionId?: number | null;
  doorType?: 'STANDARD' | 'BUDGET';
  isActive: boolean;
  // Optional fields provided by server for converted display
  convertedPriceCents?: number;
  currency?: string;
}

export interface PriceResponse {
  currency: string;
  basePriceCents: number;
  adjustmentsCents: number;
  totalPriceCents: number;
  rounding: ParamSchemaJSON["rounding"];
  breakdown: PricingBreakdownEntry[];
  fx?: { base: string; quote: string; rate: number; asOf: string };
}

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
}

export const getProducts = async (params: Record<string, string | number> = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString();

  const res = await fetch(`${API_URL}/products${query ? `?${query}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return (await res.json()) as ProductResponse[];
};

// Collections
export type Collection = { id: number; categoryId: number; name: string; slug: string; imageUrl?: string | null };
export const getCollections = async (categorySlug: string) => {
  const res = await fetch(`${API_URL}/collections?categorySlug=${encodeURIComponent(categorySlug)}`);
  if (!res.ok) throw new Error('Failed to fetch collections');
  return res.json() as Promise<Collection[]>;
};

export const createCollection = async (categorySlug: string, payload: { name: string; slug: string; imageUrl?: string | null }) => {
  const res = await fetch(`${API_URL}/admin/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categorySlug, ...payload }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to create collection');
  return res.json() as Promise<Collection>;
};

export const updateCollection = async (id: number, payload: Partial<{ name: string; slug: string; imageUrl?: string | null }>) => {
  const res = await fetch(`${API_URL}/admin/collections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to update collection');
  return res.json() as Promise<Collection>;
};

export const deleteCollection = async (id: number) => {
  const res = await fetch(`${API_URL}/admin/collections/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || 'Failed to delete collection');
  }
};

// FX admin
export const getCurrentFx = async () => {
  const res = await fetch(`${API_URL}/admin/fx/current`, { credentials: 'include' });
  if (!res.ok) throw new Error("Failed to load FX rate");
  return res.json() as Promise<{ base: string; quote: string; rate: number; asOf: string; source: string }>;
};

export const setManualFx = async (rate: number, asOfDate?: string) => {
  const res = await fetch(`${API_URL}/admin/fx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rate, asOfDate }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to save FX rate');
  return res.json();
};

export const createProduct = async (product: Partial<ProductResponse>) => {
  const res = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
};

export const updateProduct = async (id: number, product: Partial<ProductResponse>) => {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to update product");
  return res.json();
};

export const deleteProduct = async (id: number) => {
  const res = await fetch(`${API_URL}/products/${id}`, { method: "DELETE", credentials: 'include' });
  if (!res.ok) throw new Error("Failed to delete product");
};

export const getInteriorSchema = async () => {
  // Cache-busting param to avoid stale 304 after publishing a new schema
  const ts = Date.now();
  const res = await fetch(`${API_URL}/categories/interior/schema?ts=${ts}`, { cache: 'no-store' as RequestCache });
  if (!res.ok) throw new Error("Interior schema not available");
  return res.json() as Promise<{
    categoryId: number;
    version: number;
    checksum: string;
    label: string;
    publishedAt: string | null;
    schema: ParamSchemaJSON;
  }>;
};

export const getCategorySchema = async (slug: string) => {
  const ts = Date.now();
  const res = await fetch(`${API_URL}/categories/${slug}/schema?ts=${ts}`, { cache: 'no-store' as RequestCache });
  if (!res.ok) throw new Error(`${slug} schema not available`);
  return res.json() as Promise<{
    categoryId: number;
    version: number;
    checksum: string;
    label: string;
    publishedAt: string | null;
    schema: ParamSchemaJSON;
  }>;
};

export const priceInteriorQuote = async (
  productSlug: string,
  selections: Record<string, unknown>,
) => {
  const res = await fetch(`${API_URL}/price`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productSlug, selections }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.errors ? JSON.stringify(body.errors) : "Pricing failed");
  }
  return res.json() as Promise<PriceResponse>;
};

export const createInteriorQuote = async (
  productSlug: string,
  selections: Record<string, unknown>,
  payload?: { name?: string; email?: string; phone?: string; notes?: string },
) => {
  const res = await fetch(`${API_URL}/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productSlug,
      selections,
      customer: payload && (payload.name || payload.email) ? payload : undefined,
      notes: payload?.notes,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.errors ? JSON.stringify(body.errors) : "Failed to create quote");
  }

  return res.json() as Promise<{ quoteId: string; totalPriceCents: number }>;
};

// Admin quotes
export type AdminQuote = {
  id: string;
  createdAt: string;
  product: ProductResponse;
  categoryId: number;
  basePriceCents: number;
  adjustmentsCents: number;
  totalPriceCents: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  delivered: boolean;
  adminNotes?: string | null;
};

export const listAdminQuotes = async (): Promise<AdminQuote[]> => {
  const res = await fetch(`${API_URL}/admin/quotes`, { credentials: 'include' });
  if (!res.ok) throw new Error("Failed to load quotes");
  return res.json();
};

export const updateAdminQuote = async (
  id: string,
  payload: Partial<Pick<AdminQuote, "delivered" | "adminNotes">>,
) => {
  const res = await fetch(`${API_URL}/admin/quotes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to update quote");
  return res.json();
};

// Auth helpers
export const authMe = async () => {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
  if (res.status === 401) return null as const;
  if (!res.ok) throw new Error('Failed to check session');
  return res.json() as Promise<{ role: 'ADMIN' }>;
};

export const authLogin = async (email: string, password: string) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Invalid credentials');
};

export const authLogout = async () => {
  await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
};

// Upload an image as base64 and receive a public URL
export const uploadImage = async (file: File): Promise<string> => {
  // Use FileReader to avoid spreading large arrays (which can blow the stack)
  const toDataUrl = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(f);
    });

  const dataUrl = await toDataUrl(file);
  const base64 = dataUrl.includes(",") ? dataUrl.split(",").pop()! : dataUrl;

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name?.split(".")?.[0] ?? "image",
      contentType: file.type,
      data: base64,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || "Upload failed");
  }
  const { url } = await res.json();
  return url as string;
};

export const getCategories = async () => {
  const res = await fetch(`${API_URL}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return (await res.json()) as CategoryResponse[];
};

// Resolve image URL to absolute backend URL (so /uploads/* works in the browser)
export const resolveImageUrl = (url?: string | null) => {
  if (!url) return null;
  // Absolute URL stays as is
  if (/^https?:\/\//i.test(url)) return url;
  // Normalize plain 'uploads/...'
  if (url.startsWith("uploads/")) return `${API_ORIGIN}/${url}`;
  // Only serve backend-hosted uploads; ignore other absolute paths (e.g., /doors/* from seed)
  if (url.startsWith("/uploads/")) return `${API_ORIGIN}${url}`;
  // Unknown format: let caller fallback to placeholder
  return null;
};
