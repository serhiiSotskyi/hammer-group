import HeroSection from "../components/HeroSection";
import ContactSection from "../components/ContactSection";
import Navigation from '@/components/Navigation';
import CollectionsSection from '@/components/CollectionsSection';
import CustomizerSection from '@/components/InteriorCustomizerSection';
import AboutSection from '@/components/AboutSection';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CollectionsSection />
      <AboutSection />
      <ContactSection />
    </>
  );
}
