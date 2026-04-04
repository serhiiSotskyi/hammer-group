ALTER TABLE "Product" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Product"
SET "sortOrder" = (
  SELECT COUNT(*)
  FROM "Product" AS p2
  WHERE p2."categoryId" = "Product"."categoryId"
    AND p2."collectionId" IS "Product"."collectionId"
    AND p2."id" <= "Product"."id"
);

CREATE INDEX "Product_categoryId_collectionId_sortOrder_idx"
ON "Product"("categoryId", "collectionId", "sortOrder");

ALTER TABLE "FurniturePortfolio" ADD COLUMN "projectType" TEXT NOT NULL DEFAULT 'FURNITURE';
