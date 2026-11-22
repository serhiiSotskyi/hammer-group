-- Promotions: additive only (no table rebuilds), safe on existing data.

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "featuredRank" INTEGER;

-- CreateTable
CREATE TABLE "Promotion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'ANNOUNCEMENT',
    "value" INTEGER,
    "categoryId" INTEGER,
    "collectionId" INTEGER,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "showInTicker" BOOLEAN NOT NULL DEFAULT true,
    "isDealOfWeek" BOOLEAN NOT NULL DEFAULT false,
    "showPopup" BOOLEAN NOT NULL DEFAULT false,
    "popupCode" TEXT,
    "imageUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Promotion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Promotion_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromotionProduct" (
    "promotionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,

    PRIMARY KEY ("promotionId", "productId"),
    CONSTRAINT "PromotionProduct_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromotionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable (SQLite allows a REFERENCES clause on ADD COLUMN when the default is NULL)
ALTER TABLE "Quote" ADD COLUMN "promotionId" INTEGER REFERENCES "Promotion" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD COLUMN "discountCents" INTEGER;
ALTER TABLE "Quote" ADD COLUMN "promoCode" TEXT;

-- CreateIndex
CREATE INDEX "Promotion_isActive_startsAt_endsAt_idx" ON "Promotion"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PromotionProduct_productId_idx" ON "PromotionProduct"("productId");
