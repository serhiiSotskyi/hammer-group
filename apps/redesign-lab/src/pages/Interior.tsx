import { useParams } from "react-router-dom";
import { PageHero, ProductGrid, StackCards, NextPage } from "../components/Page";
import { VelocityMarquee } from "../components/Sections";
import { TLink } from "../lib/nav";
import { Reveal } from "../lib/motion";
import { catalog } from "../lib/data";
import { useApi, productsUrl, toCard, img, customizerPath, type ApiCollection, type ApiProduct } from "../lib/api";

const services = [
  { n: "01", title: "Під розмір", text: "Виготовляємо полотна під фактичний отвір — стандартні й нестандартні висоти, ширини та товщини стін.", image: "/img/classic-oak.jpg" },
  { n: "02", title: "Матеріали та фурнітура", text: "Шпон, емаль, масив, скло. Петлі, замки й ручки, які підходять саме вашій моделі.", image: "/img/oak-warm.jpg" },
  { n: "03", title: "Замір і прорахунок", text: "Приїжджаємо на замір, допомагаємо з вибором і готуємо прорахунок перед запуском у виробництво.", image: "/img/white-living.jpg" },
];

/** /interior-doors — Classic vs Modern split panels that expand on hover. */
export function InteriorPage() {
  const cols = useApi<ApiCollection[]>("/api/collections?categorySlug=interior");
  const all = useApi<ApiProduct[]>(productsUrl({ categorySlug: "interior" }));
  const count = (slug: string) => all.data?.filter((p) => p.collection?.slug === slug).length;
  const list = cols.data ?? (["classic", "modern"] as const).map((k, i) => ({ id: i, slug: k, name: catalog[k].title, imageUrl: null }));
  return (
    <>
      <PageHero index="01" crumbs={["Головна", "Міжкімнатні двері"]} title="Міжкімнатні" accent="двері на замовлення"
        lead="Дві колекції — класика й модерн. Обидві виготовляємо в Одесі під ваш розмір, з вашим оздобленням і фурнітурою."
        image="/img/white-living.jpg" />
      <section className="split">
        <div className="sec-head"><p className="mono eyebrow">( Оберіть колекцію )</p></div>
        <div className="split-row">
          {list.map((c, i) => {
            const local = catalog[c.slug] ?? catalog.modern;
            return (
              <TLink key={c.slug} to={`/interior-doors/${c.slug}`} className="split-panel" cursor="Відкрити">
                <img src={c.imageUrl ? img(c.imageUrl) : local.image} alt={c.name} loading="lazy" />
                <span className="split-shade" />
                <span className="mono split-n">0{i + 1} / 0{list.length}</span>
                <span className="split-title">{c.name}</span>
                <span className="split-accent serif">{local.accent}</span>
                <span className="mono split-count">{count(c.slug) ?? "…"} моделей →</span>
              </TLink>
            );
          })}
        </div>
      </section>
      <VelocityMarquee text="Шпон · Емаль · Масив · Скло · Під фарбування" />
      <StackCards eyebrow="( Як ми працюємо )" title={<>Двері під ваш <i className="serif">проєкт</i></>} items={services} />
      <NextPage to="/concealed-doors" image="/img/corridor.jpg" />
    </>
  );
}

/** /interior-doors/:collection — live products from the backend. */
export function CollectionPage() {
  const { collection = "modern" } = useParams();
  const c = catalog[collection] ?? catalog.modern;
  const cols = useApi<ApiCollection[]>("/api/collections?categorySlug=interior");
  const meta = cols.data?.find((x) => x.slug === collection);
  const res = useApi<ApiProduct[]>(productsUrl({ categorySlug: "interior", collection }));
  const other = cols.data?.find((x) => x.slug !== collection);
  return (
    <>
      <PageHero key={collection} index={collection === "classic" ? "01.1" : "01.2"} crumbs={["Головна", "Міжкімнатні", meta?.name ?? c.title]}
        title={meta?.name ?? c.title} accent={c.accent} lead={c.lead} image={meta?.imageUrl ? img(meta.imageUrl) : c.image} />
      <ProductGrid key={`g-${collection}`} products={(res.data ?? []).map(toCard)} loading={res.loading} error={res.error}
        to={(p) => customizerPath(p, "interior")} />
      <section className="note-band">
        <Reveal as="p" className="note-big">Не знайшли свою модель? <i className="serif">Зробимо за ескізом.</i></Reveal>
        <TLink to="/contact" className="pill pill--signal">Надіслати ескіз <span>→</span></TLink>
      </section>
      <NextPage to={`/interior-doors/${other?.slug ?? (collection === "classic" ? "modern" : "classic")}`} image={other?.imageUrl ? img(other.imageUrl) : catalog[collection === "classic" ? "modern" : "classic"].image} />
    </>
  );
}
