import { useState } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import classicDoor from '@/assets/interiorCollection.png';
import modernDoor from '@/assets/conclealedCollection.png';
import luxuryDoor from '@/assets/furniture-collection.png';

const CollectionsSection = () => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const { t } = useTranslation();

  const collections = [
    {
      id: 1,
      title: t('collections.cards.interior.title'),
      description: t('collections.cards.interior.description'),
      image: classicDoor,
      features: t('collections.cards.interior.features', { returnObjects: true }) as string[],
      // price: t('collections.cards.interior.price'),
      bestseller: false,
      to: '/interior-doors',
    },
    {
      id: 2,
      title: t('collections.cards.concealed.title'), 
      description: t('collections.cards.concealed.description'),
      image: modernDoor,
      features: t('collections.cards.concealed.features', { returnObjects: true }) as string[],
      // price: t('collections.cards.concealed.price'),
      bestseller: false,
      to: '/concealed-doors',
    },
    {
      id: 3,
      title: t('collections.cards.furniture.title'),
      description: t('collections.cards.furniture.description'),
      image: luxuryDoor,
      features: t('collections.cards.furniture.features', { returnObjects: true }) as string[],
      // price: t('collections.cards.furniture.price'),
      bestseller: false,
      to: '/cabinet-furniture',
    }
  ];

  return (
    <section id="collections" className="py-20 bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 section-reveal in-view">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary mb-6">
            {t('collections.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('collections.blurb')}
          </p>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {collections.map((collection, index) => (
            <Link key={collection.id} to={collection.to} className="block h-full">
              <Card 
                className={`door-card cursor-pointer h-full overflow-hidden transition-all duration-500 ${
                  hoveredCard === index ? 'scale-105' : ''
                }`}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="relative">
                  {collection.bestseller && (
                    <div className="absolute top-4 left-4 z-10 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" />
                      Bestseller
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <img 
                      src={collection.image} 
                      alt={collection.title}
                      className={`w-full h-80 object-cover transition-transform duration-700 ${
                        hoveredCard === index ? 'scale-110' : 'scale-100'
                      }`}
                    />
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <h3 className="text-2xl font-playfair font-semibold text-primary mb-3">
                    {collection.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {collection.description}
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    {collection.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full mr-3"></div>
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">{collection.price}</span>
                  </div> */}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>


        {/* will be added in future */}
        {/* <div className="text-center">
          <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-4 rounded-xl">
            View All Collections
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div> */}
      </div>
    </section>
  );
};

export default CollectionsSection;
