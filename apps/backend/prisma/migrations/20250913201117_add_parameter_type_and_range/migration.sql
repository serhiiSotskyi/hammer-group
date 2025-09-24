/*
  Warnings:

  - Added the required column `type` to the `ParameterGroup` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ParameterGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "min" INTEGER,
    "max" INTEGER,
    "step" INTEGER,
    "categoryId" INTEGER NOT NULL,
    CONSTRAINT "ParameterGroup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ParameterGroup" ("categoryId", "id", "isRequired", "name") SELECT "categoryId", "id", "isRequired", "name" FROM "ParameterGroup";
DROP TABLE "ParameterGroup";
ALTER TABLE "new_ParameterGroup" RENAME TO "ParameterGroup";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
