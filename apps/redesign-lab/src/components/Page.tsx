import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { gsap, SplitChars, Magnetic } from "../lib/motion";
import { useDoor, TLink, PAGE_NAMES } from "../lib/nav";
import { uah, type Product } from "../lib/data";

/* ── Inner-page hero: split title, lead, door-shaped image reveal ───────── */
export function PageHero({ index, crumbs, title, accent, lead, image, children, tall = false }: {
  index: string; crumbs: string[]; title: string; accent?: string; lead: string; image: string; children?: ReactNode; tall?: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const { ready } = useDoor();
  useLayoutEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ delay: 0.35, defaults: { ease: "expo.out" } })
        .from(".ph-title .ch", { yPercent: 120, rotate: 8, duration: 1.3, stagger: 0.025 })
        .from(".ph-accent", { yPercent: 110, duration: 1.3 }, 0.25)
        .from(".ph-top > *, .ph-row > *", { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.4)
        .fromTo(".ph-media", { clipPath: "inset(40% 42% 0% 42% round 300px 300px 0 0)" }, { clipPath: "inset(0% 0% 0% 0% round 0px 0px 0 0)", duration: 1.8, ease: "expo.inOut" }, 0.2)
        .from(".ph-media img", { scale: 1.5, duration: 2.2 }, 0.2);
      gsap.to(".ph-media img", { yPercent: 14, ease: "none", scrollTrigger: { trigger: ".ph-media", start: "top bottom", end: "bottom top", scrub: true } });
    }, root);
    return () => ctx.revert();
  }, [ready]);
  return (
    <section ref={root} className={`ph ${tall ? "ph--tall" : ""}`}>
      <div className="ph-top">
        <p className="mono crumbs">{crumbs.map((c, i) => <span key={i}>{c}</span>)}</p>
        <p className="mono ph-index">( {index} )</p>
      </div>
      <h1 className="ph-title" style={{ fontSize: `min(11.5vw, ${(86 / (Math.max(...title.split(" ").map((w) => w.length)) * 0.82)).toFixed(2)}vw)` }}>
        <SplitChars text={title} />
        {accent && <span className="ph-accent-wrap"><span className="ph-accent serif">{accent}</span></span>}
      </h1>
      <div className="ph-row">
        <p className="ph-lead">{lead}</p>
        {children && <div className="ph-cta">{children}</div>}
      </div>
      <div className="ph-media"><img src={image} alt="" /></div>
    </section>
  );
}

/* ── Image that shows door cut-outs whole (contain) and room photos full-bleed (cover) ── */
export function SmartImg({ src, alt }: { src: string; alt: string }) {
  const [cut, setCut] = useState(false);
  return (
    <img src={src} alt={alt} loading="lazy" className={cut ? "is-cutout" : ""}
      onLoad={(e) => { const i = e.currentTarget; setCut(i.naturalHeight > i.naturalWidth * 1.6); }} />
  );
}

/* ── Product card with 3D tilt + glare ───────────────────────────────── */
export function ProductCard({ p, to, i = 0 }: { p: Product; to: string; i?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const rx = gsap.quickTo(el, "rotateX", { duration: 0.6, ease: "power3" });
    const ry = gsap.quickTo(el, "rotateY", { duration: 0.6, ease: "power3" });
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      ry((x - 0.5) * 12); rx((0.5 - y) * 10);
      el.style.setProperty("--gx", `${x * 100}%`); el.style.setProperty("--gy", `${y * 100}%`);
    };
    const leave = () => { rx(0); ry(0); };
    el.addEventListener("mousemove", move); el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave); };
  }, []);
  const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return (
    <motion.div layout initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.9, ease: [0.16, 1, 0.3, 1] } }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }} className="pc-wrap">
      <TLink to={to} cursor="Налаштувати" className="pc-link">
        <div ref={ref} className="pc">
          <div className="pc-img">
            <SmartImg src={p.image} alt={p.name} />
            <span className="pc-glare" />
            {p.tag && <span className={`sticker sticker--${p.tag === "ХІТ" ? "hit" : p.tag === "НОВИНКА" ? "new" : "sale"}`}>{p.tag === "−%" ? `−${off}%` : p.tag}</span>}
            <span className="pc-cta mono">Налаштувати →</span>
          </div>
          <div className="pc-info">
            <div>
              <p className="mono pc-finish">{p.finish}</p>
              <h3>{p.name}</h3>
              <p className="pc-note">{p.note}</p>
            </div>
            <div className="pc-price">
              {p.oldPrice && <s>{uah(p.oldPrice)}</s>}
              <span className="mono pc-from">від</span>
              <strong>{uah(p.price)}</strong>
            </div>
          </div>
        </div>
      </TLink>
    </motion.div>
  );
}

