import { useLayoutEffect, useRef } from "react";
import { PageHero, NextPage } from "../components/Page";
import { Stats, Craft, VelocityMarquee } from "../components/Sections";
import { gsap, Reveal } from "../lib/motion";
import { process } from "../lib/data";

const values = [
  { t: "Власне виробництво", d: "Повний цикл усередині компанії — стабільні строки та якість." },
  { t: "Професійна команда", d: "Майстри з сучасним обладнанням та перевіреними методами." },
  { t: "Стандарт та нестандарт", d: "Від класичних форматів до індивідуальних висот." },
  { t: "5000+ проєктів", d: "Міжкімнатні й приховані двері, корпусні меблі — під розмір." },
];

/** Pinned horizontal process with a progress line that fills as you scroll. */
function Process() {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      const dist = () => track.current!.scrollWidth - window.innerWidth;
      const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: "top top", end: () => "+=" + dist(), scrub: 1, pin: true, invalidateOnRefresh: true } });
      tl.to(track.current, { x: () => -dist(), ease: "none" }, 0)
        .fromTo(".pr-fill", { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);
      gsap.utils.toArray<HTMLElement>(".pr-step").forEach((s) => {
        gsap.from(s.querySelector(".pr-n"), { yPercent: 100, duration: 1, ease: "expo.out", scrollTrigger: { trigger: s, containerAnimation: tl.getChildren()[0] as gsap.core.Tween, start: "left 80%" } });
      });
    });
    return () => mm.revert();
  }, []);
  return (
    <section ref={ref} className="pr">
      <div className="pr-head">
        <p className="mono eyebrow">( Процес )</p>
        <h2 className="sec-title">Чотири кроки<br /><i className="serif">до нових дверей</i></h2>
      </div>
      <div className="pr-line"><span className="pr-fill" /></div>
      <div ref={track} className="pr-track">
        {process.map((p) => (
          <article key={p.n} className="pr-step">
            <span className="pr-n-wrap"><span className="pr-n">{p.n}</span></span>
            <h3>{p.title}</h3>
            <p>{p.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AboutPage() {
  return (
    <>
      <PageHero index="04" crumbs={["Головна", "Про нас"]} title="Виробляємо" accent="якісно з 2017 року"
        lead="Власне виробництво в Одесі. Поєднуємо ручну майстерність із сучасними інструментами — стандартні й нестандартні двері та корпусні меблі."
        image="/img/factory.jpg" />
      <section className="vals">
        <Reveal as="p" className="vals-lead">Справжнє виробництво — <i className="serif">реальні результати.</i></Reveal>
        <div className="vals-grid">
          {values.map((v, i) => (
            <article key={v.t} className="val" data-cursor="✦">
              <span className="mono val-n">0{i + 1}</span>
              <h3>{v.t}</h3>
              <p>{v.d}</p>
              <span className="val-sweep" />
            </article>
          ))}
        </div>
      </section>
      <Process />
      <Stats />
      <VelocityMarquee text="Точні розміри · Надійна конструкція · Чесна фурнітура" />
      <Craft />
      <NextPage to="/contact" image="/img/oak-warm.jpg" />
    </>
  );
}
