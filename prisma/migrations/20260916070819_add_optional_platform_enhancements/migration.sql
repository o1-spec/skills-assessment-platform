-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "IntegrationProviderType" AS ENUM ('SSO', 'HRIS', 'LMS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SUPPORT_IMPERSONATION_START';
ALTER TYPE "AuditAction" ADD VALUE 'SUPPORT_IMPERSONATION_END';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_TEMPLATE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_TEMPLATE_RESET';
ALTER TYPE "AuditAction" ADD VALUE 'TENANT_NOTIFICATION_SETTINGS_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'INTEGRATION_CONFIG_UPDATE';

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantNotificationSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assessmentReminderDays" TEXT NOT NULL DEFAULT '3,1',
    "corroborationOverdueBusinessDays" INTEGER NOT NULL DEFAULT 5,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConfiguration" (
    "id" TEXT NOT NULL,
    "providerType" "IntegrationProviderType" NOT NULL,
    "providerName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "configurationMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationTemplate_type_idx" ON "NotificationTemplate"("type");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_type_channel_key" ON "NotificationTemplate"("type", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "TenantNotificationSettings_tenantId_key" ON "TenantNotificationSettings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConfiguration_providerType_providerName_key" ON "IntegrationConfiguration"("providerType", "providerName");

-- AddForeignKey
ALTER TABLE "TenantNotificationSettings" ADD CONSTRAINT "TenantNotificationSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
