import { Award, Users, Ruler, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import factoryImage from '@/assets/factory-workshop.jpg';

const AboutSection = () => {
  const { t } = useTranslation();
  const features = [
    { icon: Building2, title: t('about.features.own.title'), description: t('about.features.own.desc') },
    { icon: Users, title: t('about.features.team.title'), description: t('about.features.team.desc') },
    { icon: Ruler, title: t('about.features.sizes.title'), description: t('about.features.sizes.desc') },
    { icon: Award, title: t('about.features.projects.title'), description: t('about.features.projects.desc') },
  ];

  return (
    <section id="about" className="py-20 bg-gradient-to-b from-secondary/30 to-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary mb-6">{t('about.title')}</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{t('about.lead')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
          <div className="space-y-8">
            <div>
              <h3 className="text-3xl font-playfair font-semibold text-primary mb-4">{t('about.h3')}</h3>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">{t('about.p1')}</p>
              <p className="text-lg text-muted-foreground leading-relaxed">{t('about.p2')}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">5,000+</div>
                <div className="text-muted-foreground">{t('about.badges.projects')}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">2017</div>
                <div className="text-muted-foreground">{t('about.badges.founded')}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">In‑House</div>
                <div className="text-muted-foreground">{t('about.badges.manufacturing')}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">To‑Size</div>
                <div className="text-muted-foreground">{t('about.badges.tosize')}</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl shadow-[var(--shadow-premium)]">
              <img 
                src={factoryImage} 
                alt="Hammer Group Factory" 
                className="w-full h-96 object-cover transition-transform duration-700 hover:scale-110"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-accent text-accent-foreground p-6 rounded-xl shadow-lg">
              <div className="text-2xl font-bold">{t('about.badges.since')}</div>
              <div className="text-sm">{t('about.badges.own')}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="text-center h-full transition-all duration-300 hover:shadow-[var(--shadow-card)]">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-accent" />
                </div>
                <h4 className="text-xl font-playfair font-semibold text-primary mb-3">
                  {feature.title}
                </h4>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
