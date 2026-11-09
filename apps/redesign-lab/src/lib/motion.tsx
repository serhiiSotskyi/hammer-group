import { useEffect, useLayoutEffect, useRef, type ReactNode, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lenis: Lenis | null = null;
export const getLenis = () => lenis;

/** Smooth inertial scroll driven by GSAP's ticker so ScrollTrigger stays in sync. */
export function useSmoothScroll() {
  useEffect(() => {
    if (reducedMotion()) return;
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    if (import.meta.env.DEV) (window as any).lenis = lenis;
    const tick = (t: number) => lenis?.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
  }, []);
}

/** Splits text into individually animatable chars (keeps words together for wrapping). */
export function SplitChars({ text, className, charClass = "ch" }: { text: string; className?: string; charClass?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((word, wi, arr) => (
        <span key={wi} className="word" aria-hidden>
          {[...word].map((c, ci) => (
            <span key={ci} className={charClass}>
              {c}
            </span>
          ))}
          {wi < arr.length - 1 && <span className={charClass}>&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}

/** Line-mask reveal: children slide up from behind a clip when scrolled into view. */
export function Reveal({ children, delay = 0, className, as: Tag = "div", style }: {
  children: ReactNode; delay?: number; className?: string; as?: any; style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    const inner = el.querySelector(".reveal-inner");
    const ctx = gsap.context(() => {
      gsap.fromTo(inner, { yPercent: 110, rotate: 3 }, {
        yPercent: 0, rotate: 0, duration: 1.2, delay, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
      });
    }, el);
    return () => ctx.revert();
  }, [delay]);
  return (
    <Tag ref={ref} className={`reveal ${className ?? ""}`} style={style}>
      <span className="reveal-inner">{children}</span>
    </Tag>
  );
}

/** Pulls an element toward the cursor while hovering (Cuberto-style magnetic button). */
export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const xTo = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1, 0.35)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1, 0.35)" });
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave); };
  }, [strength]);
  return <div ref={ref} className={`magnetic ${className ?? ""}`}>{children}</div>;
}

if (import.meta.env.DEV) (window as any).ST = ScrollTrigger;
