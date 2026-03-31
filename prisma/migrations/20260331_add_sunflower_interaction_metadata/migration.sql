-- AlterTable
ALTER TABLE "SunflowerInteraction"
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "ipCity" TEXT,
ADD COLUMN     "ipCountry" TEXT,
ADD COLUMN     "ipIsp" TEXT,
ADD COLUMN     "ipRegion" TEXT,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "deviceInfo" JSONB;
