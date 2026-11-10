CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "suffix" TEXT,
    "sex" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "civilStatus" TEXT,
    "category" TEXT NOT NULL,
    "contactNumber" TEXT,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "municipality" TEXT NOT NULL DEFAULT 'Mahayag',
    "province" TEXT,
    "assignedOfficerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Beneficiary_beneficiaryId_key" ON "Beneficiary"("beneficiaryId");
CREATE INDEX "Beneficiary_category_idx" ON "Beneficiary"("category");
CREATE INDEX "Beneficiary_assignedOfficerId_idx" ON "Beneficiary"("assignedOfficerId");
CREATE INDEX "Beneficiary_barangay_idx" ON "Beneficiary"("barangay");
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
