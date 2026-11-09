import { useLayoutEffect, useRef, useState } from "react";
import { PageHero, ProductGrid, NextPage, Magnetic } from "../components/Page";
import { gsap } from "../lib/motion";
import { TLink } from "../lib/nav";
import { useApi, productsUrl, toCard, customizerPath, type ApiProduct } from "../lib/api";

const parts = [
  { x: 56, y: 6, side: "r", title: "Алюмінієва коробка", text: "Монтується у стіну до штукатурки — полотно стає врівень з площиною." },
  { x: 22, y: 30, side: "r", title: "Приховані петлі", text: "3D-регулювання, кут відкривання 180°, жодної видимої фурнітури." },
  { x: 64, y: 52, side: "r", title: "Магнітний замок", text: "Тихе зачинення без язичка, що клацає. Відповідна планка врізана в коробку." },
  { x: 26, y: 78, side: "r", title: "Полотно під фарбування", text: "Фарбується разом зі стіною — двері зникають. Або шпон, емаль, дзеркало." },
];

/** Pinned anatomy: callouts draw in one by one as you scroll. */
function Anatomy() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: "top top", end: "+=220%", scrub: 1, pin: true } });
      tl.fromTo(".an-img", { scale: 0.82, filter: "brightness(.5)" }, { scale: 1, filter: "brightness(1)", duration: 1 });
      gsap.utils.toArray<HTMLElement>(".an-part").forEach((p, i) => {
        tl.fromTo(p.querySelector(".an-dot"), { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, 1 + i)
          .fromTo(p.querySelector(".an-line"), { scaleX: 0 }, { scaleX: 1, duration: 0.4 }, 1.2 + i)
          .fromTo(p.querySelector(".an-card"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4 }, 1.4 + i)
          .to(".an-count b", { innerText: i + 1, snap: { innerText: 1 }, duration: 0.2 }, 1 + i);
      });
    });
    return () => mm.revert();
  }, []);
  return (
    <section ref={ref} className="anatomy">
      <div className="an-head">
        <p className="mono eyebrow">( Анатомія )</p>
        <h2 className="sec-title">Що всередині<br /><i className="serif">невидимих дверей</i></h2>
        <p className="mono an-count"><b>0</b> / 0{parts.length}</p>
      </div>
      <div className="an-stage">
        <div className="an-img"><img src="/img/concealed-tall.jpg" alt="Приховані двері" /></div>
        {parts.map((p) => (
          <div key={p.title} className={`an-part an-part--${p.side}`} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <span className="an-dot" />
            <span className="an-line" />
            <div className="an-card"><h3>{p.title}</h3><p>{p.text}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Drag to compare: a door with casing vs a concealed door. */
function Compare() {
  const [v, setV] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const drag = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    setV(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <section className="compare">
      <div className="sec-head">
        <p className="mono eyebrow">( Порівняйте )</p>
        <h2 className="sec-title">З наличником <i className="serif">чи без</i></h2>
      </div>
      <div ref={ref} className="cmp" data-cursor="Тягніть"
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag(e.clientX); }}
        onPointerMove={(e) => e.buttons === 1 && drag(e.clientX)}>
        <img src="/img/concealed-room.jpg" alt="Приховані двері" />
        <div className="cmp-top" style={{ clipPath: `inset(0 ${100 - v}% 0 0)` }}><img src="/img/white-living.jpg" alt="Двері з наличником" /></div>
        <span className="cmp-handle" style={{ left: `${v}%` }}><i>⟷</i></span>
        <span className="mono cmp-l">Класичний монтаж</span>
        <span className="mono cmp-r">Прихований монтаж</span>
      </div>
    </section>
  );
}

export function ConcealedPage() {
  const res = useApi<ApiProduct[]>(productsUrl({ categorySlug: "concealed" }));
  return (
    <>
      <PageHero index="02" crumbs={["Головна", "Приховані двері"]} title="Приховані" accent="врівень зі стіною"
        lead="Двері прихованого монтажу для квартир, будинків і офісів. Виготовляємо під розмір, фарбуємо в колір стіни або робимо акцент."
        image="/img/corridor.jpg">
        <Magnetic><TLink to="/concealed-customizer" className="pill pill--signal">Зібрати свої <span>→</span></TLink></Magnetic>
      </PageHero>
      <Anatomy />
      <ProductGrid products={(res.data ?? []).map(toCard)} loading={res.loading} error={res.error} to={(p) => customizerPath(p, "concealed")} />
      <Compare />
      <NextPage to="/concealed-customizer" image="/img/oak-flush.jpg" />
    </>
  );
}
