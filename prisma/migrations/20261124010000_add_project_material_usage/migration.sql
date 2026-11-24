CREATE TABLE "ProjectMaterialUsage" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMaterialUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectMaterialUsage_bookingId_createdAt_idx" ON "ProjectMaterialUsage"("bookingId", "createdAt");
CREATE INDEX "ProjectMaterialUsage_inventoryItemId_createdAt_idx" ON "ProjectMaterialUsage"("inventoryItemId", "createdAt");
CREATE INDEX "ProjectMaterialUsage_techId_createdAt_idx" ON "ProjectMaterialUsage"("techId", "createdAt");

ALTER TABLE "ProjectMaterialUsage" ADD CONSTRAINT "ProjectMaterialUsage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMaterialUsage" ADD CONSTRAINT "ProjectMaterialUsage_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectMaterialUsage" ADD CONSTRAINT "ProjectMaterialUsage_techId_fkey" FOREIGN KEY ("techId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
