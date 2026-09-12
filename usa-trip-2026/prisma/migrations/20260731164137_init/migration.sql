-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TripDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "hotelName" TEXT,
    "hotelInfo" TEXT,
    "wakeInfo" TEXT,
    "luggageNote" TEXT,
    "dressCode" TEXT,
    "summary" TEXT
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripDayId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "time" TEXT,
    "title" TEXT NOT NULL,
    "address" TEXT,
    "mapsQuery" TEXT,
    "zone" TEXT,
    "transportMode" TEXT,
    "cost" TEXT,
    "notes" TEXT,
    "requiresDocument" TEXT,
    "updatedByFamily" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activity_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "TripDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MealSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "priceTier" TEXT,
    "note" TEXT,
    CONSTRAINT "MealSuggestion_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "TripDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "tripDayNumber" INTEGER,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "phraseEn" TEXT NOT NULL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "CustomsPhrase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "italian" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "EmergencyInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "insuranceProvider" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "insurancePhone" TEXT NOT NULL,
    "agencyPhone24h" TEXT NOT NULL,
    "agencyEmail" TEXT NOT NULL,
    "teamAmericaNyPhone" TEXT,
    "lostDocumentSteps" TEXT NOT NULL,
    "lostBaggageSteps" TEXT NOT NULL,
    "medicalEmergencySteps" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "OptionalExcursion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "day" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "description" TEXT,
    "recommendation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "Family_code_key" ON "Family"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TripDay_dayNumber_key" ON "TripDay"("dayNumber");

-- CreateIndex
CREATE INDEX "TripDay_dayNumber_idx" ON "TripDay"("dayNumber");

-- CreateIndex
CREATE INDEX "Activity_tripDayId_idx" ON "Activity"("tripDayId");

-- CreateIndex
CREATE INDEX "MealSuggestion_tripDayId_idx" ON "MealSuggestion"("tripDayId");

-- CreateIndex
CREATE INDEX "Document_familyId_idx" ON "Document"("familyId");
