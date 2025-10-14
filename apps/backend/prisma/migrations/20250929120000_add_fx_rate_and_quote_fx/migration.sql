-- Create FxRate table
CREATE TABLE IF NOT EXISTS "FxRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "asOfDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'NBU',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique index per day per pair
CREATE UNIQUE INDEX IF NOT EXISTS "FxRate_base_quote_asOfDate_key" ON "FxRate"("base", "quote", "asOfDate");

-- Add FX snapshot columns to Quote if they do not exist
PRAGMA foreign_keys=off;
CREATE TABLE IF NOT EXISTS "_Quote_backup" AS SELECT * FROM "Quote";

-- Recreate Quote with new columns if missing
DROP TABLE IF EXISTS "Quote_new";
CREATE TABLE "Quote_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" INTEGER NOT NULL,
  "categoryId" INTEGER NOT NULL,
  "selections" TEXT,
  "schemaVersionId" INTEGER,
  "schemaLabel" TEXT,
  "schemaChecksum" TEXT,
  "schemaSnapshot" TEXT,
  "basePriceCents" INTEGER NOT NULL,
  "adjustmentsCents" INTEGER NOT NULL,
  "totalPriceCents" INTEGER NOT NULL,
  "breakdown" TEXT,
  "resolvedSelections" TEXT,
  "customerName" TEXT,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "notes" TEXT,
  "delivered" INTEGER DEFAULT 0,
  "adminNotes" TEXT,
  "baseCurrency" TEXT DEFAULT 'USD',
  "quoteCurrency" TEXT DEFAULT 'UAH',
  "fxRate" REAL,
  "fxSource" TEXT,
  "fxAsOf" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy data from backup if structure matches (ignore missing new columns)
INSERT INTO "Quote_new" (
  "id","productId","categoryId","selections","schemaVersionId","schemaLabel","schemaChecksum","schemaSnapshot",
  "basePriceCents","adjustmentsCents","totalPriceCents","breakdown","resolvedSelections",
  "customerName","customerEmail","customerPhone","notes","delivered","adminNotes","createdAt"
)
SELECT 
  "id","productId","categoryId","selections","schemaVersionId","schemaLabel","schemaChecksum","schemaSnapshot",
  "basePriceCents","adjustmentsCents","totalPriceCents","breakdown","resolvedSelections",
  "customerName","customerEmail","customerPhone","notes","delivered","adminNotes","createdAt"
FROM "_Quote_backup";

DROP TABLE "Quote";
ALTER TABLE "Quote_new" RENAME TO "Quote";
DROP TABLE "_Quote_backup";
PRAGMA foreign_keys=on;

