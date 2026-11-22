import { createContext, useCallback, useContext, useRef, type ReactNode, type MouseEvent, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gsap, ScrollTrigger, getLenis, refreshScroll } from "./motion";

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

/** Strip a trailing slash so "/about/" and "/about" resolve the same. */
export const normalizePath = (p: string) => (p === "/" ? "/" : p.replace(/\/+$/, "") || "/");

/* ------------------------------------------------------------------ SEO */
// Per-route title / description / canonical, ported from the live site
// (apps/frontend/src/components/SEO.tsx) so wording and URLs stay identical.

type SeoConfig = {
  title: string;
  description: string;
  canonicalPath: string;
  noindex?: boolean;
  serviceName?: string;
  serviceDescription?: string;
};

const SITE_URL = "https://www.hammergroup.ua";
const SEO_IMAGE = `${SITE_URL}/HammerB.svg`;
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const HOME_SEO: SeoConfig = {
  title: "Hammer Group | Двері та меблі на замовлення в Одесі",
  description:
    "Виготовляємо преміальні міжкімнатні та приховані двері, корпусні меблі на замовлення в Одесі. Власне виробництво, замір і консультація.",
  canonicalPath: "/",
  serviceName: "Двері та меблі на замовлення",
  serviceDescription:
    "Власне виробництво міжкімнатних дверей, прихованих дверей і корпусних меблів для житлових та комерційних просторів.",
};

const SEO_BY_PATH: Record<string, SeoConfig> = {
  "/": HOME_SEO,
  "/interior-doors": {
    title: "Міжкімнатні двері на замовлення | Hammer Group",
    description:
      "Міжкімнатні двері на замовлення в Одесі: стандартні й нестандартні розміри, власне виробництво, якісна фурнітура, замір і прорахунок.",
    canonicalPath: "/interior-doors/",
    serviceName: "Міжкімнатні двері на замовлення",
    serviceDescription:
      "Виготовлення міжкімнатних дверей під розмір з добором матеріалів, конструкції, фурнітури та оздоблення в Одесі.",
  },
  "/interior-doors/classic": {
    title: "Класичні міжкімнатні двері на замовлення | Hammer Group",
    description:
      "Класичні міжкімнатні двері на замовлення в Одесі: стандартні й нестандартні розміри, власне виробництво, якісна фурнітура, замір і прорахунок.",
    canonicalPath: "/interior-doors/classic/",
    serviceName: "Класичні міжкімнатні двері",
    serviceDescription:
      "Виготовлення класичних міжкімнатних дверей під розмір з добором оздоблення та фурнітури в Одесі.",
  },
  "/interior-doors/modern": {
    title: "Сучасні міжкімнатні двері на замовлення | Hammer Group",
    description:
      "Сучасні міжкімнатні двері на замовлення в Одесі: стандартні й нестандартні розміри, власне виробництво, якісна фурнітура, замір і прорахунок.",
    canonicalPath: "/interior-doors/modern/",
    serviceName: "Сучасні міжкімнатні двері",
    serviceDescription:
      "Виготовлення сучасних міжкімнатних дверей під розмір з добором оздоблення та фурнітури в Одесі.",
  },
  "/concealed-doors": {
    title: "Приховані двері прихованого монтажу | Hammer Group",
    description:
      "Приховані двері врівень зі стіною в Одесі. Виробництво під індивідуальні розміри, прихований монтаж, фурнітура, замір і прорахунок.",
    canonicalPath: "/concealed-doors/",
    serviceName: "Приховані двері",
    serviceDescription:
      "Виготовлення прихованих дверей із прихованими петлями, сучасною фурнітурою та монтажними рішеннями під проєкт.",
  },
  "/cabinet-furniture": {
    title: "Корпусні меблі на замовлення в Одесі | Hammer Group",
    description:
      "Корпусні меблі на замовлення в Одесі: шафи, вбудовані рішення, меблі для житла й бізнесу, індивідуальні розміри, замір і прорахунок.",
    canonicalPath: "/cabinet-furniture/",
    serviceName: "Корпусні меблі на замовлення",
    serviceDescription:
      "Проєктування та виготовлення корпусних меблів під розмір з індивідуальними матеріалами, фурнітурою та оздобленням.",
  },
  "/about": {
    title: "Про Hammer Group | Власне виробництво дверей в Одесі",
    description:
      "Hammer Group працює з 2017 року та виготовляє двері й корпусні меблі на власному виробництві в Одесі для приватних і комерційних проєктів.",
    canonicalPath: "/about/",
  },
  "/contact": {
    title: "Контакти Hammer Group | Шоурум дверей в Одесі",
    description:
      "Зв’яжіться з Hammer Group в Одесі: вул. Краснова, 12А, консультація щодо дверей і меблів на замовлення, замір і прорахунок проєкту.",
    canonicalPath: "/contact/",
  },
  "/customizer": {
    title: "Конфігуратор міжкімнатних дверей | Hammer Group",
    description: "Налаштуйте параметри міжкімнатних дверей і надішліть запит на прорахунок у Hammer Group.",
    canonicalPath: "/customizer",
    noindex: true,
  },
  "/concealed-customizer": {
    title: "Конфігуратор прихованих дверей | Hammer Group",
    description: "Налаштуйте параметри прихованих дверей і надішліть запит на прорахунок у Hammer Group.",
    canonicalPath: "/concealed-customizer",
    noindex: true,
  },
};

