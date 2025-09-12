import { useState } from 'react';
import { Palette, Settings, Eye, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CustomizerSection = () => {
  const [selectedStyle, setSelectedStyle] = useState('classic');
  const [selectedWood, setSelectedWood] = useState('oak');
  const [selectedColor, setSelectedColor] = useState('natural');
  const [selectedHandle, setSelectedHandle] = useState('brass');

  const styles = [
    { id: 'classic', name: 'Classic', price: 0 },
    { id: 'modern', name: 'Modern', price: 200 },
    { id: 'luxury', name: 'Luxury', price: 500 },
  ];

  const woods = [
    { id: 'oak', name: 'Oak', price: 0 },
    { id: 'walnut', name: 'Walnut', price: 300 },
    { id: 'cherry', name: 'Cherry', price: 250 },
  ];

  const colors = [
    { id: 'natural', name: 'Natural', hex: '#D2B48C' },
    { id: 'dark', name: 'Dark Stain', hex: '#8B4513' },
    { id: 'white', name: 'White Paint', hex: '#FFFFFF' },
    { id: 'black', name: 'Black Paint', hex: '#2C2C2C' },
  ];

  const handles = [
    { id: 'brass', name: 'Brass', price: 0 },
    { id: 'chrome', name: 'Chrome', price: 50 },
    { id: 'black', name: 'Black', price: 75 },
  ];

  const calculatePrice = () => {
    const basePrice = 899;
    const stylePrice = styles.find(s => s.id === selectedStyle)?.price || 0;
    const woodPrice = woods.find(w => w.id === selectedWood)?.price || 0;
    const handlePrice = handles.find(h => h.id === selectedHandle)?.price || 0;
    
    return basePrice + stylePrice + woodPrice + handlePrice;
  };

  return (
    <section id="customizer" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary mb-6">
            Design Your Perfect Door
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Use our advanced 3D configurator to personalise every detail and see real-time pricing
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 3D Preview */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-accent" />
                  3D Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-gradient-to-br from-secondary to-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                  {/* Simplified 3D representation */}
                  <div className="relative w-64 h-80">
                    <div 
                      className={`w-full h-full rounded-lg shadow-2xl transition-all duration-500 ${
                        selectedColor === 'natural' ? 'bg-amber-200' :
                        selectedColor === 'dark' ? 'bg-amber-900' :
                        selectedColor === 'white' ? 'bg-white' : 'bg-gray-800'
                      }`}
                      style={{
                        background: selectedStyle === 'luxury' ? 
                          `linear-gradient(45deg, ${colors.find(c => c.id === selectedColor)?.hex}, #B8860B)` :
                          colors.find(c => c.id === selectedColor)?.hex
                      }}
                    >
                      {/* Door panels */}
                      <div className="absolute inset-4 border-2 border-black/10 rounded">
                        {selectedStyle === 'classic' && (
                          <div className="absolute inset-4 border border-black/10 rounded"></div>
                        )}
                      </div>
                      
                      {/* Handle */}
                      <div 
                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-8 rounded-full ${
                          selectedHandle === 'brass' ? 'bg-yellow-600' :
                          selectedHandle === 'chrome' ? 'bg-gray-300' : 'bg-gray-800'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Configuration:</span>
                    <Badge variant="secondary" className="bg-accent text-accent-foreground">
                      <Calculator className="w-3 h-3 mr-1" />
                      €{calculatePrice().toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Options */}
          <div className="space-y-6">
            {/* Style Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-accent" />
                  Door Style
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {styles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedStyle === style.id 
                          ? 'border-accent bg-accent/10' 
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div className="font-semibold">{style.name}</div>
                      {style.price > 0 && (
                        <div className="text-sm text-muted-foreground">+€{style.price}</div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Wood Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Wood Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {woods.map((wood) => (
                    <button
                      key={wood.id}
                      onClick={() => setSelectedWood(wood.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedWood === wood.id 
                          ? 'border-accent bg-accent/10' 
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div className="font-semibold">{wood.name}</div>
                      {wood.price > 0 && (
                        <div className="text-sm text-muted-foreground">+€{wood.price}</div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Color Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-accent" />
                  Finish Color
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {colors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                        selectedColor === color.id 
                          ? 'border-accent bg-accent/10' 
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded-full border border-border"
                        style={{ backgroundColor: color.hex }}
                      ></div>
                      <span className="font-semibold">{color.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hardware Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Hardware Finish</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {handles.map((handle) => (
                    <button
                      key={handle.id}
                      onClick={() => setSelectedHandle(handle.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedHandle === handle.id 
                          ? 'border-accent bg-accent/10' 
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div className="font-semibold">{handle.name}</div>
                      {handle.price > 0 && (
                        <div className="text-sm text-muted-foreground">+€{handle.price}</div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="premium-button flex-1">
                Add to Quote
              </Button>
              <Button variant="outline" className="flex-1">
                Save Design
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomizerSection;