import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CabinetFurnitureForm from "@/components/CabinetFurnitureForm";
import luxuryDoor from "@/assets/luxury-door.jpg";
import { useQuery } from "@tanstack/react-query";
import { resolveImageUrl } from "@/services/api";
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

type PortfolioProjectType = "DOORS" | "FURNITURE";
type PortfolioItem = { id: number; name: string; coverUrl: string; albumUrls: string[]; projectType: PortfolioProjectType };

import { API_ORIGIN } from "@/services/api";

async function fetchPortfolio() {
  const res = await fetch(`${API_ORIGIN}/api/furniture/portfolio`);
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
  const [activeFilter, setActiveFilter] = useState<"ALL" | PortfolioProjectType>("ALL");
  const filteredPortfolio = (portfolio ?? []).filter((item) => activeFilter === "ALL" || item.projectType === activeFilter);
  const categoryLabel = (projectType: PortfolioProjectType) => projectType === "DOORS" ? "Двері" : "Меблі";

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
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary">Портфоліо реалізованих проєктів</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">Двері</Badge>
            <Badge variant="secondary">Меблі</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={activeFilter === "ALL" ? "default" : "outline"} onClick={() => setActiveFilter("ALL")}>
            Усі
          </Button>
          <Button type="button" variant={activeFilter === "DOORS" ? "default" : "outline"} onClick={() => setActiveFilter("DOORS")}>
            Двері
          </Button>
          <Button type="button" variant={activeFilter === "FURNITURE" ? "default" : "outline"} onClick={() => setActiveFilter("FURNITURE")}>
            Меблі
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {isLoading && <p>{t('customizer.updating')}</p>}
        {error && <p className="text-red-500">Не вдалося завантажити</p>}
        {!isLoading && !error && filteredPortfolio.length === 0 && <p className="text-muted-foreground">У цій категорії поки немає проєктів.</p>}
        {filteredPortfolio.map((project) => (
          <Card
            key={project.id}
            className="overflow-hidden group cursor-pointer hover:shadow-xl transition"
            onClick={() => { setActive(project); setOpen(true); }}
          >
            <div className="relative">
              <img
                src={resolveImageUrl((project as any).coverUrl || (project as any).imageUrl) || luxuryDoor}
                alt={project.name}
                className="w-full aspect-[4/3] object-cover transform group-hover:scale-105 transition"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = luxuryDoor;
                }}
              />
              <div className="absolute left-4 top-4">
                <Badge className="bg-background/90 text-foreground">{categoryLabel(project.projectType)}</Badge>
              </div>
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
