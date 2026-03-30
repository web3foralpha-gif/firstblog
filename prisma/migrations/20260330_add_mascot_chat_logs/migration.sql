CREATE TABLE "MascotChatLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "visitorId" TEXT,
    "path" TEXT,
    "referrer" TEXT,
    "message" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "messageChars" INTEGER NOT NULL DEFAULT 0,
    "replyChars" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'twin',
    "model" TEXT,
    "apiBase" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "providerStatus" INTEGER,
    "errorType" TEXT,
    "latencyMs" INTEGER,
    "ipAddress" TEXT,
    "ipRegion" TEXT,
    "ipCity" TEXT,
    "userAgent" TEXT,
    "deviceInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MascotChatLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MascotChatLog_createdAt_idx" ON "MascotChatLog"("createdAt");
CREATE INDEX "MascotChatLog_sessionId_createdAt_idx" ON "MascotChatLog"("sessionId", "createdAt");
CREATE INDEX "MascotChatLog_visitorId_createdAt_idx" ON "MascotChatLog"("visitorId", "createdAt");
CREATE INDEX "MascotChatLog_ipAddress_createdAt_idx" ON "MascotChatLog"("ipAddress", "createdAt");
CREATE INDEX "MascotChatLog_mode_createdAt_idx" ON "MascotChatLog"("mode", "createdAt");
CREATE INDEX "MascotChatLog_success_createdAt_idx" ON "MascotChatLog"("success", "createdAt");
CREATE INDEX "MascotChatLog_errorType_createdAt_idx" ON "MascotChatLog"("errorType", "createdAt");
