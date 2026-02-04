-- CreateTable
CREATE TABLE "PlanConfiguration" (
    "id" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "features" JSONB NOT NULL,
    "description" TEXT,
    "descriptionEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanConfiguration_planType_key" ON "PlanConfiguration"("planType");

-- Add plan configuration tracking to Company table
ALTER TABLE "Company" ADD COLUMN "planConfigurationId" TEXT;

-- Add foreign key relationship
ALTER TABLE "Company" ADD CONSTRAINT "Company_planConfigurationId_fkey" FOREIGN KEY ("planConfigurationId") REFERENCES "PlanConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
