PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "Quote";
DROP TABLE IF EXISTS "ProductParameter";
DROP TABLE IF EXISTS "ParameterOption";
DROP TABLE IF EXISTS "ParameterGroup";
DROP TABLE IF EXISTS "ParamSchema";
DROP TABLE IF EXISTS "Product";
DROP TABLE IF EXISTS "Category";
PRAGMA foreign_keys=ON;

CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "activeSchemaId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_activeSchemaId_fkey" FOREIGN KEY ("activeSchemaId") REFERENCES "ParamSchema" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "basePriceCents" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ParamSchema" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoryId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "label" TEXT NOT NULL,
    "json" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParamSchema_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "selections" TEXT NOT NULL,
    "schemaVersionId" INTEGER,
    "schemaLabel" TEXT,
    "schemaChecksum" TEXT,
    "schemaSnapshot" TEXT NOT NULL,
    "basePriceCents" INTEGER NOT NULL,
    "adjustmentsCents" INTEGER NOT NULL,
    "totalPriceCents" INTEGER NOT NULL,
    "breakdown" TEXT NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Category_activeSchemaId_key" ON "Category"("activeSchemaId");
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "ParamSchema_categoryId_version_key" ON "ParamSchema"("categoryId", "version");
