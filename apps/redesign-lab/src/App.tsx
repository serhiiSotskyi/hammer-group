import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useSmoothScroll, ScrollTrigger } from "./lib/motion";
import { DoorTransition, PAGE_NAMES } from "./lib/nav";
import { Loader, Cursor, Ticker, Nav } from "./components/Chrome";
import Hero from "./components/Hero";
import { VelocityMarquee, Statement, Collections, TopSales, DealOfWeek, Stats, Craft, Contact } from "./components/Sections";
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
      <Statement />
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
    document.title = `${PAGE_NAMES[pathname] ?? "Hammer Group"} — Hammer Group · Лабораторія редизайну`;
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);
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
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Contact key={`f-${pathname}`} showCta={pathname !== "/contact" && !isCustomizer} />
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
    const r = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(r);
    window.addEventListener("load", r);
    return () => window.removeEventListener("load", r);
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
