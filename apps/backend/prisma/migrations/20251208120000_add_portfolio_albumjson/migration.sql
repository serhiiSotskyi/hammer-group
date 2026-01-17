-- Add albumJson column to store album URLs JSON for furniture portfolio
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_FurniturePortfolio" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "albumJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_FurniturePortfolio" ("id", "name", "imageUrl", "createdAt", "updatedAt")
SELECT "id", "name", "imageUrl", "createdAt", "updatedAt" FROM "FurniturePortfolio";

DROP TABLE "FurniturePortfolio";
ALTER TABLE "new_FurniturePortfolio" RENAME TO "FurniturePortfolio";

PRAGMA foreign_keys=ON;
