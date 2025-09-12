import { Award, Users, Clock, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import factoryImage from '@/assets/factory-workshop.jpg';

const AboutSection = () => {
  const features = [
    {
      icon: Clock,
      title: "20+ Years Experience",
      description: "Two decades of crafting premium doors with European precision"
    },
    {
      icon: Users,
      title: "Expert Craftsmen",
      description: "Skilled artisans trained in traditional and modern techniques"
    },
    {
      icon: Award,
      title: "Quality Certified",
      description: "ISO certified manufacturing with rigorous quality controls"
    },
    {
      icon: Shield,
      title: "Lifetime Warranty",
      description: "Confidence in our craftsmanship backed by comprehensive warranty"
    }
  ];

  return (
    <section id="about" className="py-20 bg-gradient-to-b from-secondary/30 to-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary mb-6">
            Crafting Excellence Since 1999
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From our state-of-the-art facility in Ukraine, we blend traditional European craftsmanship 
            with cutting-edge technology to create doors that define spaces and inspire lives.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
          <div className="space-y-8">
            <div>
              <h3 className="text-3xl font-playfair font-semibold text-primary mb-4">
                European Heritage, Modern Innovation
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Founded by master craftsmen with deep roots in European woodworking traditions, 
                Hammer Group has evolved into Ukraine's premier door manufacturer. We combine 
                time-honored techniques with state-of-the-art CNC machinery and sustainable practices.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Every door that leaves our facility is a testament to our commitment to quality, 
                durability, and aesthetic excellence. We don't just make doors; we create the 
                entrance to your dreams.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">10,000+</div>
                <div className="text-muted-foreground">Doors Delivered</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">50+</div>
                <div className="text-muted-foreground">Countries Served</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">98%</div>
                <div className="text-muted-foreground">Client Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">24/7</div>
                <div className="text-muted-foreground">Support Service</div>
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
              <div className="text-2xl font-bold">ISO 9001</div>
              <div className="text-sm">Certified Quality</div>
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