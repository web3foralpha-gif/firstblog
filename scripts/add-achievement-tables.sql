-- Add visitor achievement system tables
-- Run with: npx prisma db push

-- VisitorAchievement table
CREATE TABLE IF NOT EXISTS "VisitorAchievement" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisitorAchievement_pkey" PRIMARY KEY ("id")
);

-- VisitorStats table  
CREATE TABLE IF NOT EXISTS "VisitorStats" (
    "visitorId" TEXT NOT NULL,
    "totalWatering" INTEGER NOT NULL DEFAULT 0,
    "totalFertilizing" INTEGER NOT NULL DEFAULT 0,
    "totalSunbathing" INTEGER NOT NULL DEFAULT 0,
    "totalPetClicks" INTEGER NOT NULL DEFAULT 0,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "totalGuestbook" INTEGER NOT NULL DEFAULT 0,
    "totalArticleReads" INTEGER NOT NULL DEFAULT 0,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "consecutiveDays" INTEGER NOT NULL DEFAULT 0,
    "lastVisitDate" TIMESTAMP(3),
    "firstVisitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VisitorStats_pkey" PRIMARY KEY ("visitorId")
);

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "VisitorAchievement_visitorId_achievementId_key" 
ON "VisitorAchievement"("visitorId", "achievementId");

-- Add indexes
CREATE INDEX IF NOT EXISTS "VisitorAchievement_visitorId_idx" ON "VisitorAchievement"("visitorId");
CREATE INDEX IF NOT EXISTS "VisitorAchievement_achievementId_idx" ON "VisitorAchievement"("achievementId");
CREATE INDEX IF NOT EXISTS "VisitorStats_consecutiveDays_idx" ON "VisitorStats"("consecutiveDays");
