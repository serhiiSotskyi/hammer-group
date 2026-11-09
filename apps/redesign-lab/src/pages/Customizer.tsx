import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { gsap, SplitChars } from "../lib/motion";
import { uah } from "../lib/data";
import { TLink } from "../lib/nav";
import {
  useApi, productsUrl, img, fetchPrice, tGroup, tCtrl, tOpt,
  type ApiProduct, type Schema, type Ctrl, type Price,
} from "../lib/api";

const ease = [0.16, 1, 0.3, 1] as const;
const METAL: Record<string, string> = { black: "#151413", chrome: "#d6d3ce", silver: "#cfcfcf", gold: "#c9a24a", bronze: "#b07a45" };

/** Animated price that rolls to its new value. */
function PriceRoll({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const cur = useRef(value);
  useEffect(() => {
    const o = { v: cur.current };
    const t = gsap.to(o, { v: value, duration: 0.9, ease: "expo.out", onUpdate: () => { cur.current = o.v; if (ref.current) ref.current.textContent = uah(Math.round(o.v)); } });
    gsap.fromTo(ref.current, { scale: 1.06, color: "#d7ff3c" }, { scale: 1, color: "#efe9df", duration: 0.8 });
    return () => { t.kill(); };
  }, [value]);
  return <span ref={ref}>{uah(value)}</span>;
}

const isNumericSelect = (c: Ctrl) => c.type === "select" && (c.options?.length ?? 0) > 8 && c.options!.every((o) => /^\d+$/.test(o.id));
const initial = (c: Ctrl): unknown => {
  if (c.type === "boolean") return Boolean(c.defaultValue);
  if (c.type === "range") return Number(c.defaultValue ?? c.min ?? 0);
  const ids = (c.options ?? []).map((o) => o.id);
  const d = c.defaultValue != null ? String(c.defaultValue) : ids[0];
  return ids.includes(d) ? d : ids[0];
};
const valueLabel = (c: Ctrl, v: unknown) =>
  c.type === "boolean" ? (v ? "Так" : "Ні")
  : c.type === "range" || isNumericSelect(c) ? `${v} ${c.unit ?? "мм"}`
  : tOpt(c.id, String(v), c.options?.find((o) => o.id === v)?.label);

/** One control rendered in the prototype's style. */
function Control({ c, value, set }: { c: Ctrl; value: unknown; set: (v: unknown) => void }) {
  if (c.type === "boolean") {
    return (
      <button className={`cz-toggle ${value ? "is-on" : ""}`} onClick={() => set(!value)}>
        <span className="cz-switch"><i /></span><span>{tCtrl(c.id, c.label)}</span>
      </button>
    );
  }
  if (c.type === "range" || isNumericSelect(c)) {
    const opts = c.options ?? [];
    const numeric = c.type === "range";
    const idx = numeric ? 0 : Math.max(0, opts.findIndex((o) => o.id === value));
    return (
      <label className="cz-slider">
        <span className="mono">{tCtrl(c.id, c.label)}</span>
        <input type="range"
          min={numeric ? c.min : 0} max={numeric ? c.max : opts.length - 1} step={numeric ? c.step ?? 10 : 1}
          value={numeric ? Number(value) : idx}
          onChange={(e) => set(numeric ? Number(e.target.value) : opts[Number(e.target.value)].id)} />
        <b>{String(value)}</b>
      </label>
    );
  }
  const opts = c.options ?? [];
  return (
    <div className="cz-ctrl">
      <p className="mono cz-ctrl-l">{tCtrl(c.id, c.label)}</p>
      <div className="cz-opts-row">
        {opts.map((o) => (
          <button key={o.id} className={`cz-opt ${value === o.id ? "is-on" : ""}`} onClick={() => set(o.id)} disabled={opts.length === 1}>
            {METAL[o.id.replace(/^(mech|mag)/, "").toLowerCase()] && <span className="cz-sw" style={{ background: METAL[o.id.replace(/^(mech|mag)/, "").toLowerCase()] }} />}
            <span>{tOpt(c.id, o.id, o.label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CustomizerPage({ kind }: { kind: "interior" | "concealed" }) {
  const [params] = useSearchParams();
  const cat = kind === "concealed" ? "concealed" : "interior";
  const list = useApi<ApiProduct[]>(productsUrl({ categorySlug: cat }));
  const slug = params.get("slug") ?? list.data?.find((p) => kind === "concealed" || p.collection?.slug === "modern")?.slug ?? null;
  const product = list.data?.find((p) => p.slug === slug);
  const schemaRes = useApi<{ schema: Schema }>(slug ? `/api/categories/${cat}/schema?productSlug=${encodeURIComponent(slug)}` : null);
  const schema = schemaRes.data?.schema;
  const controls = useMemo(() => schema?.groups.flatMap((g) => g.controls) ?? [], [schema]);

  const [sel, setSel] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState<Price | null>(null);
  const [priceErr, setPriceErr] = useState("");
  const [quote, setQuote] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (controls.length) setSel(Object.fromEntries(controls.map((c) => [c.id, initial(c)]))); }, [controls]);

  // Live price from the real pricing engine (POST /api/price — calculation only, nothing is saved).
  useEffect(() => {
    if (!slug || !Object.keys(sel).length) return;
    const t = setTimeout(() => {
      fetchPrice(slug, sel).then((p) => { setPrice(p); setPriceErr(""); }).catch((e) => setPriceErr(String(e.message)));
    }, 220);
    return () => clearTimeout(t);
  }, [slug, sel]);

  const set = (id: string, v: unknown) => { setSel((s) => ({ ...s, [id]: v })); if (id === "opening") setOpen(true); };

  // Map real selections onto the visual preview.
  const h = Number(sel.heightMm ?? 2100), w = Number(sel.widthMm ?? 800);
  const opening = String(sel.opening ?? "left");
  const right = /right/i.test(opening);
  const inside = /inside|^in-/i.test(opening);
  const lockId = String(sel.lockType ?? (sel.magneticLock ? "magBlack" : "mechBlack"));
  const handle = /chrome/i.test(lockId) ? METAL.chrome : METAL.black;
  const magnetic = /^mag/.test(lockId) || sel.magneticLock === true;
  const edge = METAL[String(sel.edgeColor)] ?? "transparent";
  const hiddenHinges = sel.hingeType === "hidden" || kind === "concealed";
  const glass = /склом|glass/i.test(product?.name ?? "");
  const angle = (right ? 1 : -1) * (inside ? -72 : 72);
  const lines = (price?.breakdown ?? []).filter((b) => b.deltaCents !== 0);
  const total = price ? Math.round(price.totalPriceCents / 100) : product ? Math.round((product.convertedPriceCents ?? 0) / 100) : 0;

  const loading = list.loading || schemaRes.loading;
  const failed = list.error || schemaRes.error;

  return (
    <section className="cz">
      <div className="cz-stage" style={{ ["--wall" as any]: kind === "concealed" ? "#e9e4dc" : "#d9d2c6" }}>
        <div className="cz-head">
          <p className="mono crumbs"><span>Конфігуратор</span><span>{kind === "concealed" ? "Приховані" : product?.collection?.name ?? "Міжкімнатні"}</span></p>
          <h1 className="cz-title" key={product?.name}><SplitChars text={product?.name.trim() ?? "Завантаження…"} /></h1>
        </div>
        <div className="cz-room">
          <div className="cz-wall" />
          <div className="cz-floor" />
          <div className="cz-door" style={{ height: `${62 * (h / 2700)}vh`, width: `${16 * (w / 900)}vw` }}>
            {kind === "interior" && <span className={`cz-casing ${sel.casingFront === "telescopic" ? "is-profile" : ""}`} />}
            <span className="cz-light" style={{ opacity: open ? 1 : 0.15 }} />
            <div className="cz-leaf" style={{
              background: kind === "concealed" ? "#ebe6de" : "#f1ede6",
              transform: open ? `rotateY(${angle}deg)` : "none",
              transformOrigin: right ? "right center" : "left center",
              boxShadow: edge !== "transparent" ? `inset 0 0 0 3px ${edge}, 0 20px 40px rgba(0,0,0,.25)` : undefined,
            }}>
              {product && kind === "interior" && <img className="cz-leaf-photo" src={img(product.imageUrl)} alt="" />}
              {glass && <span className="cz-glass cz-glass--full" />}
              <span className="cz-handle" style={{ background: handle, [right ? "left" : "right"]: "9%" } as any} />
              {magnetic && <span className="cz-smart" style={{ [right ? "left" : "right"]: "9%" } as any} />}
              {!hiddenHinges && [18, 50, 82].map((t) => <span key={t} className="cz-hinge" style={{ top: `${t}%`, [right ? "right" : "left"]: "-3px" } as any} />)}
            </div>
            <span className="cz-dim cz-dim--h mono"><i />{h} мм<i /></span>
            <span className="cz-dim cz-dim--w mono"><i />{w} мм<i /></span>
          </div>
        </div>
        <div className="cz-stage-bar">
          <button className="pill pill--light" onClick={() => setOpen(!open)}>{open ? "Зачинити" : "Відчинити"} двері</button>
          <span className="mono">Ціни — з живого прорахунку Hammer Group</span>
        </div>
      </div>

      <aside className="cz-panel">
        {product && (
          <div className="cz-product">
            <img src={img(product.imageUrl)} alt={product.name} />
            <div>
              <p className="mono">{product.collection?.name ?? (kind === "concealed" ? "Приховані двері" : "Міжкімнатні")}</p>
              <h3>{product.name.trim()}</h3>
              <TLink to={kind === "concealed" ? "/concealed-doors" : `/interior-doors/${product.collection?.slug ?? "modern"}`} className="u-link mono">Інша модель →</TLink>
            </div>
          </div>
        )}
        {loading && <div className="cz-loading"><span /><span /><span /></div>}
        {failed && <p className="pg-error">Не вдалося завантажити конфігуратор: {failed}</p>}
        <div className="cz-steps">
          {schema?.groups.map((g, gi) => {
            const editable = g.controls.filter((c) => c.type === "boolean" || c.type === "range" || (c.options?.length ?? 0) > 1);
            if (!editable.length) return null;
            return (
              <div key={g.id} className={`cz-group ${step === gi ? "is-open" : ""}`}>
                <button className="cz-group-head" onClick={() => setStep(step === gi ? -1 : gi)}>
                  <span className="mono">{String(gi + 1).padStart(2, "0")}</span>
                  <span className="cz-group-title">{tGroup(g.id, g.label)}</span>
                  <span className="cz-group-val">{editable.slice(0, 2).map((c) => valueLabel(c, sel[c.id])).join(" · ")}</span>
                </button>
                <AnimatePresence initial={false}>
                  {step === gi && (
                    <motion.div className="cz-opts" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1, transition: { duration: 0.6, ease } }} exit={{ height: 0, opacity: 0, transition: { duration: 0.35 } }}>
                      <div className="cz-opts-inner cz-ctrls">
                        {editable.map((c) => <Control key={c.id} c={c} value={sel[c.id]} set={(v) => set(c.id, v)} />)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="cz-sum">
          <ul>
            {price && <li><span>Полотно «{product?.name.trim()}»</span><span className="mono">{uah(Math.round(price.basePriceCents / 100))}</span></li>}
            <AnimatePresence initial={false}>
              {lines.map((l) => {
                const c = controls.find((x) => x.id === l.controlId);
                return (
                  <motion.li key={l.controlId} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <span>{l.controlId === "promotion" ? `Акція: ${l.controlLabel}` : `${tCtrl(l.controlId, l.controlLabel)}${c ? `: ${valueLabel(c, sel[c.id])}` : ""}`}</span>
                    <span className={`mono ${l.deltaCents < 0 ? "cz-minus" : ""}`}>{l.deltaCents < 0 ? "−" : "+"}{uah(Math.abs(Math.round(l.deltaCents / 100)))}</span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          {priceErr && <p className="pg-error">Прорахунок недоступний: {priceErr}</p>}
          <div className="cz-total">
            <span className="mono">Разом{price?.totalBeforeDiscountCents && price.totalBeforeDiscountCents !== price.totalPriceCents ? <s className="cz-was">{uah(Math.round(price.totalBeforeDiscountCents / 100))}</s> : null}</span>
            <strong><PriceRoll value={total} /></strong>
          </div>
          <button className="pill pill--signal cz-go" onClick={() => setQuote(true)} disabled={!price}>Отримати кошторис <span>→</span></button>
        </div>
      </aside>

      <AnimatePresence>
        {quote && (
          <motion.div className="promo-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { delay: 0.3 } }} onClick={() => setQuote(false)}>
            <motion.div className="promo promo--quote" onClick={(e) => e.stopPropagation()}
              initial={{ rotateY: -95, opacity: 0 }} animate={{ rotateY: 0, opacity: 1, transition: { duration: 1.1, ease } }}
              exit={{ rotateY: -95, opacity: 0, transition: { duration: 0.6 } }} style={{ transformOrigin: "left center", transformPerspective: 1400 }}>
              <div className="promo-body">
                <button className="promo-x" onClick={() => setQuote(false)} aria-label="Закрити">✕</button>
                <p className="mono eyebrow">( Кошторис )</p>
                <h3>{product?.name.trim()}<br /><i className="serif">{uah(total)}</i></h3>
                {!sent ? (
                  <form className="promo-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                    <p>{w}×{h} мм · {valueLabel(controls.find((c) => c.id === "opening") ?? { id: "opening", type: "select" }, opening)}. Менеджер перевірить конфігурацію та зв’яжеться з вами.</p>
                    <input placeholder="Ім’я" required />
                    <input type="tel" placeholder="+380 __ ___ __ __" required />
                    <button className="pill pill--signal" type="submit">Надіслати →</button>
                  </form>
                ) : (
                  <div className="promo-ok"><p>Дякуємо! (прототип — запит не надсилається на сервер)</p></div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
