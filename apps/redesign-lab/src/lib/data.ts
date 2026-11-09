// ─────────────────────────────────────────────────────────────
// DEMO DATA ONLY. In production these come from a `Promotion`
// model + admin page, and real products / real quotes from the API.
// Prices below are placeholders, not Hammer Group's real prices.
// ─────────────────────────────────────────────────────────────

export type Deal = {
  id: string;
  rank: number;
  name: string;
  collection: string;
  image: string;
  oldPrice: number;
  price: number;
  tag?: "ХІТ" | "−%" | "НОВИНКА";
};

export const tickerItems = [
  "−15% на приховані двері до кінця листопада",
  "Безкоштовний замір по Одесі",
  "Нестандартні розміри без доплати за висоту до 2400 мм",
  "Розрахунок вартості за 24 години",
  "Фурнітура AGB у подарунок до комплекту з 3 дверей",
];

export const topSales: Deal[] = [
  { id: "flush", rank: 1, name: "Приховані двері Flush", collection: "Приховані", image: "/img/concealed-room.jpg", oldPrice: 18900, price: 15990, tag: "ХІТ" },
  { id: "oak", rank: 2, name: "Полотно «Дуб Натур»", collection: "Модерн", image: "/img/oak-flush.jpg", oldPrice: 14500, price: 12300, tag: "−%" },
  { id: "classic", rank: 3, name: "Класичний дуб", collection: "Класика", image: "/img/classic-oak.jpg", oldPrice: 16200, price: 13900 },
  { id: "black", rank: 4, name: "Graphite Line", collection: "Модерн", image: "/img/black-door.jpg", oldPrice: 17400, price: 14990, tag: "НОВИНКА" },
  { id: "slider", rank: 5, name: "Розсувна система Glass", collection: "Перегородки", image: "/img/glass-slider.jpg", oldPrice: 32800, price: 27900 },
  { id: "tall", rank: 6, name: "Високі приховані 2700", collection: "Приховані", image: "/img/concealed-tall.jpg", oldPrice: 24600, price: 21400, tag: "−%" },
];

export const dealOfWeek = {
  name: "Комплект «Тиша»",
  sub: "Акустичні приховані двері + магнітний замок + приховані петлі",
  image: "/img/oak-warm.jpg",
  oldPrice: 26800,
  price: 19900,
};

// Must be wired to REAL recent quotes in production — never invented entries.
export const recentQuotes = [
  { city: "Одеса", item: "Приховані двері Flush", ago: "12 хв тому" },
  { city: "Львів", item: "Шафа-купе під стелю", ago: "34 хв тому" },
  { city: "Одеса", item: "3 полотна «Дуб Натур»", ago: "1 год тому" },
  { city: "Ірпінь", item: "Кухня на замовлення", ago: "2 год тому" },
];

export const collections = [
  { n: "01", title: "Міжкімнатні двері", sub: "Класика та модерн", image: "/img/white-living.jpg", meta: "Масив · Шпон · Емаль", to: "/interior-doors" },
  { n: "02", title: "Приховані двері", sub: "Врівень зі стіною", image: "/img/corridor.jpg", meta: "Приховані петлі · Магнітний замок", to: "/concealed-doors" },
  { n: "03", title: "Корпусні меблі", sub: "Кухні, шафи, гардеробні", image: "/img/kitchen.jpg", meta: "Під розмір · Власне виробництво", to: "/cabinet-furniture" },
  { n: "04", title: "Конфігуратор", sub: "Зберіть свої двері", image: "/img/oak-flush.jpg", meta: "Ціна онлайн · 24 год прорахунок", to: "/customizer" },
];

export const uah = (n: number) => new Intl.NumberFormat("uk-UA").format(n) + " ₴";

export const CONTACT = {
  phone: "+380 95 004 04 50",
  tel: "+380950040450",
  email: "hammergrop25@gmail.com",
  instagram: "https://www.instagram.com/hammergroupua/",
  city: "Одеса, Україна",
  street: "вул. Краснова, 12А",
};

export type Product = {
  slug: string; name: string; image: string; price: number; oldPrice?: number;
  finish: string; tag?: "ХІТ" | "−%" | "НОВИНКА"; note: string;
};

