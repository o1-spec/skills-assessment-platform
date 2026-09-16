-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('ORGANIZATION_GAP', 'TEAM_GAP');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ScheduleScopeType" AS ENUM ('ORGANIZATION', 'TEAM');

-- CreateEnum
CREATE TYPE "ScheduleRunStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'REPORT_SCHEDULE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_SCHEDULE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_SCHEDULE_ACTIVATE';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_SCHEDULE_DEACTIVATE';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_SCHEDULE_RUN';

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "scopeType" "ScheduleScopeType" NOT NULL,
    "scopeId" TEXT,
    "frequency" "ScheduleFrequency" NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" "ScheduleRunStatus",
    "lastRunError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportScheduleRecipient" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportScheduleRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportSchedule_tenantId_idx" ON "ReportSchedule"("tenantId");

-- CreateIndex
CREATE INDEX "ReportSchedule_nextRunAt_isActive_idx" ON "ReportSchedule"("nextRunAt", "isActive");

-- CreateIndex
CREATE INDEX "ReportSchedule_createdById_idx" ON "ReportSchedule"("createdById");

-- CreateIndex
CREATE INDEX "ReportScheduleRecipient_userId_idx" ON "ReportScheduleRecipient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportScheduleRecipient_scheduleId_userId_key" ON "ReportScheduleRecipient"("scheduleId", "userId");

-- AddForeignKey
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportScheduleRecipient" ADD CONSTRAINT "ReportScheduleRecipient_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReportSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportScheduleRecipient" ADD CONSTRAINT "ReportScheduleRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
