CREATE TABLE "BookingBlackoutDate" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingBlackoutDate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingBlackoutDate_date_key" ON "BookingBlackoutDate"("date");
CREATE INDEX "BookingBlackoutDate_date_idx" ON "BookingBlackoutDate"("date");
