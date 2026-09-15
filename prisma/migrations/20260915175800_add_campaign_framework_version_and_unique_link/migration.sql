-- AlterTable
ALTER TABLE "AssessmentCampaign" ADD COLUMN "frameworkVersionId" TEXT;

-- CreateIndex
CREATE INDEX "AssessmentCampaign_frameworkVersionId_idx" ON "AssessmentCampaign"("frameworkVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Competency_tenantId_frameworkCompetencyId_key" ON "Competency"("tenantId", "frameworkCompetencyId");

-- AddForeignKey
ALTER TABLE "AssessmentCampaign" ADD CONSTRAINT "AssessmentCampaign_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
