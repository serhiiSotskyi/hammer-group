import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { gsap, Magnetic } from "../lib/motion";
import { tickerItems, CONTACT } from "../lib/data";
import { TLink } from "../lib/nav";
import { usePromotions } from "../lib/api";

/** Preloader: counter + split door panels. */
export function Loader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);
  useLayoutEffect(() => {
    const obj = { v: 0 };
    const ctx = gsap.context(() => {
      gsap.timeline({ onComplete: onDone })
        .to(obj, { v: 100, duration: 1.6, ease: "power2.inOut", onUpdate: () => setN(Math.round(obj.v)) })
        .to(".loader-bar", { scaleX: 1, duration: 1.6, ease: "power2.inOut" }, 0)
        .to(".loader-count, .loader-bar, .loader-brand", { opacity: 0, duration: 0.3 })
        .to(".loader-l", { xPercent: -100, duration: 1.1, ease: "expo.inOut" }, "-=0.1")
        .to(".loader-r", { xPercent: 100, duration: 1.1, ease: "expo.inOut" }, "<")
        .set(root.current, { display: "none" });
    }, root);
    return () => ctx.revert();
  }, [onDone]);
  return (
    <div ref={root} className="loader">
      <div className="loader-l" /><div className="loader-r" />
      <p className="loader-brand mono">HAMMER GROUP — ЛАБОРАТОРІЯ РЕДИЗАЙНУ</p>
      <div className="loader-count">{String(n).padStart(3, "0")}</div>
      <div className="loader-bar" />
    </div>
  );
}

/** Custom cursor with contextual labels (data-cursor on any element). */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const el = dot.current!;
    const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3" });
    const move = (e: MouseEvent) => {
      xTo(e.clientX); yTo(e.clientY);
      const t = (e.target as HTMLElement).closest("[data-cursor]") as HTMLElement | null;
      const l = t?.dataset.cursor ?? (document.body.dataset.cursor === "spin" ? "Крутити" : "");
      setLabel(l);
      el.classList.toggle("is-link", !!(e.target as HTMLElement).closest("a,button"));
    };
    const out = () => setLabel("");
    window.addEventListener("mousemove", move);
    document.documentElement.addEventListener("mouseleave", out);
    return () => { window.removeEventListener("mousemove", move); document.documentElement.removeEventListener("mouseleave", out); };
  }, []);
  return <div ref={dot} className={`cursor ${label ? "has-label" : ""}`}><span>{label}</span></div>;
}

export function Ticker() {
  const { promos, unavailable } = usePromotions();
  // Live ticker from admin promotions; demo lines only while the promotions API isn't deployed.
  const live = promos?.ticker.map((p) => [p.title, p.subtitle].filter(Boolean).join(" · ")) ?? [];
  const base = live.length ? live : unavailable ? tickerItems : ["Двері та меблі власного виробництва · Одеса", "Розрахунок вартості за 24 години"];
  const row = base.length < 4 ? [...base, ...base, ...base] : base;
  const items = [...row, ...row];
  return (
    <div className="ticker" data-cursor="Акції">
      <div className="ticker-track">
        {items.map((t, i) => (
          <span key={i} className="ticker-item"><i>✦</i>{t}</span>
        ))}
      </div>
    </div>
  );
}

export function Nav() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    let last = 0;
    const on = () => {
      const y = window.scrollY;
      setHidden(y > last && y > 300);
      last = y;
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { setHidden(false); setOpen(false); }, [pathname]);
  const links: [string, string][] = [
    ["/interior-doors", "Міжкімнатні"], ["/concealed-doors", "Приховані"], ["/cabinet-furniture", "Меблі"],
    ["/customizer", "Конфігуратор"], ["/about", "Про нас"], ["/contact", "Контакти"],
  ];
  const active = (h: string) => pathname === h || pathname.startsWith(h + "/");
  return (
    <>
      <header className={`nav ${hidden && !open ? "nav--hidden" : ""}`}>
        <TLink className="nav-logo" to="/">
          <img src="/img/logo.svg" alt="" /> <span>Hammer Group</span>
        </TLink>
        <nav className="nav-links">
          {links.map(([h, l]) => (
            <TLink key={h} to={h} className={active(h) ? "is-active" : ""}><span data-text={l}>{l}</span></TLink>
          ))}
        </nav>
        <div className="nav-right">
          <span className="mono nav-lang">UA / EN</span>
          <Magnetic><TLink to="/contact" className="pill pill--light">Прорахувати</TLink></Magnetic>
          <button className={`burger ${open ? "is-open" : ""}`} onClick={() => setOpen(!open)} aria-label="Меню"><i /><i /></button>
        </div>
      </header>
      <div className={`menu ${open ? "is-open" : ""}`}>
        {links.map(([h, l], i) => (
          <TLink key={h} to={h} style={{ transitionDelay: `${open ? 0.1 + i * 0.06 : 0}s` }} onClick={() => setOpen(false)}>
            <span className="mono">0{i + 1}</span>{l}
          </TLink>
        ))}
        <a className="menu-phone mono" href={`tel:${CONTACT.tel}`}>{CONTACT.phone}</a>
      </div>
    </>
  );
}
