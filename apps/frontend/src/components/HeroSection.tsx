import { useState, useEffect } from 'react';
import { ChevronDown, Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-door.jpg';

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[var(--gradient-hero)] opacity-60 z-10"></div>
        <img 
          src={heroImage} 
          alt="Premium Custom Door" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className={`relative z-20 text-center max-w-4xl mx-auto px-6 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <h1 className="text-5xl md:text-7xl font-playfair font-bold text-white mb-6">
          Premium Doors,
          <span className="block hero-text">Designed by You</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
          Personalise every detail — see your design and price instantly with our revolutionary 3D configurator
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
          <Button className="premium-button group">
            Start Customising
            <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Button>
          
          <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 px-8 py-4 rounded-xl">
            <Play className="mr-2 w-5 h-5" />
            Watch Our Story
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
          <div>
            <div className="text-4xl font-bold mb-2">20+</div>
            <div className="text-white/80">Years of Excellence</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">10,000+</div>
            <div className="text-white/80">Doors Crafted</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">98%</div>
            <div className="text-white/80">Customer Satisfaction</div>
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