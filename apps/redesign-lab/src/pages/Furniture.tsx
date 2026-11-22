import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PageHero, NextPage } from "../components/Page";
import { VelocityMarquee } from "../components/Sections";
import { gsap, Reveal } from "../lib/motion";
import { useApi, img, type ApiPortfolio } from "../lib/api";
import { QuoteForm } from "./Contact";

const services = [
  { n: "01", title: "Шафи та гардеробні", text: "Вбудовані шафи, системи зберігання, гардеробні та меблі для ніш під точні розміри.", image: "/img/wardrobe.jpg" },
  { n: "02", title: "Меблі для житла", text: "Кухні, передпокої, спальні, вітальні та робочі зони у квартирі чи будинку.", image: "/img/kitchen.jpg" },
  { n: "03", title: "Комерційні проєкти", text: "Офіси, салони, магазини й заклади — з погодженням матеріалів і фурнітури.", image: "/img/white-living.jpg" },
];

/** Hover a service column: it widens and its photo rises from below. */
function Services() {
  const [a, setA] = useState(0);
  return (
    <section className="svc">
      <div className="sec-head">
        <p className="mono eyebrow">( Напрями )</p>
        <Reveal as="h2" className="sec-title">Меблі, що <i className="serif">вбудовані</i> в життя</Reveal>
      </div>
      <div className="svc-row">
        {services.map((s, i) => (
          <article key={s.n} className={`svc-col ${a === i ? "is-on" : ""}`} onMouseEnter={() => setA(i)} onClick={() => setA(i)} data-cursor="Більше">
            <img src={s.image} alt="" loading="lazy" />
            <span className="svc-shade" />
            <span className="mono svc-n">{s.n}</span>
            <div className="svc-body"><h3>{s.title}</h3><p>{s.text}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Portfolio: filter + staggered grid with inner parallax, lightbox gallery. */
function Portfolio() {
  const ref = useRef<HTMLElement>(null);
  const [f, setF] = useState("Усі");
  const [box, setBox] = useState<{ i: number; img: number } | null>(null);
  const res = useApi<ApiPortfolio[]>("/api/furniture/portfolio");
  const portfolio = (res.data ?? []).map((p) => ({
    id: p.id, name: p.name, type: p.projectType === "DOORS" ? "Двері" : "Меблі",
    image: img(p.coverUrl), album: [p.coverUrl, ...(p.albumUrls ?? [])].map(img),
  }));
  const list = portfolio.filter((p) => f === "Усі" || p.type === f);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".pf-item img").forEach((img) => {
        gsap.fromTo(img, { yPercent: -10 }, { yPercent: 10, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      });
    }, ref);
    return () => ctx.revert();
  }, [f, res.data]);
  useEffect(() => {
    if (!box) return;
    const key = (e: KeyboardEvent) => {
      const al = list[box.i].album;
      if (e.key === "Escape") setBox(null);
      if (e.key === "ArrowRight") setBox({ ...box, img: (box.img + 1) % al.length });
      if (e.key === "ArrowLeft") setBox({ ...box, img: (box.img - 1 + al.length) % al.length });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [box, list]);
  const cur = box ? list[box.i] : null;
  return (
    <section ref={ref} className="pf">
      <div className="pf-head">
        <div>
          <p className="mono eyebrow">( Портфоліо )</p>
          <h2 className="sec-title">Реалізовані<br /><i className="serif">проєкти</i></h2>
        </div>
        <div className="chips">
          {["Усі", "Меблі", "Двері"].map((x) => (
            <button key={x} className={`chip-btn ${f === x ? "is-on" : ""}`} onClick={() => setF(x)}>
              {f === x && <motion.span layoutId="pf-pill" className="chip-pill" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <span>{x}</span>
            </button>
          ))}
        </div>
      </div>
      {res.loading && <div className="pf-grid"><div className="pc-skel pf-item pf-item--0" /></div>}
      {res.error && <p className="pg-error">Не вдалося завантажити портфоліо: {res.error}</p>}
      {!res.loading && !list.length && !res.error && <p className="muted">У цій категорії ще немає проєктів.</p>}
      <motion.div layout className={`pf-grid ${list.length < 3 ? "pf-grid--few" : ""}`}>
        <AnimatePresence mode="popLayout">
          {list.map((p, i) => (
            <motion.button layout key={p.id} className={`pf-item pf-item--${i % 5}`} onClick={() => setBox({ i, img: 0 })} data-cursor="Дивитись"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] } }} exit={{ opacity: 0, scale: 0.9 }}>
              <img src={p.image} alt={p.name} loading="lazy" />
              <span className="pf-cap"><span className="mono">{p.type}</span>{p.name}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {cur && box && (
          <motion.div className="lb" initial={{ clipPath: "inset(50% 0 50% 0)" }} animate={{ clipPath: "inset(0% 0 0% 0)", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }} exit={{ clipPath: "inset(50% 0 50% 0)", transition: { duration: 0.5 } }}>
            <AnimatePresence mode="wait">
              <motion.img key={cur.album[box.img]} src={cur.album[box.img]} alt={cur.name} className="lb-img"
                drag="x" dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 80) setBox({ ...box, img: (box.img + (info.offset.x < 0 ? 1 : -1) + cur.album.length) % cur.album.length }); }}
                initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.6 }} />
            </AnimatePresence>
            <div className="lb-bar">
              <div><p className="mono">{cur.type}</p><h3>{cur.name}</h3></div>
              <p className="mono">{box.img + 1} / {cur.album.length} · тягніть або ← →</p>
              <button className="pill pill--light" onClick={() => setBox(null)}>Закрити ✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function FurniturePage() {
  return (
    <>
      <PageHero index="03" crumbs={["Головна", "Корпусні меблі"]} title="Корпусні" accent="меблі під розмір"
        lead="Проєктуємо й виготовляємо меблі для житла та комерції. Індивідуальні розміри, підбір матеріалів і фурнітури, замір і прорахунок."
        image="/img/kitchen.jpg" />
      <Services />
      <VelocityMarquee text="Кухні · Шафи · Гардеробні · Передпокої · Офіси" />
      <Portfolio />
      <section className="form-band">
        <div>
          <p className="mono eyebrow">( Запит )</p>
          <Reveal as="h2" className="sec-title">Розкажіть про <i className="serif">ваш простір</i></Reveal>
        </div>
        <QuoteForm topic="Меблі" />
      </section>
      <NextPage to="/about" image="/img/factory.jpg" />
    </>
  );
}
