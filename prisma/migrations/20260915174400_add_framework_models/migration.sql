-- CreateEnum
CREATE TYPE "FrameworkStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Competency" ADD COLUMN "frameworkCompetencyId" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "isCustom" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "FrameworkVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "FrameworkStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrameworkVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkCategory" (
    "id" TEXT NOT NULL,
    "frameworkVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CompetencyType" NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrameworkCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkCompetency" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrameworkCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkLevel" (
    "id" TEXT NOT NULL,
    "frameworkCompetencyId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "evidencePrompt" TEXT,

    CONSTRAINT "FrameworkLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantFrameworkAdoption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "frameworkVersionId" TEXT NOT NULL,
    "adoptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TenantFrameworkAdoption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkVersion_version_key" ON "FrameworkVersion"("version");

-- CreateIndex
CREATE INDEX "FrameworkCategory_frameworkVersionId_idx" ON "FrameworkCategory"("frameworkVersionId");

-- CreateIndex
CREATE INDEX "FrameworkCategory_parentId_idx" ON "FrameworkCategory"("parentId");

-- CreateIndex
CREATE INDEX "FrameworkCompetency_categoryId_idx" ON "FrameworkCompetency"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkLevel_frameworkCompetencyId_level_key" ON "FrameworkLevel"("frameworkCompetencyId", "level");

-- CreateIndex
CREATE INDEX "TenantFrameworkAdoption_tenantId_idx" ON "TenantFrameworkAdoption"("tenantId");

-- CreateIndex
CREATE INDEX "TenantFrameworkAdoption_frameworkVersionId_idx" ON "TenantFrameworkAdoption"("frameworkVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantFrameworkAdoption_tenantId_frameworkVersionId_key" ON "TenantFrameworkAdoption"("tenantId", "frameworkVersionId");

-- CreateIndex
CREATE INDEX "Competency_frameworkCompetencyId_idx" ON "Competency"("frameworkCompetencyId");

-- AddForeignKey
ALTER TABLE "FrameworkCategory" ADD CONSTRAINT "FrameworkCategory_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkCategory" ADD CONSTRAINT "FrameworkCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FrameworkCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkCompetency" ADD CONSTRAINT "FrameworkCompetency_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FrameworkCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkLevel" ADD CONSTRAINT "FrameworkLevel_frameworkCompetencyId_fkey" FOREIGN KEY ("frameworkCompetencyId") REFERENCES "FrameworkCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantFrameworkAdoption" ADD CONSTRAINT "TenantFrameworkAdoption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantFrameworkAdoption" ADD CONSTRAINT "TenantFrameworkAdoption_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_frameworkCompetencyId_fkey" FOREIGN KEY ("frameworkCompetencyId") REFERENCES "FrameworkCompetency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
