"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

async function fetchParameters(productId: number) {
  const res = await fetch(`http://localhost:4000/api/products/${productId}/parameters`);
  if (!res.ok) throw new Error("Failed to fetch parameters");
  return res.json();
}

const InteriorCustomizer = ({ productId = 1 }: { productId?: number }) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number | null>>({});
  const { data: groups, isLoading } = useQuery({
    queryKey: ["interior-parameters", productId],
    queryFn: () => fetchParameters(productId),
  });

  if (isLoading) {
    return <p className="text-center py-10">Loading options...</p>;
  }

  const calculatePrice = () => {
    let price = 500; // base price (or fetch from product if you want)
    groups?.forEach((group: any) => {
      const selected = selectedOptions[group.id];
      if (group.type === "select" && selected) {
        const option = group.options.find((o: any) => o.id === selected);
        if (option) price += option.extraPrice;
      }
    });
    return price;
  };

  // Render a group dynamically depending on type
  const renderGroup = (group: any) => {
    if (group.type === "select") {
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{group.name}</label>
          <Select
            value={selectedOptions[group.id]?.toString() ?? ""}
            onValueChange={(val) =>
              setSelectedOptions((prev) => ({ ...prev, [group.id]: Number(val) }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${group.name}`} />
            </SelectTrigger>
            <SelectContent>
              {group.options.map((option: any) => (
                <SelectItem key={option.id} value={option.id.toString()}>
                  {option.name}
                  {option.extraPrice > 0 && ` (+€${option.extraPrice})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (group.type === "range") {
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{group.name}</label>
          <input
            type="number"
            min={group.min}
            max={group.max}
            step={group.step}
            value={selectedOptions[group.id] ?? group.min}
            onChange={(e) =>
              setSelectedOptions((prev) => ({
                ...prev,
                [group.id]: Number(e.target.value),
              }))
            }
            className="border p-2 rounded w-full"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <section id="customizer" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary mb-6">
            Interior Door Customizer
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Choose your options and get an instant price estimate
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Preview + price */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-accent" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-[3/4] bg-gradient-to-br from-secondary to-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground">3D Model Coming Soon</span>
                </div>
                <div className="mt-6 p-4 bg-primary/5 rounded-lg flex justify-between">
                  <span className="text-sm text-muted-foreground">Price:</span>
                  <Badge variant="secondary" className="bg-accent text-accent-foreground">
                    <Calculator className="w-3 h-3 mr-1" />
                    €{calculatePrice()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Options */}
          <div className="space-y-6">
            {groups?.map((group: any) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                </CardHeader>
                <CardContent>{renderGroup(group)}</CardContent>
              </Card>
            ))}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="premium-button flex-1">Add to Quote</Button>
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

export default InteriorCustomizer;
