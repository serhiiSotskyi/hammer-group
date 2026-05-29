import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const siteUrl = (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://gentle-wave-055b70103.2.azurestaticapps.net").replace(/\/$/, "");
const today = new Date().toISOString().slice(0, 10);

const routes = [
  {
    path: "/",
    title: "Hammer Group | Двері та меблі на замовлення в Одесі",
    description:
      "Виготовляємо преміальні міжкімнатні та приховані двері, корпусні меблі на замовлення в Одесі. Власне виробництво, замір і консультація.",
    serviceName: "Двері та меблі на замовлення",
    serviceDescription:
      "Власне виробництво міжкімнатних дверей, прихованих дверей і корпусних меблів для житлових та комерційних просторів.",
  },
  {
    path: "/interior-doors/",
    title: "Міжкімнатні двері на замовлення | Hammer Group",
    description:
      "Міжкімнатні двері на замовлення в Одесі: стандартні й нестандартні розміри, власне виробництво, якісна фурнітура, замір і прорахунок.",
    serviceName: "Міжкімнатні двері на замовлення",
    serviceDescription:
      "Виготовлення міжкімнатних дверей під розмір з добором матеріалів, конструкції, фурнітури та оздоблення в Одесі.",
  },
  {
    path: "/concealed-doors/",
    title: "Приховані двері прихованого монтажу | Hammer Group",
    description:
      "Приховані двері врівень зі стіною в Одесі. Виробництво під індивідуальні розміри, прихований монтаж, фурнітура, замір і прорахунок.",
    serviceName: "Приховані двері",
    serviceDescription:
      "Виготовлення прихованих дверей із прихованими петлями, сучасною фурнітурою та монтажними рішеннями під проєкт.",
  },
  {
    path: "/cabinet-furniture/",
    title: "Корпусні меблі на замовлення в Одесі | Hammer Group",
    description:
      "Корпусні меблі на замовлення в Одесі: шафи, вбудовані рішення, меблі для житла й бізнесу, індивідуальні розміри, замір і прорахунок.",
    serviceName: "Корпусні меблі на замовлення",
    serviceDescription:
      "Проєктування та виготовлення корпусних меблів під розмір з індивідуальними матеріалами, фурнітурою та оздобленням.",
  },
  {
    path: "/about/",
    title: "Про Hammer Group | Власне виробництво дверей в Одесі",
    description:
      "Hammer Group працює з 2017 року та виготовляє двері й корпусні меблі на власному виробництві в Одесі для приватних і комерційних проєктів.",
  },
  {
    path: "/contact/",
    title: "Контакти Hammer Group | Шоурум дверей в Одесі",
    description:
      "Зв’яжіться з Hammer Group в Одесі: вул. Краснова, 12А, консультація щодо дверей і меблів на замовлення, замір і прорахунок проєкту.",
  },
];

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function absoluteUrl(routePath) {
  return `${siteUrl}${routePath}`;
}

function schema(route) {
  const url = absoluteUrl(route.path);
  const organizationId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;
  const graph = [
    {
      "@type": ["Organization", "LocalBusiness", "HomeAndConstructionBusiness"],
      "@id": organizationId,
      name: "Hammer Group",
      url: siteUrl,
      logo: `${siteUrl}/HammerB.svg`,
      image: `${siteUrl}/HammerB.svg`,
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
      url: siteUrl,
      name: "Hammer Group",
      publisher: { "@id": organizationId },
      inLanguage: "uk-UA",
    },
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: route.title,
      description: route.description,
      isPartOf: { "@id": websiteId },
      about: { "@id": organizationId },
      inLanguage: "uk-UA",
    },
  ];

  if (route.serviceName && route.serviceDescription) {
    graph.push({
      "@type": "Service",
      name: route.serviceName,
      description: route.serviceDescription,
      provider: { "@id": organizationId },
      areaServed: { "@type": "City", name: "Odesa" },
      serviceType: route.serviceName,
      url,
    });
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}

function stripManagedHead(html) {
  return html
    .replace(/<html\s+lang="[^"]*"/, '<html lang="uk"')
    .replace(/\s*<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s*<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>\n?/gi, "")
    .replace(/\s*<link\s+rel="canonical"[^>]*>\n?/gi, "")
    .replace(/\s*<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\n?/gi, "");
}

function headTags(route) {
  const url = absoluteUrl(route.path);
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  return [
    `    <title>${title}</title>`,
    `    <meta name="description" content="${description}" />`,
    `    <meta name="robots" content="index, follow" />`,
    `    <link rel="canonical" href="${url}" />`,
    `    <meta property="og:title" content="${title}" />`,
    `    <meta property="og:description" content="${description}" />`,
    `    <meta property="og:type" content="website" />`,
    `    <meta property="og:url" content="${url}" />`,
    `    <meta property="og:image" content="${siteUrl}/HammerB.svg" />`,
    `    <meta property="og:locale" content="uk_UA" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${title}" />`,
    `    <meta name="twitter:description" content="${description}" />`,
    `    <meta name="twitter:image" content="${siteUrl}/HammerB.svg" />`,
    `    <script type="application/ld+json">${schema(route)}</script>`,
  ].join("\n");
}

function renderPage(baseHtml, route) {
  return stripManagedHead(baseHtml).replace("</head>", `${headTags(route)}\n  </head>`);
}

const indexPath = path.join(dist, "index.html");
const baseHtml = fs.readFileSync(indexPath, "utf8");

for (const route of routes) {
  const html = renderPage(baseHtml, route);
  if (route.path === "/") {
    fs.writeFileSync(indexPath, html);
    continue;
  }
  const routeDir = path.join(dist, route.path.replace(/^\//, ""));
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, "index.html"), html);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map((route) => `  <url>\n    <loc>${absoluteUrl(route.path)}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`),
  "</urlset>",
  "",
].join("\n");

const robots = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /admin",
  "Disallow: /admin/",
  "Disallow: /admin/login",
  "",
  "User-agent: Googlebot",
  "Allow: /",
  "",
  "User-agent: Bingbot",
  "Allow: /",
  "",
  "User-agent: Twitterbot",
  "Allow: /",
  "",
  "User-agent: facebookexternalhit",
  "Allow: /",
  "",
  `Sitemap: ${siteUrl}/sitemap.xml`,
  "",
].join("\n");

fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(dist, "robots.txt"), robots);

console.log(`Generated SEO pages for ${routes.length} routes with site URL ${siteUrl}`);
