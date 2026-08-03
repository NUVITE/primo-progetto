-- AlterTable
ALTER TABLE "TripDay" ADD COLUMN "lat" REAL;
ALTER TABLE "TripDay" ADD COLUMN "lng" REAL;

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripDayId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL,
    "costDetail" TEXT,
    "address" TEXT,
    "mapsQuery" TEXT,
    "warning" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "verifiedAt" DATETIME NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Suggestion_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "TripDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Suggestion_tripDayId_idx" ON "Suggestion"("tripDayId");
