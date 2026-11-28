CREATE TABLE "SikatPayWebhookEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderReference" TEXT,
    "amountCentavos" BIGINT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SikatPayWebhookEvent_pkey" PRIMARY KEY ("id")
);
