import { Facebook, Instagram, Linkedin, Youtube, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
            <p className="text-primary-foreground/80 leading-relaxed">
              Crafting premium custom doors since 1999. European heritage meets modern innovation 
              in every piece we create.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-accent hover:bg-accent/10">
                <Facebook className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-accent hover:bg-accent/10">
                <Instagram className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-accent hover:bg-accent/10">
                <Linkedin className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-accent hover:bg-accent/10">
                <Youtube className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {['Home', 'Collections', 'Customizer', 'About', 'Gallery', 'Services'].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase()}`} className="text-primary-foreground/80 hover:text-accent transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Products</h4>
            <ul className="space-y-2">
              {['Interior Doors', 'Entrance Doors', 'Sliding Systems', 'Furniture', 'Hardware', 'Accessories'].map((product) => (
                <li key={product}>
                  <a href="#" className="text-primary-foreground/80 hover:text-accent transition-colors">
                    {product}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
            <div className="space-y-2 text-primary-foreground/80">
              <p>Prospect Pobedy 125</p>
              <p>Kyiv, Ukraine 01135</p>
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
              © 2024 Hammer Group. All rights reserved. | Privacy Policy | Terms of Service
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={scrollToTop}
              className="text-primary-foreground/80 hover:text-accent hover:bg-accent/10"
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              Back to Top
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;