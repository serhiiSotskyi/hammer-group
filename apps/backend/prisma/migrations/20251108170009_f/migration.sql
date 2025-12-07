/*
  Warnings:

  - You are about to alter the column `delivered` on the `Inquiry` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `json` on the `ParamSchema` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `breakdown` on the `Quote` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `delivered` on the `Quote` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `resolvedSelections` on the `Quote` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `schemaSnapshot` on the `Quote` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `selections` on the `Quote` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - Made the column `breakdown` on table `Quote` required. This step will fail if there are existing NULL values in that column.
  - Made the column `schemaSnapshot` on table `Quote` required. This step will fail if there are existing NULL values in that column.
  - Made the column `selections` on table `Quote` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "Collection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Collection_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "activeSchemaId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_activeSchemaId_fkey" FOREIGN KEY ("activeSchemaId") REFERENCES "ParamSchema" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("activeSchemaId", "createdAt", "id", "name", "slug", "updatedAt") SELECT "activeSchemaId", "createdAt", "id", "name", "slug", "updatedAt" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Category_activeSchemaId_key" ON "Category"("activeSchemaId");
CREATE TABLE "new_FurniturePortfolio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FurniturePortfolio" ("createdAt", "id", "imageUrl", "name", "updatedAt") SELECT "createdAt", "id", "imageUrl", "name", "updatedAt" FROM "FurniturePortfolio";
DROP TABLE "FurniturePortfolio";
ALTER TABLE "new_FurniturePortfolio" RENAME TO "FurniturePortfolio";
CREATE TABLE "new_FxRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "asOfDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_FxRate" ("asOfDate", "base", "createdAt", "id", "quote", "rate", "source") SELECT "asOfDate", "base", "createdAt", "id", "quote", "rate", "source" FROM "FxRate";
DROP TABLE "FxRate";
ALTER TABLE "new_FxRate" RENAME TO "FxRate";
CREATE UNIQUE INDEX "FxRate_base_quote_asOfDate_key" ON "FxRate"("base", "quote", "asOfDate");
CREATE TABLE "new_Inquiry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Inquiry" ("adminNotes", "createdAt", "delivered", "email", "id", "message", "name", "phone", "type") SELECT "adminNotes", "createdAt", "delivered", "email", "id", "message", "name", "phone", "type" FROM "Inquiry";
DROP TABLE "Inquiry";
ALTER TABLE "new_Inquiry" RENAME TO "Inquiry";
CREATE TABLE "new_ParamSchema" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoryId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "label" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParamSchema_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ParamSchema" ("categoryId", "checksum", "createdAt", "id", "json", "label", "publishedAt", "status", "updatedAt", "version") SELECT "categoryId", "checksum", "createdAt", "id", "json", "label", "publishedAt", "status", "updatedAt", "version" FROM "ParamSchema";
DROP TABLE "ParamSchema";
ALTER TABLE "new_ParamSchema" RENAME TO "ParamSchema";
CREATE UNIQUE INDEX "ParamSchema_categoryId_version_key" ON "ParamSchema"("categoryId", "version");
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "basePriceCents" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "collectionId" INTEGER,
    "doorType" TEXT NOT NULL DEFAULT 'STANDARD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("basePriceCents", "categoryId", "createdAt", "id", "imageUrl", "isActive", "name", "slug", "updatedAt") SELECT "basePriceCents", "categoryId", "createdAt", "id", "imageUrl", "isActive", "name", "slug", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "selections" JSONB NOT NULL,
    "schemaVersionId" INTEGER,
    "schemaLabel" TEXT,
    "schemaChecksum" TEXT,
    "schemaSnapshot" JSONB NOT NULL,
    "basePriceCents" INTEGER NOT NULL,
    "adjustmentsCents" INTEGER NOT NULL,
    "totalPriceCents" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "resolvedSelections" JSONB,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "baseCurrency" TEXT DEFAULT 'USD',
    "quoteCurrency" TEXT DEFAULT 'UAH',
    "fxRate" REAL,
    "fxSource" TEXT,
    "fxAsOf" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("adjustmentsCents", "adminNotes", "baseCurrency", "basePriceCents", "breakdown", "categoryId", "createdAt", "customerEmail", "customerName", "customerPhone", "delivered", "fxAsOf", "fxRate", "fxSource", "id", "notes", "productId", "quoteCurrency", "resolvedSelections", "schemaChecksum", "schemaLabel", "schemaSnapshot", "schemaVersionId", "selections", "totalPriceCents") SELECT "adjustmentsCents", "adminNotes", "baseCurrency", "basePriceCents", "breakdown", "categoryId", "createdAt", "customerEmail", "customerName", "customerPhone", coalesce("delivered", false) AS "delivered", "fxAsOf", "fxRate", "fxSource", "id", "notes", "productId", "quoteCurrency", "resolvedSelections", "schemaChecksum", "schemaLabel", "schemaSnapshot", "schemaVersionId", "selections", "totalPriceCents" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Collection_categoryId_slug_key" ON "Collection"("categoryId", "slug");

-- RedefineIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email");