// DEMO catalogue — production reads /api/products?categorySlug=…
export const catalog: Record<string, { title: string; accent: string; lead: string; image: string; filters: string[]; products: Product[] }> = {
  classic: {
    title: "Класика", accent: "що не старіє",
    lead: "Філенки, молдинги, натуральний шпон і масив. Пропорції, перевірені століттями, — у розмір вашого отвору.",
    image: "/img/classic.jpg",
    filters: ["Усі", "Шпон", "Масив", "Емаль"],
    products: [
      { slug: "classic-oak", name: "Класичний дуб", image: "/img/classic-oak.jpg", price: 13900, oldPrice: 16200, finish: "Шпон", tag: "ХІТ", note: "3 філенки · дуб натур" },
      { slug: "heritage", name: "Heritage", image: "/img/classic.jpg", price: 21500, finish: "Масив", note: "Вітражне скло · бічні панелі" },
      { slug: "milano-white", name: "Milano White", image: "/img/white-living.jpg", price: 11900, oldPrice: 13400, finish: "Емаль", tag: "−%", note: "Молдинг · біла емаль" },
      { slug: "verona", name: "Verona", image: "/img/classic-oak.jpg", price: 15400, finish: "Шпон", note: "Шпон горіха · патина" },
      { slug: "palazzo", name: "Palazzo", image: "/img/classic.jpg", price: 24800, finish: "Масив", tag: "НОВИНКА", note: "Двостулкові · масив дуба" },
      { slug: "ivory", name: "Ivory Line", image: "/img/white-living.jpg", price: 12600, finish: "Емаль", note: "Слонова кістка · латунь" },
    ],
  },
  modern: {
    title: "Модерн", accent: "чисті лінії",
    lead: "Гладкі полотна, тонкі алюмінієві торці, графіт і натуральний дуб. Мінімум деталей — максимум точності.",
    image: "/img/oak-warm.jpg",
    filters: ["Усі", "Шпон", "Емаль", "Скло"],
    products: [
      { slug: "oak-natur", name: "Дуб Натур", image: "/img/oak-flush.jpg", price: 12300, oldPrice: 14500, finish: "Шпон", tag: "−%", note: "Гладке полотно · вертикальний шпон" },
      { slug: "graphite", name: "Graphite Line", image: "/img/black-door.jpg", price: 14990, oldPrice: 17400, finish: "Емаль", tag: "НОВИНКА", note: "Графітова емаль · чорна фурнітура" },
      { slug: "glass-slide", name: "Glass Slide", image: "/img/glass-slider.jpg", price: 27900, oldPrice: 32800, finish: "Скло", note: "Розсувна · загартоване скло" },
      { slug: "warm-oak", name: "Warm Oak", image: "/img/oak-warm.jpg", price: 13200, finish: "Шпон", tag: "ХІТ", note: "Теплий дуб · прихована петля" },
      { slug: "nordic", name: "Nordic White", image: "/img/white-living.jpg", price: 10900, finish: "Емаль", note: "Біла матова емаль" },
      { slug: "line-glass", name: "Line Glass", image: "/img/glass-slider.jpg", price: 18700, finish: "Скло", note: "Скляна смуга · алюміній" },
    ],
  },
  concealed: {
    title: "Приховані", accent: "врівень зі стіною",
    lead: "Полотно, яке зникає у стіні. Алюмінієва коробка, приховані петлі, магнітний замок — і жодного наличника.",
    image: "/img/concealed-room.jpg",
    filters: ["Усі", "Під фарбування", "Шпон", "Акустичні"],
    products: [
      { slug: "concealed-flush", name: "Flush", image: "/img/concealed-room.jpg", price: 15990, oldPrice: 18900, finish: "Під фарбування", tag: "ХІТ", note: "Під фарбування в колір стіни" },
      { slug: "concealed-tall", name: "Tall 2700", image: "/img/concealed-tall.jpg", price: 21400, oldPrice: 24600, finish: "Під фарбування", tag: "−%", note: "Висота до 2700 мм" },
      { slug: "concealed-oak", name: "Oak Invisible", image: "/img/oak-flush.jpg", price: 19800, finish: "Шпон", note: "Шпон дуба врівень зі стіною" },
      { slug: "concealed-acoustic", name: "Acoustic", image: "/img/oak-warm.jpg", price: 23900, finish: "Акустичні", tag: "НОВИНКА", note: "Шумоізоляція до 32 дБ" },
      { slug: "concealed-corridor", name: "Corridor Set", image: "/img/corridor.jpg", price: 17200, finish: "Під фарбування", note: "Серія для коридору" },
      { slug: "concealed-premium", name: "Premium", image: "/img/concealed-tall.jpg", price: 26900, finish: "Шпон", note: "Преміальна фурнітура" },
    ],
  },
};

