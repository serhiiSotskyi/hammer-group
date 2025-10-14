import { Instagram, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const { t } = useTranslation();

  const year = new Date().getFullYear();
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-[var(--gradient-wood)] rounded-lg flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-xl">H</span>
              </div>
              <span className="text-2xl font-playfair font-bold">Hammer Group</span>
            </div>
            <p className="text-primary-foreground/80 leading-relaxed">{t('footer.brand')}</p>
            <div className="flex space-x-4">
              <Button asChild variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-accent hover:bg-accent/10">
                <a
                  href="https://www.instagram.com/hammergroupua/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Hammer Group Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.quick')}</h4>
            <ul className="space-y-2">
              {[
                { label: t('nav.home'), to: '/' },
                { label: t('footer.collections'), to: '/#collections' },
                { label: t('nav.about'), to: '/about' },
                { label: t('nav.contact'), to: '/contact' },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-primary-foreground/80 hover:text-accent transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.products')}</h4>
            <ul className="space-y-2">
              {[
                { label: t('nav.interior'), to: '/interior-doors' },
                { label: t('nav.concealed'), to: '/concealed-doors' },
                { label: t('nav.furniture'), to: '/cabinet-furniture' },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-primary-foreground/80 hover:text-accent transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.contact')}</h4>
            <div className="space-y-2 text-primary-foreground/80">
              <p>{t('footer.address')}</p>
              <p>{t('footer.city')}</p>
              <p className="pt-2">
                <a href="tel:+380441234567" className="hover:text-accent transition-colors">
                  +380 (44) 123-45-67
                </a>
              </p>
              <p>
                <a href="mailto:info@hammergroup.ua" className="hover:text-accent transition-colors">
                  info@hammergroup.ua
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-primary-foreground/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-primary-foreground/60 text-sm mb-4 md:mb-0">
              © {year} Hammer Group. {t('footer.rights')} | {t('footer.privacy')} | {t('footer.terms')} | {t('footer.websiteBy')}{" "}
              <a
                href="https://www.linkedin.com/in/sotskyis/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-accent"
              >
                Serhii Sotskyi
              </a>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={scrollToTop}
              className="text-primary-foreground/80 hover:text-accent hover:bg-accent/10"
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              {t('footer.backTop')}
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
