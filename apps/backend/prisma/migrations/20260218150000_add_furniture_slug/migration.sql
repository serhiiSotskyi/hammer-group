-- Add slug support for furniture portfolio items
ALTER TABLE "FurniturePortfolio" ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "FurniturePortfolio_slug_key" ON "FurniturePortfolio"("slug");
