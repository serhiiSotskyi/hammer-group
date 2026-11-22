import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listPromotions, savePromotion, deletePromotion, getFeaturedProducts, setFeaturedProducts,
  getCategories, getCollections, getProducts, getCurrentFx,
  type AdminPromotion, type PromotionInput, type PromotionKind,
} from "@/services/api";

const KIND_LABEL: Record<PromotionKind, string> = {
  PERCENT: "Знижка у %",
  AMOUNT_OFF: "Знижка сумою (USD)",
  ANNOUNCEMENT: "Лише оголошення (без знижки)",
};

const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

const empty = (): PromotionInput => ({
  title: "", subtitle: null, kind: "PERCENT", value: 10, categoryId: null, collectionId: null, productIds: [],
  startsAt: new Date().toISOString(), endsAt: null, showInTicker: true, isDealOfWeek: false, showPopup: false,
  popupCode: null, imageUrl: null, priority: 0, isActive: true,
});

const fromPromo = (p: AdminPromotion): PromotionInput => ({
  title: p.title, subtitle: p.subtitle, kind: p.kind, value: p.value, categoryId: p.categoryId, collectionId: p.collectionId,
  productIds: p.products.map((x) => x.product.id), startsAt: p.startsAt, endsAt: p.endsAt, showInTicker: p.showInTicker,
  isDealOfWeek: p.isDealOfWeek, showPopup: p.showPopup, popupCode: p.popupCode, imageUrl: p.imageUrl, priority: p.priority, isActive: p.isActive,
});

function status(p: AdminPromotion) {
  const now = Date.now();
  if (!p.isActive) return { label: "Вимкнено", cls: "bg-gray-200 text-gray-700" };
  if (new Date(p.startsAt).getTime() > now) return { label: "Заплановано", cls: "bg-blue-100 text-blue-800" };
  if (p.endsAt && new Date(p.endsAt).getTime() <= now) return { label: "Завершено", cls: "bg-gray-200 text-gray-700" };
  return { label: "Активна", cls: "bg-green-100 text-green-800" };
}

const valueLabel = (p: Pick<AdminPromotion, "kind" | "value">) =>
  p.kind === "PERCENT" ? `−${p.value}%` : p.kind === "AMOUNT_OFF" ? `−$${((p.value ?? 0) / 100).toFixed(2)}` : "—";

