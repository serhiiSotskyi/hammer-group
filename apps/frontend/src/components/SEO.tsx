import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type SeoConfig = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  noindex?: boolean;
  serviceName?: string;
  serviceDescription?: string;
};

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://gentle-wave-055b70103.2.azurestaticapps.net").replace(/\/$/, "");
const DEFAULT_IMAGE = "/HammerB.svg";

const seoByPath: Record<string, SeoConfig> = {
  "/": {
    title: "Hammer Group | Двері та меблі на замовлення в Одесі",
    description:
      "Виготовляємо преміальні міжкімнатні та приховані двері, корпусні меблі на замовлення в Одесі. Власне виробництво, замір і консультація.",
    serviceName: "Двері та меблі на замовлення",
    serviceDescription:
      "Власне виробництво міжкімнатних дверей, прихованих дверей і корпусних меблів для житлових та комерційних просторів.",
  },
  "/interior-doors": {
    title: "Міжкімнатні двері на замовлення | Hammer Group",
    description:
      "Міжкімнатні двері на замовлення в Одесі: стандартні й нестандартні розміри, власне виробництво, якісна фурнітура, замір і прорахунок.",
    canonicalPath: "/interior-doors/",
    serviceName: "Міжкімнатні двері на замовлення",
    serviceDescription:
      "Виготовлення міжкімнатних дверей під розмір з добором матеріалів, конструкції, фурнітури та оздоблення в Одесі.",
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
  "/doors": {
    title: "Двері на замовлення в Одесі | Hammer Group",
    description:
      "Міжкімнатні та приховані двері на замовлення в Одесі. Власне виробництво, стандартні й індивідуальні розміри, замір і консультація.",
    canonicalPath: "/interior-doors/",
    serviceName: "Двері на замовлення",
    serviceDescription:
      "Виготовлення міжкімнатних і прихованих дверей під розмір для сучасних інтер’єрів.",
  },
  "/customizer": {
    title: "Конфігуратор міжкімнатних дверей | Hammer Group",
    description: "Налаштуйте параметри міжкімнатних дверей і надішліть запит на прорахунок у Hammer Group.",
    noindex: true,
  },
  "/concealed-customizer": {
    title: "Конфігуратор прихованих дверей | Hammer Group",
    description: "Налаштуйте параметри прихованих дверей і надішліть запит на прорахунок у Hammer Group.",
    noindex: true,
  },
};

function routeConfig(pathname: string): SeoConfig {
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  if (seoByPath[normalizedPath]) return seoByPath[normalizedPath];
  if (normalizedPath.startsWith("/interior-doors/")) return seoByPath["/interior-doors"];
  if (normalizedPath.startsWith("/admin")) {
    return {
      title: "Admin | Hammer Group",
      description: "Hammer Group admin area.",
      noindex: true,
    };
  }
  return seoByPath["/"];
}

function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function setMeta(selector: string, attributes: Record<string, string>): HTMLMetaElement {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
  return element;
}

function setCanonical(url: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

function structuredData(config: SeoConfig, canonicalUrl: string, imageUrl: string) {
  const organizationId = `${SITE_URL}/#organization`;
  const websiteId = `${SITE_URL}/#website`;
  const webpageId = `${canonicalUrl}#webpage`;

  const graph: Record<string, unknown>[] = [
    {
      "@type": ["Organization", "LocalBusiness", "HomeAndConstructionBusiness"],
      "@id": organizationId,
      name: "Hammer Group",
      url: SITE_URL,
      logo: absoluteUrl("/HammerB.svg"),
      image: imageUrl,
      email: "hammergrop25@gmail.com",
      telephone: "+380950040450",
      sameAs: ["https://www.instagram.com/hammergroupua/"],
      address: {
        "@type": "PostalAddress",
        streetAddress: "Krasnova Street, 12A",
        addressLocality: "Odesa",
        addressCountry: "UA",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 46.45174227110723,
        longitude: 30.734479776718167,
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          opens: "10:00",
          closes: "19:00",
        },
      ],
      foundingDate: "2017",
      areaServed: [
        { "@type": "City", name: "Odesa" },
        { "@type": "Country", name: "Ukraine" },
      ],
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: SITE_URL,
      name: "Hammer Group",
      publisher: { "@id": organizationId },
      inLanguage: "uk-UA",
    },
    {
      "@type": "WebPage",
      "@id": webpageId,
      url: canonicalUrl,
      name: config.title,
      description: config.description,
      isPartOf: { "@id": websiteId },
      about: { "@id": organizationId },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: imageUrl,
      },
      inLanguage: "uk-UA",
    },
  ];

  if (config.serviceName && config.serviceDescription) {
    graph.push({
      "@type": "Service",
      name: config.serviceName,
      description: config.serviceDescription,
      provider: { "@id": organizationId },
      areaServed: { "@type": "City", name: "Odesa" },
      serviceType: config.serviceName,
      url: canonicalUrl,
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export default function SEO() {
  const location = useLocation();

  useEffect(() => {
    const config = routeConfig(location.pathname);
    const canonicalPath = config.canonicalPath ?? location.pathname;
    const canonicalUrl = absoluteUrl(canonicalPath);
    const imageUrl = absoluteUrl(config.image ?? DEFAULT_IMAGE);
    const robots = config.noindex ? "noindex, nofollow" : "index, follow";

    document.title = config.title;
    document.documentElement.lang = "uk";

    setMeta('meta[name="description"]', { name: "description", content: config.description });
    setMeta('meta[name="robots"]', { name: "robots", content: robots });
    setMeta('meta[property="og:title"]', { property: "og:title", content: config.title });
    setMeta('meta[property="og:description"]', { property: "og:description", content: config.description });
    setMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    setMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    setMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });
    setMeta('meta[property="og:locale"]', { property: "og:locale", content: "uk_UA" });
    setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: config.title });
    setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: config.description });
    setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });
    setCanonical(canonicalUrl);

    let jsonLd =
      document.head.querySelector<HTMLScriptElement>('script[data-seo-jsonld="true"]') ??
      document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.type = "application/ld+json";
      document.head.appendChild(jsonLd);
    }
    jsonLd.dataset.seoJsonld = "true";
    jsonLd.textContent = JSON.stringify(structuredData(config, canonicalUrl, imageUrl));
  }, [location.pathname]);

  return null;
}
