import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CabinetFurnitureForm from "@/components/CabinetFurnitureForm";
import luxuryDoor from "@/assets/luxury-door.jpg";
import { useQuery } from "@tanstack/react-query";
import { resolveImageUrl } from "@/services/api";
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

type PortfolioItem = { id: number; name: string; coverUrl: string; albumUrls: string[] };

async function fetchPortfolio() {
  const res = await fetch("http://localhost:4000/api/furniture/portfolio");
  if (!res.ok) throw new Error("Failed to load portfolio");
  return res.json() as Promise<PortfolioItem[]>;
}

export default function CabinetFurniturePage() {
  const { t } = useTranslation();
  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ["f-portfolio-public"],
    queryFn: fetchPortfolio,
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<PortfolioItem | null>(null);
  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold mb-6">{t('nav.furniture')}</h1>
      <p className="text-lg text-gray-700 mb-10">{t('collections.cards.furniture.description')}</p>

      {/* Furniture Request Form (no contact info panel) */}
      <div className="bg-muted rounded-lg p-8">
        <h2 className="text-3xl font-bold mb-6">{t('contact.send')}</h2>
        <p className="text-muted-foreground mb-6">{t('contact.subtitle')}</p>
        <CabinetFurnitureForm />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{active?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <div className="flex gap-4 w-max">
              {(active ? [active.coverUrl, ...(active.albumUrls || [])] : []).map((u, idx) => (
                <img key={idx} src={resolveImageUrl(u) || luxuryDoor} alt=""
                  className="h-64 md:h-96 object-cover rounded border" />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Gallery (dynamic) */}
      <br />
      <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary mb-6">{t('collections.title')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {isLoading && <p>{t('customizer.updating')}</p>}
        {error && <p className="text-red-500">Failed to load</p>}
        {portfolio?.map((project) => (
          <Card
            key={project.id}
            className="overflow-hidden group cursor-pointer hover:shadow-xl transition"
            onClick={() => { setActive(project as unknown as PortfolioItem); setOpen(true); }}
          >
            <div className="relative">
              <img
                src={resolveImageUrl((project as any).coverUrl || (project as any).imageUrl) || luxuryDoor}
                alt={project.name}
                className="w-full h-64 object-cover transform group-hover:scale-105 transition"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = luxuryDoor;
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-lg font-semibold transition">
                {project.name}
              </div>
            </div>
          </Card>
        ))}
      </div>

      
    </div>
  );
}