export default function PromotionsAdmin() {
  const qc = useQueryClient();
  const promos = useQuery({ queryKey: ["admin-promotions"], queryFn: listPromotions });
  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const products = useQuery({ queryKey: ["all-products"], queryFn: () => getProducts() });
  const fx = useQuery({ queryKey: ["fx-current"], queryFn: getCurrentFx, retry: false });

  const [editing, setEditing] = useState<{ id?: number; form: PromotionInput } | null>(null);
  const form = editing?.form;
  const set = (patch: Partial<PromotionInput>) => setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  const catSlug = categories.data?.find((c) => c.id === form?.categoryId)?.slug;
  const collections = useQuery({ queryKey: ["collections", catSlug], queryFn: () => getCollections(catSlug!), enabled: !!catSlug });
  const [productFilter, setProductFilter] = useState("");

  const save = useMutation({
    mutationFn: () => savePromotion(editing!.form, editing!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promotions"] }); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => deletePromotion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-promotions"] }),
  });

  // Live preview: what the discount does to the first targeted product's base price.
  const preview = useMemo(() => {
    if (!form || form.kind === "ANNOUNCEMENT" || !products.data) return null;
    const target = products.data.find((p) =>
      form.productIds.length ? form.productIds.includes(p.id)
      : form.collectionId ? p.collectionId === form.collectionId
      : form.categoryId ? p.categoryId === form.categoryId : true);
    if (!target) return null;
    const base = target.basePriceCents;
    const d = form.kind === "PERCENT" ? Math.round((base * Math.min(90, form.value ?? 0)) / 100) : Math.min(form.value ?? 0, base);
    const uah = (c: number) => (fx.data ? `${Math.round((c / 100) * fx.data.rate).toLocaleString("uk-UA")} ₴` : `$${(c / 100).toFixed(2)}`);
    return { name: target.name, before: uah(base), after: uah(base - d) };
  }, [form, products.data, fx.data]);

  return (
    <div>
      <br /><br /><br /><br />
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">Акції та пропозиції</h1>
        {!editing && <button className="px-4 py-2 rounded bg-black text-white" onClick={() => setEditing({ form: empty() })}>+ Нова акція</button>}
      </div>
      <p className="text-muted-foreground mb-6 max-w-3xl">
        Акції показуються у стрічці зверху сайту, як «акція тижня» та у спливаючому вікні. Знижка застосовується сервером до повної
        вартості конфігурації — одна акція на товар (вищий пріоритет, потім більша знижка). «Лише оголошення» нічого не змінює в цінах.
      </p>

      {editing && form && (
        <form className="rounded border p-5 mb-10 space-y-5 bg-white" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="text-xl font-semibold">{editing.id ? "Редагувати акцію" : "Нова акція"}</div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">Заголовок *
              <input className="border rounded px-3 py-2" value={form.title} maxLength={120} required onChange={(e) => set({ title: e.target.value })} placeholder="−15% на приховані двері" />
            </label>
            <label className="flex flex-col gap-1">Підзаголовок
              <input className="border rounded px-3 py-2" value={form.subtitle ?? ""} maxLength={240} onChange={(e) => set({ subtitle: e.target.value || null })} placeholder="До кінця листопада" />
            </label>
            <label className="flex flex-col gap-1">Тип
              <select className="border rounded px-3 py-2" value={form.kind} onChange={(e) => set({ kind: e.target.value as PromotionKind, value: e.target.value === "ANNOUNCEMENT" ? null : form.value ?? 10 })}>
                {(Object.keys(KIND_LABEL) as PromotionKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </label>
            {form.kind === "PERCENT" && (
              <label className="flex flex-col gap-1">Знижка, % (1–90)
                <input type="number" min={1} max={90} className="border rounded px-3 py-2" value={form.value ?? ""} onChange={(e) => set({ value: Number(e.target.value) })} />
              </label>
            )}
            {form.kind === "AMOUNT_OFF" && (
              <label className="flex flex-col gap-1">Знижка, USD (як і базові ціни)
                <input type="number" min={0.01} step={0.01} className="border rounded px-3 py-2" value={form.value != null ? form.value / 100 : ""} onChange={(e) => set({ value: Math.round(Number(e.target.value) * 100) })} />
              </label>
            )}
          </div>

          <fieldset className="rounded border p-4 space-y-3">
            <legend className="px-1 font-medium">На що діє</legend>
            <p className="text-sm text-muted-foreground">Без вибору — на весь каталог. Колекція точніша за категорію; окремі товари додаються до вибору.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">Категорія
                <select className="border rounded px-3 py-2" value={form.categoryId ?? ""} onChange={(e) => set({ categoryId: e.target.value ? Number(e.target.value) : null, collectionId: null })}>
                  <option value="">Усі категорії</option>
                  {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">Колекція
                <select className="border rounded px-3 py-2" value={form.collectionId ?? ""} disabled={!collections.data?.length} onChange={(e) => set({ collectionId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Уся категорія</option>
                  {collections.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span>Окремі товари ({form.productIds.length})</span>
                <input className="border rounded px-2 py-1 text-sm" placeholder="Пошук товару" value={productFilter} onChange={(e) => setProductFilter(e.target.value)} />
              </div>
              <div className="max-h-48 overflow-auto border rounded p-2 grid sm:grid-cols-2 gap-1 text-sm">
                {products.data
                  ?.filter((p) => !productFilter || p.name.toLowerCase().includes(productFilter.toLowerCase()) || form.productIds.includes(p.id))
                  .map((p) => (
                    <label key={p.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={form.productIds.includes(p.id)}
                        onChange={(e) => set({ productIds: e.target.checked ? [...form.productIds, p.id] : form.productIds.filter((x) => x !== p.id) })} />
                      {p.name.trim()}
                    </label>
                  ))}
              </div>
            </div>
          </fieldset>

          <div className="grid md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1">Початок
              <input type="datetime-local" className="border rounded px-3 py-2" value={toLocalInput(form.startsAt)} onChange={(e) => set({ startsAt: fromLocalInput(e.target.value) ?? new Date().toISOString() })} />
            </label>
            <label className="flex flex-col gap-1">Завершення (для таймера)
              <input type="datetime-local" className="border rounded px-3 py-2" value={toLocalInput(form.endsAt)} onChange={(e) => set({ endsAt: fromLocalInput(e.target.value) })} />
            </label>
            <label className="flex flex-col gap-1">Пріоритет
              <input type="number" className="border rounded px-3 py-2" value={form.priority} onChange={(e) => set({ priority: Number(e.target.value) || 0 })} />
            </label>
          </div>

          <fieldset className="rounded border p-4 space-y-2">
            <legend className="px-1 font-medium">Де показувати</legend>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.showInTicker} onChange={(e) => set({ showInTicker: e.target.checked })} /> Стрічка акцій угорі сайту</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isDealOfWeek} onChange={(e) => set({ isDealOfWeek: e.target.checked })} /> Акція тижня (блок з таймером на головній)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.showPopup} onChange={(e) => set({ showPopup: e.target.checked })} /> Спливаюче вікно</label>
            {form.showPopup && (
              <label className="flex flex-col gap-1 max-w-xs">Промокод у вікні (менеджер застосовує вручну)
                <input className="border rounded px-3 py-2 uppercase" value={form.popupCode ?? ""} maxLength={32} onChange={(e) => set({ popupCode: e.target.value || null })} placeholder="HAMMER10" />
              </label>
            )}
            <label className="flex flex-col gap-1">Зображення (URL, необов’язково)
              <input className="border rounded px-3 py-2" value={form.imageUrl ?? ""} onChange={(e) => set({ imageUrl: e.target.value || null })} placeholder="/uploads/…" />
            </label>
            <label className="flex items-center gap-2 pt-2"><input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} /> Увімкнено</label>
          </fieldset>

          {preview && (
            <div className="rounded bg-amber-50 border border-amber-200 p-3 text-sm">
              Приклад: «{preview.name.trim()}» — <s>{preview.before}</s> → <strong>{preview.after}</strong> (базова ціна, без опцій)
            </div>
          )}
          {save.error && <p className="text-red-600">{(save.error as Error).message}</p>}
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 rounded bg-black text-white disabled:opacity-50" disabled={save.isPending}>{save.isPending ? "Збереження…" : "Зберегти"}</button>
            <button type="button" className="px-4 py-2 rounded border" onClick={() => setEditing(null)}>Скасувати</button>
          </div>
        </form>
      )}

      {promos.isLoading && <p>Завантаження…</p>}
      {promos.error && <p className="text-red-600">Не вдалося завантажити акції</p>}
      {promos.data && (
        <div className="overflow-x-auto mb-12">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50 text-left">
              <tr><th className="p-2">Статус</th><th className="p-2">Акція</th><th className="p-2">Знижка</th><th className="p-2">На що</th><th className="p-2">Період</th><th className="p-2">Де</th><th className="p-2">Заявок</th><th className="p-2" /></tr>
            </thead>
            <tbody>
              {promos.data.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={8}>Акцій ще немає.</td></tr>}
              {promos.data.map((p) => {
                const st = status(p);
                return (
                  <tr key={p.id} className="border-t align-top">
                    <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span></td>
                    <td className="p-2"><div className="font-medium">{p.title}</div>{p.subtitle && <div className="text-muted-foreground">{p.subtitle}</div>}</td>
                    <td className="p-2 whitespace-nowrap">{valueLabel(p)}</td>
                    <td className="p-2">{[p.collection?.name ?? p.category?.name, p.products.length ? `${p.products.length} тов.` : null].filter(Boolean).join(" + ") || "Весь каталог"}</td>
                    <td className="p-2 whitespace-nowrap">{new Date(p.startsAt).toLocaleDateString("uk-UA")} — {p.endsAt ? new Date(p.endsAt).toLocaleDateString("uk-UA") : "∞"}</td>
                    <td className="p-2">{[p.showInTicker && "стрічка", p.isDealOfWeek && "акція тижня", p.showPopup && `вікно${p.popupCode ? ` (${p.popupCode})` : ""}`].filter(Boolean).join(", ") || "—"}</td>
                    <td className="p-2">{p._count?.quotes ?? 0}</td>
                    <td className="p-2 whitespace-nowrap">
                      <button className="underline mr-3" onClick={() => setEditing({ id: p.id, form: fromPromo(p) })}>Змінити</button>
                      <button className="underline text-red-600" onClick={() => { if (confirm(`Видалити акцію «${p.title}»? Це не можна скасувати.`)) remove.mutate(p.id); }}>Видалити</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FeaturedEditor products={products.data ?? []} />
    </div>
  );
}

/** Manual order for the "Найпопулярніші" rail. Empty slots are filled by most-requested products. */
function FeaturedEditor({ products }: { products: { id: number; name: string }[] }) {
  const qc = useQueryClient();
  const featured = useQuery({ queryKey: ["admin-featured"], queryFn: getFeaturedProducts });
  const [ids, setIds] = useState<number[] | null>(null);
  const list = ids ?? featured.data?.map((f) => f.id) ?? [];
  const [pick, setPick] = useState("");
  const save = useMutation({
    mutationFn: () => setFeaturedProducts(list),
    onSuccess: () => { setIds(null); qc.invalidateQueries({ queryKey: ["admin-featured"] }); },
  });
  const name = (id: number) => products.find((p) => p.id === id)?.name.trim() ?? featured.data?.find((f) => f.id === id)?.name ?? `#${id}`;
  const move = (i: number, d: -1 | 1) => { const n = [...list]; [n[i], n[i + d]] = [n[i + d], n[i]]; setIds(n); };
  return (
    <section className="rounded border p-5 max-w-2xl">
      <h2 className="text-xl font-semibold mb-1">Найпопулярніші (порядок на головній)</h2>
      <p className="text-sm text-muted-foreground mb-4">Обрані вручну йдуть першими. Решту місць заповнюють товари з найбільшою кількістю заявок за 30 днів.</p>
      <ol className="space-y-2 mb-4">
        {list.map((id, i) => (
          <li key={id} className="flex items-center gap-2 border rounded px-3 py-2">
            <span className="w-6 text-muted-foreground">{i + 1}</span>
            <span className="flex-1">{name(id)}</span>
            <button type="button" className="px-2 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Вище">↑</button>
            <button type="button" className="px-2 disabled:opacity-30" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="Нижче">↓</button>
            <button type="button" className="px-2 text-red-600" onClick={() => setIds(list.filter((x) => x !== id))} aria-label="Прибрати">✕</button>
          </li>
        ))}
        {!list.length && <li className="text-muted-foreground text-sm">Нічого не обрано — показуються найпопулярніші за заявками.</li>}
      </ol>
      <div className="flex gap-2 mb-4">
        <select className="border rounded px-3 py-2 flex-1" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Додати товар…</option>
          {products.filter((p) => !list.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name.trim()}</option>)}
        </select>
        <button type="button" className="px-4 py-2 rounded border" disabled={!pick} onClick={() => { setIds([...list, Number(pick)]); setPick(""); }}>Додати</button>
      </div>
      {save.error && <p className="text-red-600 mb-2">{(save.error as Error).message}</p>}
      <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-50" disabled={!ids || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Збереження…" : "Зберегти порядок"}
      </button>
    </section>
  );
}
