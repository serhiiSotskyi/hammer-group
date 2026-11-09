import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, Reveal, Magnetic, SplitChars } from "../lib/motion";
import { collections, topSales, dealOfWeek, uah, CONTACT } from "../lib/data";
import { TLink } from "../lib/nav";
import { useApi, usePromotions, productsUrl, img, customizerPath, type ApiProduct } from "../lib/api";
import { SmartImg } from "./Page";

/* ── Big marquee that skews + speeds up with scroll velocity ───────────── */
export function VelocityMarquee({ text, reverse = false }: { text: string; reverse?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = track.current!;
    let x = 0, boost = 0, raf = 0;
    const skewTo = gsap.quickTo(el, "skewX", { duration: 0.5, ease: "power3" });
    const st = ScrollTrigger.create({
      onUpdate: (s) => {
        const v = s.getVelocity();
        boost = gsap.utils.clamp(-14, 14, v / 120);
        skewTo(gsap.utils.clamp(-12, 12, v / -300));
      },
    });
    const loop = () => {
      const dir = reverse ? 1 : -1;
      x += dir * (0.6 + Math.abs(boost)) * (boost < 0 ? -1 : 1);
      boost *= 0.94;
      const w = el.scrollWidth / 2;
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      gsap.set(el, { x });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); st.kill(); };
  }, [reverse]);
  const chunk = Array.from({ length: 4 }, (_, i) => (
    <span key={i} className="vm-item">{text}<em> ✦ </em></span>
  ));
  return (
    <div className="vm"><div ref={track} className="vm-track">{chunk}{chunk}</div></div>
  );
}

/* ── Statement: words light up one by one as you scroll ───────────────── */
export function Statement() {
  const ref = useRef<HTMLElement>(null);
  const text = "Ми не продаємо двері з каталогу. Ми виробляємо їх під ваш отвір, вашу стіну і ваше світло — з 2017 року, на власному виробництві.";
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".st-w", { opacity: 0.12 }, {
        opacity: 1, stagger: 0.05, ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top 75%", end: "bottom 55%", scrub: true },
      });
      gsap.to(".st-swatch", {
        y: (i) => [-180, -60, -260][i], rotate: (i) => [25, -40, 60][i], ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true },
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={ref} className="statement">
      <span className="st-swatch st-swatch--a" /><span className="st-swatch st-swatch--b" /><span className="st-swatch st-swatch--c" />
      <p className="mono eyebrow">( Про нас )</p>
      <p className="st-text">
        {text.split(" ").map((w, i) => (
          <span key={i} className={`st-w ${["отвір,", "світло", "власному"].includes(w) ? "st-em" : ""}`}>{w} </span>
        ))}
      </p>
    </section>
  );
}

/* ── Collections: editorial list with a cursor-following image ─────────── */
export function Collections() {
  const ref = useRef<HTMLElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const el = preview.current!;
    const xTo = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3" });
    const rTo = gsap.quickTo(el, "rotate", { duration: 0.9, ease: "power3" });
    let lastX = 0;
    const move = (e: MouseEvent) => { xTo(e.clientX); yTo(e.clientY); rTo(gsap.utils.clamp(-14, 14, (e.clientX - lastX) * 0.6)); lastX = e.clientX; };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".col-row", { yPercent: 60, opacity: 0, stagger: 0.12, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".col-list", start: "top 80%" } });
      gsap.from(".col-line", { scaleX: 0, transformOrigin: "left", stagger: 0.12, duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: ".col-list", start: "top 80%" } });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={ref} id="collections" className="collections">
      <div className="sec-head">
        <p className="mono eyebrow">( 01 — Колекції )</p>
        <Reveal as="h2" className="sec-title">Оберіть, що <i className="serif">відчинити</i></Reveal>
      </div>
      <div className="col-list" onMouseLeave={() => setActive(null)}>
        {collections.map((c, i) => (
          <TLink key={c.n} to={c.to} className={`col-row ${active === i ? "is-active" : ""} ${active !== null && active !== i ? "is-dim" : ""}`} cursor="Відкрити">
            <span className="col-hover" onMouseEnter={() => setActive(i)} />
            <span className="col-line" />
            <span className="mono col-n">{c.n}</span>
            <span className="col-title"><SplitChars text={c.title} /></span>
            <span className="col-sub">{c.sub}</span>
            <span className="mono col-meta">{c.meta}</span>
            <img className="col-img-mobile" src={c.image} alt="" loading="lazy" />
          </TLink>
        ))}
      </div>
      <div ref={preview} className={`col-preview ${active !== null ? "is-on" : ""}`}>
        {collections.map((c, i) => (
          <img key={c.n} src={c.image} alt="" className={active === i ? "is-on" : ""} />
        ))}
      </div>
    </section>
  );
}