/* ── Filterable product grid with a sliding pill + "show more" ─────────── */
export function ProductGrid({ filters, by, products, to, loading, error, pageSize = 9 }: {
  filters?: string[]; by?: (p: Product) => string; products: Product[]; to: (p: Product) => string;
  loading?: boolean; error?: string; pageSize?: number;
}) {
  const [f, setF] = useState(filters?.[0] ?? "");
  const [n, setN] = useState(pageSize);
  const list = products.filter((p) => !filters || f === filters[0] || (by ? by(p) : p.finish) === f);
  const shown = list.slice(0, n);
  return (
    <section className="pg">
      <div className="pg-bar">
        {filters && filters.length > 1 ? (
          <div className="chips">
            {filters.map((x) => (
              <button key={x} className={`chip-btn ${f === x ? "is-on" : ""}`} onClick={() => { setF(x); setN(pageSize); }}>
                {f === x && <motion.span layoutId="chip-pill" className="chip-pill" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <span>{x}</span>
              </button>
            ))}
          </div>
        ) : <span />}
        <p className="mono pg-count"><AnimatePresence mode="popLayout"><motion.span key={list.length} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}>{String(list.length).padStart(2, "0")}</motion.span></AnimatePresence> моделей</p>
      </div>
      {error && <p className="pg-error">Не вдалося завантажити каталог: {error}</p>}
      <motion.div layout className="pg-grid">
        {loading && Array.from({ length: 6 }, (_, i) => <div key={i} className="pc-skel" style={{ animationDelay: `${i * 0.1}s` }} />)}
        <AnimatePresence mode="popLayout">
          {shown.map((p, i) => <ProductCard key={p.slug} p={p} i={i % pageSize} to={to(p)} />)}
        </AnimatePresence>
      </motion.div>
      {list.length > n && (
        <div className="pg-more">
          <Magnetic strength={0.4}>
            <button className="circle-btn" onClick={() => setN(n + pageSize)} data-cursor="Ще">Показати<br />ще {Math.min(pageSize, list.length - n)}</button>
          </Magnetic>
        </div>
      )}
    </section>
  );
}

/* ── Sticky stacking cards (each card scales back as the next arrives) ─── */
export function StackCards({ items, eyebrow, title }: { items: { n: string; title: string; text: string; image?: string }[]; eyebrow: string; title: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".sc-card");
      cards.forEach((c, i) => {
        if (i === cards.length - 1) return;
        gsap.to(c, {
          scale: 0.9 - (cards.length - i) * 0.015, opacity: 0.35, rotateX: 8, ease: "none",
          scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: "top 20%", scrub: true },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={ref} className="sc">
      <div className="sc-head">
        <p className="mono eyebrow">{eyebrow}</p>
        <h2 className="sec-title">{title}</h2>
      </div>
      <div className="sc-list">
        {items.map((it, i) => (
          <article key={it.n} className="sc-card" style={{ top: `calc(110px + ${i * 22}px)` }}>
            <span className="sc-n">{it.n}</span>
            <div className="sc-body"><h3>{it.title}</h3><p>{it.text}</p></div>
            {it.image && <div className="sc-img"><img src={it.image} alt="" loading="lazy" /></div>}
          </article>
        ))}
      </div>
    </section>
  );
}

/* ── Next-page teaser: big link with image that grows on hover ──────────── */
export function NextPage({ to, image }: { to: string; image: string }) {
  return (
    <TLink to={to} className="next" cursor="Далі">
      <p className="mono eyebrow">( Далі )</p>
      <div className="next-row">
        <span className="next-title">{PAGE_NAMES[to]}</span>
        <span className="next-img"><img src={image} alt="" loading="lazy" /></span>
        <span className="next-arrow">→</span>
      </div>
    </TLink>
  );
}

export { Magnetic };
