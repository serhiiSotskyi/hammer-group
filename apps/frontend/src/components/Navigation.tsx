import { useState, useEffect } from "react";
import { Menu, X, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom"; // ✅ React Router
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';
import { Button } from "@/components/ui/button";
import logo from "@/assets/HammerB.svg";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: t('nav.home'), to: "/" },
    { name: t('nav.interior'), to: "/interior-doors" },
    { name: t('nav.concealed'), to: "/concealed-doors" },
    { name: t('nav.furniture'), to: "/cabinet-furniture" },
    { name: t('nav.about'), to: "/about" },
    { name: t('nav.contact'), to: "/contact" }
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "glass-card shadow-[var(--shadow-card)]" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={logo}
              alt="Hammer Group"
              className="h-8 w-8 md:h-10 md:w-10 object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-2xl font-playfair font-bold text-primary tracking-tight group-hover:text-accent transition-colors">
              Hammer Group
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.to}
                className="text-foreground hover:text-accent transition-colors duration-300 font-medium"
              >
                {item.name}
              </Link>
            ))}
            <LanguageToggle />
          </div>

          {/* Contact Info & CTA */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                {/* <Phone className="w-4 h-4" />
                <span>+380 (44) 123-45-67</span> */}
              </div>
        
            </div>
            
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.to}
                  className="text-foreground hover:text-accent transition-colors duration-300 font-medium py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <LanguageToggle />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
