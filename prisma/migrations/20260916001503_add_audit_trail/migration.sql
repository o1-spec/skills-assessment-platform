-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'TENANT_PROVISION', 'TENANT_SUSPEND', 'TENANT_REACTIVATE', 'PLAN_CREATE', 'PLAN_UPDATE', 'FRAMEWORK_CREATE', 'FRAMEWORK_PUBLISH', 'FRAMEWORK_ADOPT', 'INDUSTRY_TEMPLATE_CREATE', 'INDUSTRY_TEMPLATE_UPDATE', 'COMPETENCY_CREATE', 'COMPETENCY_UPDATE', 'COMPETENCY_ACTIVATE', 'COMPETENCY_DEACTIVATE', 'USER_INVITE', 'USER_DEACTIVATE', 'USER_REACTIVATE', 'USER_ROLE_CHANGE', 'USER_ROLE_PROFILE_ASSIGN', 'DEPARTMENT_CREATE', 'DEPARTMENT_UPDATE', 'TEAM_CREATE', 'TEAM_UPDATE', 'TEAM_MEMBERSHIP_CHANGE', 'ROLE_PROFILE_CREATE', 'ROLE_PROFILE_UPDATE', 'ROLE_PROFILE_PUBLISH', 'ROLE_PROFILE_ARCHIVE', 'ROLE_PROFILE_UNARCHIVE', 'CAMPAIGN_CREATE', 'CAMPAIGN_UPDATE', 'CAMPAIGN_LAUNCH', 'ASSESSMENT_SUBMIT', 'CORROBORATION_SUBMIT');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorId" TEXT,
    "actorRole" "UserRole",
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
