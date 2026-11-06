ALTER TABLE "InventoryItem"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletionReason" TEXT,
  ADD COLUMN "deletedById" TEXT;

CREATE INDEX "InventoryItem_deletedAt_idx" ON "InventoryItem"("deletedAt");
