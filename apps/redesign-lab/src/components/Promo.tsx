import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePromotions, useApi, type Activity } from "../lib/api";

const ease = [0.16, 1, 0.3, 1] as const;

/** Offer popup: shows after 55% scroll depth or on exit intent, once per session. */
export function PromoPopup() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const { promos, unavailable } = usePromotions();
  // Admin-configured popup; demo offer only while the promotions API isn't deployed. No popup configured → none shown.
  const cfg = promos?.popup
    ? { title: promos.popup.title, subtitle: promos.popup.subtitle, code: promos.popup.code, image: promos.popup.imageUrl }
    : unavailable ? { title: "−10% на перше замовлення", subtitle: null, code: "HAMMER10", image: null } : null;
  const enabled = !!cfg;
  useEffect(() => {
    if (!enabled) return;
    let seen = false;
    try { seen = sessionStorage.getItem("hg-promo") === "1"; } catch { /* storage unavailable */ }
    (window as any).__openPromo = () => setOpen(true); // dev helper to preview the popup
    if (seen) return;
    const show = () => {
      if (seen) return;
      seen = true;
      try { sessionStorage.setItem("hg-promo", "1"); } catch { /* ignore */ }
      setOpen(true);
    };
    const onScroll = () => {
      const p = window.scrollY / (document.documentElement.scrollHeight - innerHeight);
      if (p > 0.55) show();
    };
    const onLeave = (e: MouseEvent) => { if (e.clientY < 8) show(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onLeave);
    return () => { window.removeEventListener("scroll", onScroll); document.removeEventListener("mouseout", onLeave); };
  }, [enabled]);
  if (!cfg) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="promo-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { delay: 0.3 } }} onClick={() => setOpen(false)}>
          <motion.div
            className="promo"
            onClick={(e) => e.stopPropagation()}
            initial={{ rotateY: -95, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1, transition: { duration: 1.1, ease } }}
            exit={{ rotateY: -95, opacity: 0, transition: { duration: 0.6, ease: [0.7, 0, 0.84, 0] } }}
            style={{ transformOrigin: "left center", transformPerspective: 1400 }}
          >
            <div className="promo-img"><img src={cfg.image ?? "/img/oak-flush.jpg"} alt="" /></div>
            <div className="promo-body">
              <button className="promo-x" onClick={() => setOpen(false)} aria-label="Закрити">✕</button>
              <motion.p className="mono eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}>( Лише для вас )</motion.p>
              <motion.h3 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.6, duration: 0.8, ease } }}>
                {cfg.title}{cfg.subtitle && <><br /><i className="serif">{cfg.subtitle}</i></>}
              </motion.h3>
              <AnimatePresence mode="wait">
                {!sent ? (
                  <motion.form key="f" className="promo-form" exit={{ opacity: 0, y: -10 }} onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                    <p>Залиште номер — менеджер зафіксує знижку та прорахує ваш проєкт.</p>
                    <input type="tel" placeholder="+380 __ ___ __ __" required />
                    <button className="pill pill--signal" type="submit">Отримати знижку →</button>
                  </motion.form>
                ) : (
                  <motion.div key="ok" className="promo-ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    {cfg.code && <span className="promo-code">{cfg.code}</span>}
                    <p>Код збережено. Ми зателефонуємо протягом робочого дня.</p>
                    <p className="mono" style={{ opacity: 0.5 }}>(прототип — нічого не надсилається)</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} хв тому` : m < 1440 ? `${Math.round(m / 60)} год тому` : `${Math.round(m / 1440)} дн тому`;
};

/** Real recent quote requests (product + time only). Hidden when there are none or the API isn't deployed. */
export function ActivityToasts() {
  const { data } = useApi<Activity[]>("/api/activity/recent?limit=5");
  const list = data ?? [];
  const [i, setI] = useState(-1);
  useEffect(() => {
    if (!list.length) return;
    let n = 0;
    const first = setTimeout(() => setI(0), 9000);
    const t = setInterval(() => { n = (n + 1) % list.length; setI(-1); setTimeout(() => setI(n), 600); }, 11000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [list.length]);
  const q = i >= 0 ? list[i] : null;
  return (
    <div className="toasts">
      <AnimatePresence>
        {q && (
          <motion.div key={i} className="toast" initial={{ x: -40, opacity: 0, filter: "blur(8px)" }} animate={{ x: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.7, ease } }} exit={{ x: -40, opacity: 0, transition: { duration: 0.4 } }}>
            <span className="toast-dot" />
            <div>
              <p className="mono toast-k">Новий прорахунок</p>
              <p className="toast-v">{q.productName}</p>
            </div>
            <span className="mono toast-t">{ago(q.createdAt)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
