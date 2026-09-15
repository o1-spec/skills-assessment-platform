-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING_ONBOARDING', 'ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultSeatLimit" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ORGANIZATION_ADMIN',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantInvitation_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "domain" TEXT,
ADD COLUMN     "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planId" TEXT,
ADD COLUMN     "primaryContactEmail" TEXT,
ADD COLUMN     "primaryContactName" TEXT,
ADD COLUMN     "seatLimit" INTEGER,
ADD COLUMN     "status" "TenantStatus" NOT NULL DEFAULT 'PENDING_ONBOARDING';

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TenantInvitation_tokenHash_key" ON "TenantInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "TenantInvitation_tenantId_idx" ON "TenantInvitation"("tenantId");

-- CreateIndex
CREATE INDEX "TenantInvitation_email_idx" ON "TenantInvitation"("email");

-- CreateIndex
CREATE INDEX "TenantInvitation_tokenHash_idx" ON "TenantInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Tenant_planId_idx" ON "Tenant"("planId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvitation" ADD CONSTRAINT "TenantInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvitation" ADD CONSTRAINT "TenantInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