/* ── Top sales: pinned horizontal rail with giant rank numbers ────────── */
export function TopSales() {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  // Manual picks first, then most-requested in 30 days (GET /api/products/featured).
  // Falls back to the first catalogue products when that endpoint isn't deployed yet.
  const featured = useApi<ApiProduct[]>("/api/products/featured?limit=6");
  const con = useApi<ApiProduct[]>(featured.error ? productsUrl({ categorySlug: "concealed" }) : null);
  const mod = useApi<ApiProduct[]>(featured.error ? productsUrl({ categorySlug: "interior", collection: "modern" }) : null);
  const live = featured.data ?? [...(con.data ?? []).slice(0, 4), ...(mod.data ?? []).slice(0, 2)];
  const items = live.length ? live.map((p, i) => ({
    id: p.slug, rank: i + 1, name: p.name.trim(), collection: p.collection?.name ?? p.category?.name ?? "Приховані",
    image: img(p.imageUrl),
    price: Math.round((p.promoPriceCents ?? p.convertedPriceCents ?? 0) / 100),
    oldPrice: p.promoPriceCents != null ? Math.round((p.convertedPriceCents ?? 0) / 100) : 0,
    tag: p.promotion && p.promoPriceCents != null ? "−%" : undefined as undefined | string,
    to: customizerPath(p, p.category?.slug === "concealed" ? "concealed" : "interior"),
  })) : topSales.map((d) => ({ ...d, to: "/customizer" }));
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      const dist = () => track.current!.scrollWidth - window.innerWidth + 80;
      const tween = gsap.to(track.current, {
        x: () => -dist(), ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top top", end: () => "+=" + dist(), scrub: 1, pin: true, invalidateOnRefresh: true },
      });
      gsap.utils.toArray<HTMLElement>(".ts-card").forEach((card) => {
        gsap.fromTo(card.querySelector(".ts-img img"), { scale: 1.35, xPercent: -10 }, {
          scale: 1.05, xPercent: 10, ease: "none",
          scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
        });
        gsap.from(card.querySelector(".ts-rank"), {
          yPercent: 100, ease: "expo.out", duration: 1.2,
          scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 85%" },
        });
        gsap.fromTo(card.querySelector(".ts-strike"), { scaleX: 0 }, {
          scaleX: 1, duration: 0.6, ease: "power3.inOut",
          scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 60%" },
        });
      });
    });
    return () => mm.revert();
  }, [items.length]);
  return (
    <section ref={ref} id="top-sales" className="top-sales">
      <div className="ts-head">
        <p className="mono eyebrow">( 02 — Найпопулярніші )</p>
        <h2 className="sec-title">Найчастіше<br /><i className="serif">прораховують</i></h2>
        <p className="mono ts-hint">← Гортайте →</p>
      </div>
      <div ref={track} className="ts-track">
        {items.map((d) => {
          const off = d.oldPrice ? Math.round((1 - d.price / d.oldPrice) * 100) : 0;
          return (
            <TLink key={d.id} to={d.to} className="ts-card" cursor="Налаштувати">
              <div className="ts-rank-wrap"><span className="ts-rank">{String(d.rank).padStart(2, "0")}</span></div>
              <div className="ts-img">
                <SmartImg src={d.image} alt={d.name} />
                {d.tag && <span className={`sticker sticker--${d.tag === "ХІТ" ? "hit" : d.tag === "НОВИНКА" ? "new" : "sale"}`}>{d.tag === "−%" ? `−${off}%` : d.tag}</span>}
              </div>
              <div className="ts-info">
                <div>
                  <p className="mono ts-col">{d.collection}</p>
                  <h3>{d.name}</h3>
                </div>
                <div className="ts-price">
                  {d.oldPrice ? <span className="ts-old">{uah(d.oldPrice)}<i className="ts-strike" /></span> : <span className="ts-old mono">від</span>}
                  <span className="ts-new">{uah(d.price)}</span>
                </div>
              </div>
            </TLink>
          );
        })}
        <div className="ts-end">
          <Magnetic strength={0.5}><TLink className="circle-btn" to="/interior-doors" cursor="Усі">Усі<br />моделі →</TLink></Magnetic>
        </div>
      </div>
    </section>
  );
}

