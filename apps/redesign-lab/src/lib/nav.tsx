import { createContext, useCallback, useContext, useRef, type ReactNode, type MouseEvent, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gsap, ScrollTrigger, getLenis } from "./motion";

export const PAGE_NAMES: Record<string, string> = {
  "/": "Головна",
  "/interior-doors": "Міжкімнатні двері",
  "/interior-doors/classic": "Класика",
  "/interior-doors/modern": "Модерн",
  "/concealed-doors": "Приховані двері",
  "/customizer": "Конфігуратор",
  "/concealed-customizer": "Конфігуратор",
  "/cabinet-furniture": "Корпусні меблі",
  "/about": "Про нас",
  "/contact": "Контакти",
};

type Ctx = { go: (to: string) => void; ready: boolean };
const NavCtx = createContext<Ctx>({ go: () => {}, ready: false });
export const useDoor = () => useContext(NavCtx);

/** Page transition: two door panels close, the route swaps, panels open. */
export function DoorTransition({ children, ready }: { children: ReactNode; ready: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const busy = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLParagraphElement>(null);

  const go = useCallback((to: string) => {
    const here = location.pathname + location.search;
    if (busy.current) return;
    if (to === here) { getLenis()?.scrollTo(0, { duration: 1.4 }); return; }
    busy.current = true;
    const path = to.split("?")[0];
    if (label.current) label.current.textContent = PAGE_NAMES[path] ?? "Hammer Group";
    delete document.body.dataset.cursor;
    const q = gsap.utils.selector(root);
    gsap.timeline()
      .set(root.current, { display: "block" })
      .fromTo(q(".dw-l"), { xPercent: -100 }, { xPercent: 0, duration: 0.75, ease: "expo.inOut" })
      .fromTo(q(".dw-r"), { xPercent: 100 }, { xPercent: 0, duration: 0.75, ease: "expo.inOut" }, "<")
      .fromTo(q(".dw-seam"), { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: "expo.out" }, "-=0.25")
      .fromTo(label.current, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, "<")
      .add(() => {
        navigate(to);
        getLenis()?.scrollTo(0, { immediate: true, force: true });
        window.scrollTo(0, 0);
      })
      .to({}, { duration: 0.35 })
      .add(() => ScrollTrigger.refresh())
      .to(label.current, { yPercent: -100, opacity: 0, duration: 0.35, ease: "expo.in" })
      .to(q(".dw-seam"), { scaleY: 0, duration: 0.3 }, "<")
      .to(q(".dw-l"), { xPercent: -100, duration: 1, ease: "expo.inOut" })
      .to(q(".dw-r"), { xPercent: 100, duration: 1, ease: "expo.inOut" }, "<")
      .set(root.current, { display: "none" })
      .add(() => { busy.current = false; });
  }, [location, navigate]);

  return (
    <NavCtx.Provider value={{ go, ready }}>
      {children}
      <div ref={root} className="door-wipe" aria-hidden>
        <div className="dw-l" /><div className="dw-r" />
        <span className="dw-seam" />
        <div className="dw-label-wrap"><p ref={label} className="dw-label" /></div>
      </div>
    </NavCtx.Provider>
  );
}

/** Internal link that plays the door transition. */
export function TLink({ to, children, className, style, cursor, onClick }: {
  to: string; children: ReactNode; className?: string; style?: CSSProperties; cursor?: string; onClick?: () => void;
}) {
  const { go } = useDoor();
  return (
    <a href={to} className={className} style={style} data-cursor={cursor}
      onClick={(e: MouseEvent) => {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault(); onClick?.(); go(to);
      }}>
      {children}
    </a>
  );
}
