ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SALES';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WAREHOUSE';

CREATE TYPE "WarehouseRequestSource" AS ENUM ('INTERNAL_SALES', 'CLIENT_ORDER');
CREATE TYPE "WarehouseRequestStatus" AS ENUM (
    'PENDING',
    'UNDER_REVIEW',
    'PARTIALLY_FULFILLED',
    'FULFILLED',
    'REJECTED',
    'CANCELLED'
);
CREATE TYPE "InventoryMovementType" AS ENUM (
    'STOCK_RECEIVED',
    'STOCK_RELEASED',
    'ADJUSTMENT',
    'RETURN'
);

CREATE TABLE "WarehouseRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "source" "WarehouseRequestSource" NOT NULL DEFAULT 'INTERNAL_SALES',
    "status" "WarehouseRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requesterId" TEXT NOT NULL,
    "orderId" TEXT,
    "idempotencyKey" TEXT,
    "customerReference" TEXT,
    "projectReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WarehouseRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "requestedQuantity" INTEGER NOT NULL,
    "releasedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unavailableQuantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WarehouseRequestItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseRelease" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "releasedById" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WarehouseRelease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseReleaseItem" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "requestItemId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "discrepancyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WarehouseReleaseItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseReceipt" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WarehouseReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "requestId" TEXT,
    "releaseId" TEXT,
    "workerId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WarehouseRequest_reference_key" ON "WarehouseRequest"("reference");
CREATE UNIQUE INDEX "WarehouseRequest_orderId_key" ON "WarehouseRequest"("orderId");
CREATE UNIQUE INDEX "WarehouseRequest_idempotencyKey_key" ON "WarehouseRequest"("idempotencyKey");
CREATE INDEX "WarehouseRequest_requesterId_createdAt_idx" ON "WarehouseRequest"("requesterId", "createdAt");
CREATE INDEX "WarehouseRequest_status_createdAt_idx" ON "WarehouseRequest"("status", "createdAt");
CREATE INDEX "WarehouseRequest_source_createdAt_idx" ON "WarehouseRequest"("source", "createdAt");

CREATE UNIQUE INDEX "WarehouseRequestItem_orderItemId_key" ON "WarehouseRequestItem"("orderItemId");
CREATE INDEX "WarehouseRequestItem_requestId_idx" ON "WarehouseRequestItem"("requestId");
CREATE INDEX "WarehouseRequestItem_inventoryItemId_idx" ON "WarehouseRequestItem"("inventoryItemId");

CREATE UNIQUE INDEX "WarehouseRelease_receiptNumber_key" ON "WarehouseRelease"("receiptNumber");
CREATE UNIQUE INDEX "WarehouseRelease_idempotencyKey_key" ON "WarehouseRelease"("idempotencyKey");
CREATE INDEX "WarehouseRelease_requestId_createdAt_idx" ON "WarehouseRelease"("requestId", "createdAt");
CREATE INDEX "WarehouseRelease_releasedById_createdAt_idx" ON "WarehouseRelease"("releasedById", "createdAt");

CREATE UNIQUE INDEX "WarehouseReleaseItem_releaseId_requestItemId_key" ON "WarehouseReleaseItem"("releaseId", "requestItemId");
CREATE INDEX "WarehouseReleaseItem_requestItemId_createdAt_idx" ON "WarehouseReleaseItem"("requestItemId", "createdAt");

CREATE UNIQUE INDEX "WarehouseReceipt_reference_key" ON "WarehouseReceipt"("reference");
CREATE UNIQUE INDEX "WarehouseReceipt_releaseId_key" ON "WarehouseReceipt"("releaseId");

CREATE INDEX "InventoryMovement_inventoryItemId_createdAt_idx" ON "InventoryMovement"("inventoryItemId", "createdAt");
CREATE INDEX "InventoryMovement_requestId_createdAt_idx" ON "InventoryMovement"("requestId", "createdAt");
CREATE INDEX "InventoryMovement_workerId_createdAt_idx" ON "InventoryMovement"("workerId", "createdAt");
CREATE INDEX "InventoryMovement_type_createdAt_idx" ON "InventoryMovement"("type", "createdAt");

ALTER TABLE "WarehouseRequest"
    ADD CONSTRAINT "WarehouseRequest_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequest"
    ADD CONSTRAINT "WarehouseRequest_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequestItem"
    ADD CONSTRAINT "WarehouseRequestItem_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "WarehouseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequestItem"
    ADD CONSTRAINT "WarehouseRequestItem_inventoryItemId_fkey"
    FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequestItem"
    ADD CONSTRAINT "WarehouseRequestItem_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarehouseRelease"
    ADD CONSTRAINT "WarehouseRelease_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "WarehouseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRelease"
    ADD CONSTRAINT "WarehouseRelease_releasedById_fkey"
    FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseReleaseItem"
    ADD CONSTRAINT "WarehouseReleaseItem_releaseId_fkey"
    FOREIGN KEY ("releaseId") REFERENCES "WarehouseRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseReleaseItem"
    ADD CONSTRAINT "WarehouseReleaseItem_requestItemId_fkey"
    FOREIGN KEY ("requestItemId") REFERENCES "WarehouseRequestItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseReceipt"
    ADD CONSTRAINT "WarehouseReceipt_releaseId_fkey"
    FOREIGN KEY ("releaseId") REFERENCES "WarehouseRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey"
    FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "WarehouseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_releaseId_fkey"
    FOREIGN KEY ("releaseId") REFERENCES "WarehouseRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
