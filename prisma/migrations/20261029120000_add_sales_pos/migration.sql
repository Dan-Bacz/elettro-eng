-- Add Sales-owned POS transactions. Warehouse inventory is deducted at release;
-- POS transactions consume the separately tracked, acknowledged Sales stock.
CREATE TABLE "SalesSale" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "customerName" TEXT,
    "customerContact" TEXT,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesSale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesSaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SalesSaleItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesSale_reference_key" ON "SalesSale"("reference");
CREATE INDEX "SalesSale_createdAt_idx" ON "SalesSale"("createdAt");
CREATE INDEX "SalesSale_createdById_createdAt_idx" ON "SalesSale"("createdById", "createdAt");
CREATE INDEX "SalesSaleItem_saleId_idx" ON "SalesSaleItem"("saleId");
CREATE INDEX "SalesSaleItem_inventoryItemId_idx" ON "SalesSaleItem"("inventoryItemId");

ALTER TABLE "SalesSale" ADD CONSTRAINT "SalesSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesSaleItem" ADD CONSTRAINT "SalesSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "SalesSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesSaleItem" ADD CONSTRAINT "SalesSaleItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
