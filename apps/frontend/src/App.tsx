import { Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";

import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import DoorsPage from "./pages/DoorsPage";
import ContactPage from "./pages/ContactPage";
import CustomizerPage from "./pages/CustomizerPage";
import InteriorDoorsPage from "./pages/InteriorDoorsPage";
import ConcealedDoorsPage from "./pages/ConcealedDoorsPage";
import CabinetFurniturePage from "./pages/CabinetFurniturePage";

import AdminLayout from "./pages/admin/AdminLayout";
import InteriorDoorsAdmin from "./pages/admin/InteriorDoorsAdmin";
// import ConcealedDoorsAdmin from "./pages/admin/ConcealedDoorsAdmin";
// import FurnitureAdmin from "./pages/admin/FurnitureAdmin";
// import QuotesAdmin from "./pages/admin/QuotesAdmin";




function App() {
  return (
    <div className="min-h-screen">
      {/* ✅ Navigation always visible */}
      <Navigation />

      {/* ✅ Page content */}
      <div className="pt-20"> 
        {/* add padding so content isn't hidden under fixed navbar */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/doors" element={<DoorsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/customizer" element={<CustomizerPage />} />
          <Route path="/interior-doors" element={<InteriorDoorsPage />} />
          <Route path="/concealed-doors" element={<ConcealedDoorsPage />} />
          <Route path="/cabinet-furniture" element={<CabinetFurniturePage />} />
          
          <Route path="/admin" element={<AdminLayout />}>
              <Route path="interior-doors" element={<InteriorDoorsAdmin />} />
              {/* <Route path="concealed-doors" element={<ConcealedDoorsAdmin />} />
              <Route path="furniture" element={<FurnitureAdmin />} />
              <Route path="quotes" element={<QuotesAdmin />} /> */}
            </Route>

        </Routes>
      </div>
      {/* ✅ Footer always visible */}
      <Footer />
    </div>
  );
}

export default App;
