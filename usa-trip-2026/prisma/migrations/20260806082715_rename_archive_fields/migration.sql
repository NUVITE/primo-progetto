/*
  Warnings:

  - You are about to drop the column `ftpError` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `ftpSynced` on the `Photo` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "caption" TEXT,
    "sharedWithTrip" BOOLEAN NOT NULL DEFAULT false,
    "archiveSynced" BOOLEAN NOT NULL DEFAULT false,
    "archiveError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Photo_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("caption", "createdAt", "familyId", "fileName", "id", "kind", "localPath", "mimeType", "personId", "sharedWithTrip", "sizeBytes") SELECT "caption", "createdAt", "familyId", "fileName", "id", "kind", "localPath", "mimeType", "personId", "sharedWithTrip", "sizeBytes" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE INDEX "Photo_familyId_idx" ON "Photo"("familyId");
CREATE INDEX "Photo_personId_idx" ON "Photo"("personId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