export const portfolio = [
  { id: 1, name: "Кухня з острівом", type: "Меблі", image: "/img/kitchen.jpg", album: ["/img/kitchen.jpg", "/img/white-living.jpg"] },
  { id: 2, name: "Шафа-купе під стелю", type: "Меблі", image: "/img/wardrobe.jpg", album: ["/img/wardrobe.jpg", "/img/oak-warm.jpg"] },
  { id: 3, name: "Приховані двері в коридорі", type: "Двері", image: "/img/corridor.jpg", album: ["/img/corridor.jpg", "/img/concealed-tall.jpg"] },
  { id: 4, name: "Вітальня з ТВ-зоною", type: "Меблі", image: "/img/white-living.jpg", album: ["/img/white-living.jpg"] },
  { id: 5, name: "Скляна перегородка", type: "Двері", image: "/img/glass-slider.jpg", album: ["/img/glass-slider.jpg"] },
  { id: 6, name: "Дуб у спальні", type: "Двері", image: "/img/oak-flush.jpg", album: ["/img/oak-flush.jpg", "/img/oak-warm.jpg"] },
  { id: 7, name: "Графітовий вхід", type: "Двері", image: "/img/black-door.jpg", album: ["/img/black-door.jpg"] },
  { id: 8, name: "Класичний холл", type: "Двері", image: "/img/classic.jpg", album: ["/img/classic.jpg", "/img/classic-oak.jpg"] },
];

export const process = [
  { n: "01", title: "Замір", text: "Майстер приїжджає, знімає точні розміри отвору та стін, радить по конструкції." },
  { n: "02", title: "Проєкт", text: "Підбираємо модель, оздоблення та фурнітуру. Ви отримуєте прорахунок за 24 години." },
  { n: "03", title: "Виробництво", text: "Розкрій, шпонування, фарбування й складання — на власному виробництві." },
  { n: "04", title: "Монтаж", text: "Встановлюємо, регулюємо петлі та замки, прибираємо за собою." },
];

// DEMO pricing for the prototype configurator (real pricing comes from the backend pricing service).
export type Opt = { id: string; label: string; add: number; swatch?: string };
export const configGroups: { id: string; title: string; options: Opt[]; only?: "interior" | "concealed" }[] = [
  { id: "system", title: "Система", options: [{ id: "swing", label: "Розпашні", add: 0 }, { id: "slide", label: "Розсувні", add: 4200 }, { id: "pivot", label: "Маятникові", add: 6800 }] },
  { id: "side", title: "Відкривання", options: [{ id: "left", label: "Ліве", add: 0 }, { id: "right", label: "Праве", add: 0 }] },
  { id: "finish", title: "Оздоблення", options: [
    { id: "paint", label: "Під фарбування", add: 0, swatch: "#e9e4dc" },
    { id: "oak", label: "Шпон дуб", add: 3600, swatch: "#b88a5a" },
    { id: "walnut", label: "Шпон горіх", add: 4800, swatch: "#6b4429" },
    { id: "white", label: "Емаль біла", add: 2900, swatch: "#f4f2ee" },
    { id: "graphite", label: "Емаль графіт", add: 3100, swatch: "#2a2928" },
    { id: "sage", label: "Емаль шавлія", add: 3100, swatch: "#8ea392" },
  ] },
  { id: "handle", title: "Ручка", options: [{ id: "black", label: "Чорна", add: 0, swatch: "#151413" }, { id: "bronze", label: "Бронза", add: 900, swatch: "#b07a45" }, { id: "chrome", label: "Хром", add: 700, swatch: "#d6d3ce" }] },
  { id: "lock", title: "Замок", options: [{ id: "mech", label: "Механічний", add: 0 }, { id: "magnet", label: "Магнітний", add: 1400 }, { id: "smart", label: "Смарт-замок", add: 7900 }] },
  { id: "glass", title: "Скло", only: "interior", options: [{ id: "none", label: "Без скла", add: 0 }, { id: "strip", label: "Смуга", add: 1800 }, { id: "full", label: "Велике", add: 3400 }] },
  { id: "casing", title: "Наличник", only: "interior", options: [{ id: "flat", label: "Плаский", add: 0 }, { id: "profile", label: "Профільний", add: 1600 }] },
];
