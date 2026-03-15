-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "mood" TEXT NOT NULL DEFAULT '',
    "coverImage" TEXT,
    "accessType" TEXT NOT NULL DEFAULT 'PUBLIC',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" DATETIME,
    "passwordHash" TEXT,
    "passwordHint" TEXT,
    "price" REAL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'IMAGE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "email" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'cny',
    "stripeSessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "accessToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Guestbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "email" TEXT,
    "emailPublic" BOOLEAN NOT NULL DEFAULT false,
    "emailVisible" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT NOT NULL,
    "emoji" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" DATETIME,
    "ipAddress" TEXT,
    "ipCountry" TEXT,
    "ipRegion" TEXT,
    "ipCity" TEXT,
    "ipIsp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "ipRegion" TEXT,
    "ipCity" TEXT,
    "path" TEXT NOT NULL,
    "enteredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "userAgent" TEXT
);

-- CreateTable
CREATE TABLE "SunflowerState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SunflowerInteraction" (
    "ipHash" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_published_pinned_createdAt_idx" ON "Article"("published", "pinned", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Media_key_key" ON "Media"("key");

-- CreateIndex
CREATE INDEX "Media_type_createdAt_idx" ON "Media"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_articleId_status_idx" ON "Comment"("articleId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_accessToken_key" ON "Payment"("accessToken");

-- CreateIndex
CREATE INDEX "Payment_articleId_idx" ON "Payment"("articleId");

-- CreateIndex
CREATE INDEX "Payment_accessToken_idx" ON "Payment"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- CreateIndex
CREATE INDEX "Guestbook_status_pinned_createdAt_idx" ON "Guestbook"("status", "pinned", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_sessionId_idx" ON "PageView"("sessionId");

-- CreateIndex
CREATE INDEX "PageView_enteredAt_idx" ON "PageView"("enteredAt");
