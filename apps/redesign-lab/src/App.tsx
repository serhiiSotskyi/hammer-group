import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSmoothScroll, refreshScroll } from "./lib/motion";
import { DoorTransition, applySeo, normalizePath } from "./lib/nav";
import { Loader, Cursor, Ticker, Nav } from "./components/Chrome";
import Hero from "./components/Hero";
import { VelocityMarquee, Collections, TopSales, DealOfWeek, Stats, Craft, Contact } from "./components/Sections";
import { PromoPopup, ActivityToasts } from "./components/Promo";
import { InteriorPage, CollectionPage } from "./pages/Interior";
import { ConcealedPage } from "./pages/Concealed";
import { CustomizerPage } from "./pages/Customizer";
import { FurniturePage } from "./pages/Furniture";
import { AboutPage } from "./pages/About";
import { ContactPage } from "./pages/Contact";

function Home() {
  return (
    <>
      <Hero />
      <VelocityMarquee text="Міжкімнатні · Приховані · Корпусні меблі · Розсувні системи" />
      <Collections />
      <TopSales />
      <DealOfWeek />
      <Stats />
      <Craft />
    </>
  );
}

function Shell({ ready }: { ready: boolean }) {
  const { pathname } = useLocation();
  const isCustomizer = pathname.includes("customizer");
  useEffect(() => {
    applySeo(pathname);
    const t = setTimeout(refreshScroll, 400);
    return () => clearTimeout(t);
  }, [pathname]);
  return (
    <>
      <Ticker />
      <Nav />
      <main key={pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/interior-doors" element={<InteriorPage />} />
          <Route path="/interior-doors/:collection" element={<CollectionPage />} />
          <Route path="/concealed-doors" element={<ConcealedPage />} />
          <Route path="/customizer" element={<CustomizerPage kind="interior" />} />
          <Route path="/concealed-customizer" element={<CustomizerPage kind="concealed" />} />
          <Route path="/cabinet-furniture" element={<FurniturePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          {/* Live-site /doors was a doors overview canonicalised to /interior-doors/. */}
          <Route path="/doors" element={<Navigate to="/interior-doors" replace />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Contact key={`f-${pathname}`} showCta={normalizePath(pathname) !== "/contact" && !isCustomizer} />
      {ready && <PromoPopup />}
      {ready && <ActivityToasts />}
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  useSmoothScroll();
  const done = useCallback(() => setReady(true), []);
  useEffect(() => {
    const r = refreshScroll;
    document.fonts?.ready.then(r);
    window.addEventListener("load", r);
    // Sections that load from the API (deal of the week, top sales, grids) change the page height
    // after the first measure; re-measure so pinned sections (craft, rail) start in the right place.
    let t: ReturnType<typeof setTimeout> | undefined;
    let lastH = 0;
    const ro = new ResizeObserver(() => {
      const h = document.body.scrollHeight;
      if (Math.abs(h - lastH) < 2) return;
      lastH = h;
      clearTimeout(t);
      t = setTimeout(r, 200);
    });
    ro.observe(document.body);
    return () => { window.removeEventListener("load", r); ro.disconnect(); clearTimeout(t); };
  }, []);
  return (
    <BrowserRouter>
      <DoorTransition ready={ready}>
        <Loader onDone={done} />
        <Cursor />
        <div className="grain" aria-hidden />
        <Shell ready={ready} />
      </DoorTransition>
    </BrowserRouter>
  );
}
