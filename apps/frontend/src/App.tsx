import { Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import SEO from "./components/SEO";

import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import DoorsPage from "./pages/DoorsPage";
import ContactPage from "./pages/ContactPage";
import CustomizerPage from "./pages/CustomizerPage";
import InteriorDoorsPage from "./pages/InteriorDoorsPage";
import InteriorCollectionsPage from "./pages/InteriorCollectionsPage";
import InteriorCollectionListPage from "./pages/InteriorCollectionListPage";
import ConcealedDoorsPage from "./pages/ConcealedDoorsPage";
import ConcealedCustomizerPage from "./pages/ConcealedCustomizerPage";
import CabinetFurniturePage from "./pages/CabinetFurniturePage";

import AdminLayout from "./pages/admin/AdminLayout";
import InteriorDoorsAdmin from "./pages/admin/InteriorDoorsAdmin";
import ConcealedDoorsAdmin from "./pages/admin/ConcealedDoorsAdmin";
import InteriorCollectionAdmin from "./pages/admin/InteriorCollectionAdmin";
import FurnitureAdmin from "./pages/admin/FurnitureAdmin";
import FurniturePortfolioAdminPage from "./pages/admin/FurniturePortfolioAdminPage";
import QuotesAdmin from "./pages/admin/QuotesAdmin";
import GeneralQuotesAdmin from "./pages/admin/GeneralQuotesAdmin";
import CurrenciesAdmin from "./pages/admin/CurrenciesAdmin";
import PricingAdmin from "./pages/admin/PricingAdmin";
import PricingConcealed from "./pages/admin/PricingConcealed";
import PromotionsAdmin from "./pages/admin/PromotionsAdmin";
import AdminLogin from "./pages/admin/Login";
import RequireAdmin from "@/components/admin/RequireAdmin";




// In the combined production build this app only serves /admin (built with --base=/admin-app/);
// the public site is the redesign, so hide the old public navigation and footer there.
const ADMIN_ONLY = import.meta.env.BASE_URL === "/admin-app/";

function AdminOnlyBar() {
  return (
    <div className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-6 bg-white/95 backdrop-blur border-b">
      <a href="/admin/quotes" className="font-semibold tracking-tight">Hammer Group · Адмін-панель</a>
      <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← На сайт</a>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen">
      {!ADMIN_ONLY && <SEO />}
      {ADMIN_ONLY ? <AdminOnlyBar /> : <Navigation />}

      {/* ✅ Page content */}
      <div className={ADMIN_ONLY ? "pt-14" : "pt-20"}> 
        {/* add padding so content isn't hidden under fixed navbar */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/doors" element={<DoorsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/customizer" element={<CustomizerPage />} />
          {/* Interior landing shows Classic vs Modern panels */}
          <Route path="/interior-doors" element={<InteriorCollectionsPage />} />
          <Route path="/interior-doors/:collection" element={<InteriorCollectionListPage />} />
          <Route path="/concealed-doors" element={<ConcealedDoorsPage />} />
          <Route path="/concealed-customizer" element={<ConcealedCustomizerPage />} />
          <Route path="/cabinet-furniture" element={<CabinetFurniturePage />} />
          
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route path="interior-doors" element={<InteriorDoorsAdmin />} />
              <Route path="interior-doors/:collection" element={<InteriorCollectionAdmin />} />
              <Route path="concealed-doors" element={<ConcealedDoorsAdmin />} />
              <Route path="furniture-portfolio" element={<FurniturePortfolioAdminPage />} />
              <Route path="furniture-quotes" element={<FurnitureAdmin />} />
              <Route path="quotes" element={<QuotesAdmin />} />
              <Route path="general-quotes" element={<GeneralQuotesAdmin />} />
              <Route path="currencies" element={<CurrenciesAdmin />} />
              <Route path="pricing" element={<PricingAdmin />} />
              <Route path="pricing-concealed" element={<PricingConcealed />} />
              <Route path="promotions" element={<PromotionsAdmin />} />
            </Route>

        </Routes>
      </div>
      {!ADMIN_ONLY && <Footer />}
    </div>
  );
}

export default App;
