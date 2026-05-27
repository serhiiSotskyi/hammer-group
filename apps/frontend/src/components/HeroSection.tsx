import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import heroImage from '@/assets/hero-entryway-light.jpg';

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();
  const heroTitle = t('hero.title1');
  const isBrandTitle = heroTitle.trim().toLowerCase() === 'hammer group';

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section id="home" className="relative min-h-screen flex items-start md:items-center justify-center overflow-hidden pt-24 pb-16 md:py-0">
      {/* Background Image */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 hero-scrim z-10"></div>
        <img 
          src={heroImage} 
          alt="Premium Custom Door" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className={`hero-copy relative z-20 text-center max-w-4xl mx-auto px-6 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <h1 className={`hero-title text-4xl sm:text-5xl md:text-7xl ${isBrandTitle ? 'hero-brand-title' : 'font-playfair'} font-bold text-white mb-4 md:mb-6 uppercase leading-tight`}>
          {heroTitle}
          {/* <span className="block hero-text">{t('hero.title2')}</span> */}
        </h1>
        
        <p className="text-lg sm:text-xl md:text-2xl text-white/95 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
          {t('hero.sub')}
        </p>

        

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 text-white">
          <div>
            <div className="hero-stat-value text-3xl md:text-4xl font-bold mb-1 md:mb-2">2017</div>
            <div className="hero-stat-label">{t('hero.stats.founded')}</div>
          </div>
          <div>
            <div className="hero-stat-value text-3xl md:text-4xl font-bold mb-1 md:mb-2">5,000+</div>
            <div className="hero-stat-label">{t('hero.stats.projects')}</div>
          </div>
          <div>
            <div className="hero-stat-value text-3xl md:text-4xl font-bold mb-1 md:mb-2">Власне</div>
            <div className="hero-stat-label">{t('hero.stats.manufacturing')}</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="animate-bounce">
          <ChevronDown className="w-8 h-8 text-white/70" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
