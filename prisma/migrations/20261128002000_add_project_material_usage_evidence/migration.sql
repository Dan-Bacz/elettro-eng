ALTER TABLE "ProjectMaterialUsage"
    ALTER COLUMN "inventoryItemId" DROP NOT NULL,
    ADD COLUMN "materialName" TEXT;

CREATE TABLE "ProjectMaterialUsageEvidence" (
    "usageId" TEXT NOT NULL,
    "receiptPhoto" TEXT NOT NULL,
    "productPhoto" TEXT NOT NULL,
    CONSTRAINT "ProjectMaterialUsageEvidence_pkey" PRIMARY KEY ("usageId"),
    CONSTRAINT "ProjectMaterialUsageEvidence_usageId_fkey" FOREIGN KEY ("usageId")
        REFERENCES "ProjectMaterialUsage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
