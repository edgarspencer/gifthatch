-- CreateTable
CREATE TABLE "GiftRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thresholdCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'GBP',
    "giftVariantId" TEXT NOT NULL,
    "giftProductId" TEXT NOT NULL,
    "giftTitle" TEXT NOT NULL,
    "bannerText" TEXT NOT NULL DEFAULT '🎁 Free gift unlocked',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "GiftRule_shop_active_idx" ON "GiftRule"("shop", "active");
