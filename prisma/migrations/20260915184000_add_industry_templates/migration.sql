-- CreateTable
CREATE TABLE "IndustryTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frameworkVersionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndustryTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndustryTemplateCompetency" (
    "id" TEXT NOT NULL,
    "industryTemplateId" TEXT NOT NULL,
    "frameworkCompetencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndustryTemplateCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateRoleProfile" (
    "id" TEXT NOT NULL,
    "industryTemplateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateRoleProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateRequirement" (
    "id" TEXT NOT NULL,
    "templateRoleProfileId" TEXT NOT NULL,
    "frameworkCompetencyId" TEXT NOT NULL,
    "targetLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndustryTemplate_name_key" ON "IndustryTemplate"("name");

-- CreateIndex
CREATE INDEX "IndustryTemplate_frameworkVersionId_idx" ON "IndustryTemplate"("frameworkVersionId");

-- CreateIndex
CREATE INDEX "IndustryTemplateCompetency_industryTemplateId_idx" ON "IndustryTemplateCompetency"("industryTemplateId");

-- CreateIndex
CREATE INDEX "IndustryTemplateCompetency_frameworkCompetencyId_idx" ON "IndustryTemplateCompetency"("frameworkCompetencyId");

-- CreateIndex
CREATE UNIQUE INDEX "IndustryTemplateCompetency_industryTemplateId_frameworkCompetencyId_key" ON "IndustryTemplateCompetency"("industryTemplateId", "frameworkCompetencyId");

-- CreateIndex
CREATE INDEX "TemplateRoleProfile_industryTemplateId_idx" ON "TemplateRoleProfile"("industryTemplateId");

-- CreateIndex
CREATE INDEX "TemplateRequirement_templateRoleProfileId_idx" ON "TemplateRequirement"("templateRoleProfileId");

-- CreateIndex
CREATE INDEX "TemplateRequirement_frameworkCompetencyId_idx" ON "TemplateRequirement"("frameworkCompetencyId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateRequirement_templateRoleProfileId_frameworkCompetencyId_key" ON "TemplateRequirement"("templateRoleProfileId", "frameworkCompetencyId");

-- AddForeignKey
ALTER TABLE "IndustryTemplate" ADD CONSTRAINT "IndustryTemplate_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndustryTemplateCompetency" ADD CONSTRAINT "IndustryTemplateCompetency_industryTemplateId_fkey" FOREIGN KEY ("industryTemplateId") REFERENCES "IndustryTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndustryTemplateCompetency" ADD CONSTRAINT "IndustryTemplateCompetency_frameworkCompetencyId_fkey" FOREIGN KEY ("frameworkCompetencyId") REFERENCES "FrameworkCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateRoleProfile" ADD CONSTRAINT "TemplateRoleProfile_industryTemplateId_fkey" FOREIGN KEY ("industryTemplateId") REFERENCES "IndustryTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateRequirement" ADD CONSTRAINT "TemplateRequirement_templateRoleProfileId_fkey" FOREIGN KEY ("templateRoleProfileId") REFERENCES "TemplateRoleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateRequirement" ADD CONSTRAINT "TemplateRequirement_frameworkCompetencyId_fkey" FOREIGN KEY ("frameworkCompetencyId") REFERENCES "FrameworkCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
