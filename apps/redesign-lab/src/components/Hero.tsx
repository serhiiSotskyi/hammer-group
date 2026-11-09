import { lazy, Suspense, useLayoutEffect, useRef } from "react";
import { gsap, SplitChars, reducedMotion } from "../lib/motion";
import { heroProgress } from "../lib/heroProgress";
import { useDoor } from "../lib/nav";

const FloatingObjects = lazy(() => import("./FloatingObjects"));

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const { ready } = useDoor();

  // Intro (plays once the loader finishes)
  useLayoutEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".hero-title .ch", { yPercent: 120, rotate: 12, duration: 1.4, stagger: 0.035 })
        .from(".hero-frame", { scaleY: 0, duration: 1.4, ease: "expo.inOut" }, 0)
        .from(".hero-meta > *", { y: 30, opacity: 0, duration: 1, stagger: 0.1 }, 0.5)
        .from(".hero-canvas", { opacity: 0, duration: 2 }, 0.3);
    }, root);
    return () => ctx.revert();
  }, [ready]);

  // Scroll: the concealed door opens and we walk through it.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=260%",
          scrub: reducedMotion() ? true : 1,
          pin: true,
          onUpdate: (s) => (heroProgress.value = s.progress),
        },
      });
      tl.to(".hero-frame", { "--glow": 1, duration: 0.12 })
        .to(".hero-leaf", { rotateY: -108, duration: 0.42, ease: "power2.in" }, 0.08)
        .to(".hero-flood", { opacity: 1, duration: 0.2 }, 0.2)
        .to(".hero-flood", { opacity: 0, duration: 0.25 }, 0.5)
        .to(".hero-title .ch", {
          yPercent: () => gsap.utils.random(-260, 260),
          xPercent: () => gsap.utils.random(-120, 120),
          rotate: () => gsap.utils.random(-70, 70),
          opacity: 0,
          stagger: { each: 0.01, from: "center" },
          duration: 0.3,
        }, 0.15)
        .to(".hero-meta", { opacity: 0, y: -40, duration: 0.15 }, 0.1)
        .to(".hero-frame", { scale: 7, duration: 0.5, ease: "power2.in" }, 0.45)
        .to(".hero-bg img", { scale: 1, duration: 0.55 }, 0.45)
        .fromTo(".hero-after .ch", { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.008, duration: 0.15 }, 0.82)
        .fromTo(".hero-after-sub", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.12 }, 0.9);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="hero" id="top">
      <div className="hero-bg"><img src="/img/corridor.jpg" alt="Приховані двері Hammer Group у світлому коридорі" /></div>

      <div className="hero-frame">
        <div className="hero-leaf">
          <span className="hero-leaf-handle" />
        </div>
        <div className="hero-flood" />
      </div>

      <h1 className="hero-title">
        <SplitChars text="HAMMER" className="hero-word hero-word--l" />
        <SplitChars text="GROUP" className="hero-word hero-word--r" />
      </h1>

      <Suspense fallback={null}>
        <FloatingObjects />
      </Suspense>

      <div className="hero-meta">
        <p className="mono">Двері та меблі<br />власного виробництва · з 2017</p>
        <p className="hero-scroll mono"><span className="hero-scroll-dot" />Гортайте, щоб відчинити</p>
        <p className="mono hero-meta-r">Одеса · Україна<br />5 000+ проєктів</p>
      </div>

      <div className="hero-after">
        <h2><SplitChars text="Виготовлені під ваш простір" /></h2>
        <p className="hero-after-sub">Кожні двері — під точний розмір вашого отвору. Від класики до полотен врівень зі стіною.</p>
      </div>
    </section>
  );
}