/* ── Deal of the week: split-flap countdown + door-reveal image ────────── */
function useCountdown(endsAt?: string | null) {
  const fallback = useRef((() => {
    const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); d.setHours(23, 59, 59, 0); return d.getTime();
  })());
  const target = endsAt ? new Date(endsAt).getTime() : fallback.current;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((target - now) / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function Flip({ value, label }: { value: number; label: string }) {
  const v = String(value).padStart(2, "0");
  return (
    <div className="flip">
      <div className="flip-digits">
        {[...v].map((c, i) => <span key={i + c} className="flip-d">{c}</span>)}
      </div>
      <span className="mono flip-l">{label}</span>
    </div>
  );
}

export function DealOfWeek() {
  const ref = useRef<HTMLElement>(null);
  const { promos, unavailable } = usePromotions();
  const live = promos?.dealOfWeek;
  // Real deal from admin; the demo deal is only used when the promotions API isn't deployed yet.
  const deal = live ? {
    name: live.title,
    sub: live.subtitle ?? (live.product ? `«${live.product.name.trim()}»` : ""),
    image: img(live.imageUrl ?? live.product?.imageUrl),
    price: live.product ? Math.round((live.product.promoPriceCents ?? live.product.convertedPriceCents ?? 0) / 100) : 0,
    oldPrice: live.product?.promoPriceCents != null ? Math.round((live.product.convertedPriceCents ?? 0) / 100) : 0,
    label: live.label,
    to: live.product ? customizerPath(live.product, live.product.category?.slug === "concealed" ? "concealed" : "interior") : "/contact",
  } : unavailable ? { ...dealOfWeek, label: "", to: "/contact" } : null;
  const t = useCountdown(live?.endsAt);
  const off = deal && deal.oldPrice ? Math.round((1 - deal.price / deal.oldPrice) * 100) : 0;
  const hasDeal = !!deal;
  useLayoutEffect(() => {
    if (!hasDeal || !ref.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: "top 65%" } });
      tl.fromTo(".deal-door-l", { xPercent: 0 }, { xPercent: -100, duration: 1.6, ease: "expo.inOut" })
        .fromTo(".deal-door-r", { xPercent: 0 }, { xPercent: 100, duration: 1.6, ease: "expo.inOut" }, "<")
        .from(".deal-img img", { scale: 1.4, duration: 2, ease: "expo.out" }, "<0.2")
        .from(".deal-off", { scale: 0, rotate: -90, duration: 1, ease: "back.out(2)" }, "-=1.2");
      gsap.to(".deal-off", { rotate: 360, repeat: -1, duration: 18, ease: "none" });
    }, ref);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [hasDeal]);
  if (!deal) return null; // no active "deal of the week" in admin → section hidden
  return (
    <section ref={ref} id="deal" className="deal">
      <div className="deal-img" data-cursor="Акція">
        <img src={deal?.image} alt={deal?.name} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/img/oak-warm.jpg"; }} />
        <span className="deal-door-l" /><span className="deal-door-r" />
        <div className="deal-off">
          <svg viewBox="0 0 200 200"><defs><path id="circ" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" /></defs>
            <text><textPath href="#circ">АКЦІЯ ТИЖНЯ ✦ ОБМЕЖЕНА КІЛЬКІСТЬ ✦ АКЦІЯ ТИЖНЯ ✦ </textPath></text></svg>
          <b>{off ? `−${off}%` : deal?.label || "✦"}</b>
        </div>
      </div>
      <div className="deal-body">
        <p className="mono eyebrow">( 03 — Акція тижня )</p>
        <Reveal as="h2" className="sec-title">{deal?.name}</Reveal>
        <p className="deal-sub">{deal?.sub}</p>
        {deal && deal.price > 0 && <div className="deal-price">{deal.oldPrice > 0 && <s>{uah(deal.oldPrice)}</s>}<strong>{uah(deal.price)}</strong></div>}
        <p className="mono deal-ends">Завершується через</p>
        <div className="flips"><Flip value={t.d} label="днів" /><Flip value={t.h} label="год" /><Flip value={t.m} label="хв" /><Flip value={t.s} label="сек" /></div>
        <Magnetic><TLink to={deal?.to ?? "/contact"} className="pill pill--signal">Забронювати ціну <span>→</span></TLink></Magnetic>
      </div>
    </section>
  );
}

