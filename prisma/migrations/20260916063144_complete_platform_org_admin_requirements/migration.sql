-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PLATFORM_USER_INVITE';
ALTER TYPE "AuditAction" ADD VALUE 'PLATFORM_USER_ROLE_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'PLATFORM_USER_DEACTIVATE';
ALTER TYPE "AuditAction" ADD VALUE 'PLATFORM_USER_REACTIVATE';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_PROFILE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_TEMPLATE_CHANGE';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'FRAMEWORK_VERSION_AVAILABLE';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "industryTemplateId" TEXT;

-- CreateTable
CREATE TABLE "PlatformInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvitation_tokenHash_key" ON "PlatformInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "PlatformInvitation_email_idx" ON "PlatformInvitation"("email");

-- CreateIndex
CREATE INDEX "PlatformInvitation_expiresAt_idx" ON "PlatformInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "PlatformInvitation_createdById_idx" ON "PlatformInvitation"("createdById");

-- CreateIndex
CREATE INDEX "Tenant_industryTemplateId_idx" ON "Tenant"("industryTemplateId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_industryTemplateId_fkey" FOREIGN KEY ("industryTemplateId") REFERENCES "IndustryTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvitation" ADD CONSTRAINT "PlatformInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
