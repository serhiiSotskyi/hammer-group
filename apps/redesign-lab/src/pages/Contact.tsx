import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PageHero } from "../components/Page";
import { Magnetic } from "../lib/motion";
import { CONTACT } from "../lib/data";

/** Form with floating labels and topic chips. Prototype: does not send anything. */
export function QuoteForm({ topic = "Двері" }: { topic?: string }) {
  const topics = ["Міжкімнатні", "Приховані", "Меблі", "Інше"];
  const [t, setT] = useState(topic === "Меблі" ? "Меблі" : "Міжкімнатні");
  const [sent, setSent] = useState(false);
  return (
    <AnimatePresence mode="wait">
      {!sent ? (
        <motion.form key="f" className="qf" exit={{ opacity: 0, y: -20 }} onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          <div className="qf-topics">
            {topics.map((x) => (
              <button type="button" key={x} className={`chip-btn ${t === x ? "is-on" : ""}`} onClick={() => setT(x)}>
                {t === x && <motion.span layoutId={`qf-pill-${topic}`} className="chip-pill" />}
                <span>{x}</span>
              </button>
            ))}
          </div>
          <label className="fl"><input placeholder=" " required /><span>Ім’я *</span><i /></label>
          <label className="fl"><input type="tel" placeholder=" " required /><span>Телефон *</span><i /></label>
          <label className="fl"><input type="email" placeholder=" " /><span>Email</span><i /></label>
          <label className="fl fl--area"><textarea placeholder=" " rows={3} /><span>Розміри, матеріали, терміни…</span><i /></label>
          <Magnetic><button className="pill pill--signal qf-send" type="submit">Надіслати запит <span>→</span></button></Magnetic>
        </motion.form>
      ) : (
        <motion.div key="ok" className="qf-ok" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}>
          <span className="qf-check">✓</span>
          <h3>Запит прийнято</h3>
          <p>Менеджер зв’яжеться з вами найближчим часом.<br /><span className="muted mono">(прототип — нічого не надсилається)</span></p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Phone number whose digits jump on hover. */
function WavePhone() {
  return (
    <a className="wave" href={`tel:${CONTACT.tel}`} data-cursor="Дзвонити">
      {[...CONTACT.phone].map((c, i) => <span key={i} style={{ transitionDelay: `${i * 18}ms` }}>{c === " " ? " " : c}</span>)}
    </a>
  );
}

export function ContactPage() {
  return (
    <>
      <PageHero index="05" crumbs={["Головна", "Контакти"]} title="Створімо" accent="ваші ідеальні двері"
        lead="Безкоштовна консультація з дизайнером. Залиште запит — прорахуємо проєкт за 24 години." image="/img/oak-warm.jpg" />
      <section className="ct">
        <div className="ct-info">
          <p className="mono eyebrow">( Телефон )</p>
          <WavePhone />
          <div className="ct-grid">
            <div><p className="mono eyebrow">Email</p><a className="u-link ct-big" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div>
            <div><p className="mono eyebrow">Шоурум</p><p className="ct-big">{CONTACT.street}<br />{CONTACT.city}</p><p className="muted">За попереднім записом</p></div>
            <div><p className="mono eyebrow">Соцмережі</p><a className="u-link ct-big" href={CONTACT.instagram} target="_blank" rel="noreferrer">Instagram ↗</a></div>
          </div>
          <a className="map" href="https://www.google.com/maps/search/?api=1&query=Одеса+вул.+Краснова+12А" target="_blank" rel="noreferrer" data-cursor="Маршрут">
            <svg viewBox="0 0 400 220" aria-hidden>
              {Array.from({ length: 14 }, (_, i) => <line key={`h${i}`} x1="0" x2="400" y1={i * 17} y2={i * 17 + 30} />)}
              {Array.from({ length: 18 }, (_, i) => <line key={`v${i}`} y1="0" y2="220" x1={i * 24} x2={i * 24 - 40} />)}
              <path d="M0 170 C 90 150, 140 190, 230 160 S 360 120, 400 140 L400 220 L0 220Z" className="map-sea" />
            </svg>
            <span className="map-pin"><i /></span>
            <span className="mono map-label">{CONTACT.street} · Відкрити в Google Maps ↗</span>
          </a>
        </div>
        <div className="ct-form">
          <p className="mono eyebrow">( Запит на прорахунок )</p>
          <QuoteForm />
        </div>
      </section>
    </>
  );
}