/* ── Stats: counters + floating hardware chips ───────────────────────── */
export function Stats() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".stat-n").forEach((el) => {
        const end = Number(el.dataset.to);
        const o = { v: Number(el.dataset.from ?? 0) };
        gsap.to(o, {
          v: end, duration: 2.2, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
          onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString("uk-UA") + (el.dataset.suffix ?? ""); },
        });
      });
      gsap.to(".chip", {
        y: (i) => [-120, 80, -200, 140, -60][i], x: (i) => [40, -60, 20, -30, 70][i], rotate: (i) => [30, -45, 90, -20, 50][i], ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true },
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  const stats = [
    { from: 1990, to: 2017, label: "рік заснування", suffix: "" },
    { from: 0, to: 5000, label: "виконаних проєктів", suffix: "+" },
    { from: 0, to: 2700, label: "мм — максимальна висота полотна", suffix: "" },
    { from: 0, to: 100, label: "відсотків — власне виробництво", suffix: "%" },
  ];
  return (
    <section ref={ref} className="stats">
      {["chip--oak", "chip--metal", "chip--walnut", "chip--bone", "chip--metal"].map((c, i) => <span key={i} className={`chip ${c} chip-${i}`} />)}
      {stats.map((s) => (
        <div key={s.label} className="stat">
          <span className="stat-n" data-from={s.from} data-to={s.to} data-suffix={s.suffix}>{s.from}</span>
          <span className="mono stat-l">{s.label}</span>
        </div>
      ))}
    </section>
  );
}

/* ── Craft: image expands from a doorway-shaped clip ───────────────────── */
export function Craft() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".craft-media", { clipPath: "inset(18% 36% 18% 36% round 200px 200px 0 0)" }, {
        clipPath: "inset(0% 0% 0% 0% round 0px 0px 0 0)", ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top top", end: "+=120%", scrub: true, pin: true },
      });
      gsap.fromTo(".craft-media img", { scale: 1.4 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ref.current, start: "top top", end: "+=120%", scrub: true } });
      gsap.fromTo(".craft-copy", { opacity: 0, y: 60 }, { opacity: 1, y: 0, ease: "none", scrollTrigger: { trigger: ref.current, start: "top top+=-400", end: "+=60%", scrub: true } });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={ref} id="craft" className="craft">
      <div className="craft-media"><img src="/img/factory.jpg" alt="Виробництво Hammer Group" loading="lazy" /></div>
      <div className="craft-copy">
        <p className="mono eyebrow">( 04 — Виробництво )</p>
        <h2 className="sec-title">Від креслення<br />до <i className="serif">монтажу</i></h2>
        <p>Повний цикл в одному цеху: розкрій, шпонування, фарбування, складання та встановлення. Стабільні строки, точні розміри.</p>
      </div>
    </section>
  );
}

/* ── Final CTA + footer (global, on every page) ───────────────────────── */
export function Contact({ showCta = true }: { showCta?: boolean }) {
  return (
    <section id="contact" className="contact">
      {showCta && (
        <>
          <VelocityMarquee text="Відчиніть нові можливості" reverse />
          <div className="contact-body">
            <p className="mono eyebrow">( Наступний крок )</p>
            <Reveal as="h2" className="contact-title">Розрахуємо ваш<br /><i className="serif">проєкт за 24 години</i></Reveal>
            <Magnetic strength={0.45}>
              <TLink to="/contact" className="circle-btn circle-btn--xl" cursor="Вперед">Почати<br />прорахунок</TLink>
            </Magnetic>
          </div>
        </>
      )}
      <div className="footer-grid">
        <div>
          <p className="mono eyebrow">Шоурум</p>
          <p>{CONTACT.city}<br />{CONTACT.street}<br /><span className="muted">За попереднім записом</span></p>
        </div>
        <div>
          <p className="mono eyebrow">Зв’язок</p>
          <p><a className="u-link" href={`tel:${CONTACT.tel}`}>{CONTACT.phone}</a><br /><a className="u-link" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></p>
        </div>
        <div>
          <p className="mono eyebrow">Каталог</p>
          <p className="footer-links">
            <TLink to="/interior-doors" className="u-link">Міжкімнатні двері</TLink>
            <TLink to="/concealed-doors" className="u-link">Приховані двері</TLink>
            <TLink to="/cabinet-furniture" className="u-link">Корпусні меблі</TLink>
            <TLink to="/customizer" className="u-link">Конфігуратор</TLink>
          </p>
        </div>
        <div>
          <p className="mono eyebrow">Соцмережі</p>
          <p><a className="u-link" href={CONTACT.instagram} target="_blank" rel="noreferrer">Instagram ↗</a></p>
        </div>
      </div>
      <div className="footer-mark" aria-hidden>HAMMER GROUP</div>
      <footer className="footer">
        <span className="mono">© {new Date().getFullYear()} Hammer Group</span>
        <span className="mono">Двері та меблі власного виробництва</span>
        <span className="mono">Лабораторія редизайну — локальний прототип</span>
      </footer>
    </section>
  );
}