function seoFor(pathname: string): SeoConfig {
  const p = normalizePath(pathname);
  if (SEO_BY_PATH[p]) return SEO_BY_PATH[p];
  // Unknown collection slugs fall back to the interior overview (as on the live site).
  if (p.startsWith("/interior-doors/")) return SEO_BY_PATH["/interior-doors"];
  // Unknown routes render the home page; point them at "/" so they aren't indexed as duplicates.
  return HOME_SEO;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function structuredData(c: SeoConfig, url: string) {
  const graph: Record<string, unknown>[] = [
    {
      "@type": ["Organization", "LocalBusiness", "HomeAndConstructionBusiness"],
      "@id": ORG_ID,
      name: "Hammer Group",
      url: SITE_URL,
      logo: SEO_IMAGE,
      image: SEO_IMAGE,
      email: "hammergrop25@gmail.com",
      telephone: "+380950040450",
      sameAs: ["https://www.instagram.com/hammergroupua/"],
      address: { "@type": "PostalAddress", streetAddress: "Krasnova Street, 12A", addressLocality: "Odesa", addressCountry: "UA" },
      geo: { "@type": "GeoCoordinates", latitude: 46.45174227110723, longitude: 30.734479776718167 },
      openingHoursSpecification: [{
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "10:00",
        closes: "19:00",
      }],
      foundingDate: "2017",
      areaServed: [{ "@type": "City", name: "Odesa" }, { "@type": "Country", name: "Ukraine" }],
    },
    { "@type": "WebSite", "@id": WEBSITE_ID, url: SITE_URL, name: "Hammer Group", publisher: { "@id": ORG_ID }, inLanguage: "uk-UA" },
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: c.title,
      description: c.description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORG_ID },
      primaryImageOfPage: { "@type": "ImageObject", url: SEO_IMAGE },
      inLanguage: "uk-UA",
    },
  ];
  if (c.serviceName && c.serviceDescription) {
    graph.push({
      "@type": "Service",
      name: c.serviceName,
      description: c.serviceDescription,
      provider: { "@id": ORG_ID },
      areaServed: { "@type": "City", name: "Odesa" },
      serviceType: c.serviceName,
      url,
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/** Apply title, description, canonical, OG/Twitter and JSON-LD for the current route. */
export function applySeo(pathname: string) {
  const c = seoFor(pathname);
  const url = `${SITE_URL}${c.canonicalPath}`;
  document.title = c.title;
  document.documentElement.lang = "uk";
  setMeta("name", "description", c.description);
  setMeta("name", "robots", c.noindex ? "noindex, nofollow" : "index, follow");
  setMeta("property", "og:title", c.title);
  setMeta("property", "og:description", c.description);
  setMeta("property", "og:url", url);
  setMeta("name", "twitter:title", c.title);
  setMeta("name", "twitter:description", c.description);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
  let ld = document.head.querySelector<HTMLScriptElement>('script[data-seo-jsonld="true"]');
  if (!ld) {
    ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.dataset.seoJsonld = "true";
    document.head.appendChild(ld);
  }
  ld.textContent = JSON.stringify(structuredData(c, url));
}

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
    const path = normalizePath(to.split("?")[0]);
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
      .add(refreshScroll)
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
