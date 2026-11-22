import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PageHero } from "../components/Page";
import { Magnetic } from "../lib/motion";
import { CONTACT } from "../lib/data";
import { FormError, PHONE_HINT, phoneOk, submitFurnitureInquiry, submitGeneralInquiry } from "../lib/api";

/**
 * Request form with floating labels and topic chips.
 * "Меблі" goes to POST /api/contact/furniture (furniture inbox in the admin); other topics to /api/contact/general.
 */
export function QuoteForm({ topic = "Двері" }: { topic?: string }) {
  const topics = ["Міжкімнатні", "Приховані", "Меблі", "Інше"];
  const [t, setT] = useState(topic === "Меблі" ? "Меблі" : "Міжкімнатні");
  const [f, setF] = useState({ name: "", phone: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const field = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF((s) => ({ ...s, [k]: e.target.value })); setError(""); },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    const name = f.name.trim(), phone = f.phone.trim(), email = f.email.trim();
    if (!name) return setError("Вкажіть, будь ласка, ім’я.");
    if (!phoneOk(phone)) return setError(PHONE_HINT);
    const message = [`Тема: ${t}`, f.message.trim()].filter(Boolean).join("\n");
    setStatus("sending");
    setError("");
    try {
      if (t === "Меблі") await submitFurnitureInquiry({ name, phone, email, message });
      else await submitGeneralInquiry({ name, phone, email, message });
      setStatus("sent");
    } catch (err) {
      setError(err instanceof FormError ? err.message : "Не вдалося надіслати запит. Спробуйте ще раз.");
      setStatus("idle");
    }
  };

  const sending = status === "sending";
  return (
    <AnimatePresence mode="wait">
      {status !== "sent" ? (
        <motion.form key="f" className="qf" exit={{ opacity: 0, y: -20 }} onSubmit={submit} noValidate>
          <div className="qf-topics">
            {topics.map((x) => (
              <button type="button" key={x} className={`chip-btn ${t === x ? "is-on" : ""}`} onClick={() => setT(x)}>
                {t === x && <motion.span layoutId={`qf-pill-${topic}`} className="chip-pill" />}
                <span>{x}</span>
              </button>
            ))}
          </div>
          <label className="fl"><input placeholder=" " required autoComplete="name" maxLength={120} {...field("name")} /><span>Ім’я *</span><i /></label>
          <label className="fl"><input type="tel" placeholder=" " required autoComplete="tel" inputMode="tel" maxLength={40} {...field("phone")} /><span>Телефон *</span><i /></label>
          <label className="fl"><input type="email" placeholder=" " autoComplete="email" maxLength={160} {...field("email")} /><span>Email</span><i /></label>
          <label className="fl fl--area"><textarea placeholder=" " rows={3} maxLength={4000} {...field("message")} /><span>Розміри, матеріали, терміни…</span><i /></label>
          {error && <p className="form-err" role="alert">{error}</p>}
          <Magnetic><button className="pill pill--signal qf-send" type="submit" disabled={sending}>{sending ? "Надсилаємо…" : <>Надіслати запит <span>→</span></>}</button></Magnetic>
        </motion.form>
      ) : (
        <motion.div key="ok" className="qf-ok" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} role="status">
          <span className="qf-check">✓</span>
          <h3>Запит прийнято</h3>
          <p>Дякуємо, {f.name.trim()}! Менеджер зателефонує на {f.phone.trim()} найближчим часом.</p>
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
