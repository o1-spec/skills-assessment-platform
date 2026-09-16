-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "CareerPathStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TENANT_ARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE 'CAREER_PATH_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'CAREER_PATH_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'CAREER_PATH_PUBLISH';

-- AlterEnum
ALTER TYPE "TenantStatus" ADD VALUE 'ARCHIVED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPPORT';

-- AlterTable
ALTER TABLE "AssessmentCampaign" ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Competency" ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "IndustryTemplateCompetency" ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "logoUrl" TEXT;

-- CreateTable
CREATE TABLE "CareerPath" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CareerPathStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPathStep" (
    "id" TEXT NOT NULL,
    "careerPathId" TEXT NOT NULL,
    "roleProfileId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPathStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareerPath_tenantId_idx" ON "CareerPath"("tenantId");

-- CreateIndex
CREATE INDEX "CareerPathStep_careerPathId_idx" ON "CareerPathStep"("careerPathId");

-- CreateIndex
CREATE INDEX "CareerPathStep_roleProfileId_idx" ON "CareerPathStep"("roleProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerPathStep_careerPathId_roleProfileId_key" ON "CareerPathStep"("careerPathId", "roleProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerPathStep_careerPathId_orderIndex_key" ON "CareerPathStep"("careerPathId", "orderIndex");

-- AddForeignKey
ALTER TABLE "CareerPath" ADD CONSTRAINT "CareerPath_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPathStep" ADD CONSTRAINT "CareerPathStep_careerPathId_fkey" FOREIGN KEY ("careerPathId") REFERENCES "CareerPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPathStep" ADD CONSTRAINT "CareerPathStep_roleProfileId_fkey" FOREIGN KEY ("roleProfileId") REFERENCES "RoleProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
