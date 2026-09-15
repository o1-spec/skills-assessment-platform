-- CreateEnum
CREATE TYPE "CampaignScope" AS ENUM ('ORGANIZATION', 'TEAM', 'INDIVIDUAL');

-- AlterTable
ALTER TABLE "AssessmentCampaign" ADD COLUMN     "scope" "CampaignScope" NOT NULL DEFAULT 'INDIVIDUAL';

-- CreateTable
CREATE TABLE "CampaignTeam" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignTeam_campaignId_idx" ON "CampaignTeam"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignTeam_teamId_idx" ON "CampaignTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignTeam_campaignId_teamId_key" ON "CampaignTeam"("campaignId", "teamId");

-- AddForeignKey
ALTER TABLE "CampaignTeam" ADD CONSTRAINT "CampaignTeam_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AssessmentCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTeam" ADD CONSTRAINT "CampaignTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
