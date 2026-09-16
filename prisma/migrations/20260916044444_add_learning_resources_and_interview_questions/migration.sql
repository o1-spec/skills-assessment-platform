-- CreateEnum
CREATE TYPE "LearningResourceType" AS ENUM ('COURSE', 'ARTICLE', 'VIDEO', 'DOCUMENT', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LEARNING_RESOURCE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'LEARNING_RESOURCE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'LEARNING_RESOURCE_ACTIVATE';
ALTER TYPE "AuditAction" ADD VALUE 'LEARNING_RESOURCE_DEACTIVATE';
ALTER TYPE "AuditAction" ADD VALUE 'LEARNING_RESOURCE_MAPPING_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'INTERVIEW_QUESTION_SET_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'INTERVIEW_QUESTION_SET_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'INTERVIEW_QUESTION_SET_DELETE';

-- CreateTable
CREATE TABLE "LearningResource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "provider" TEXT,
    "resourceType" "LearningResourceType" NOT NULL DEFAULT 'COURSE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencyLearningResource" (
    "id" TEXT NOT NULL,
    "learningResourceId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "targetLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetencyLearningResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestionSet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewQuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "questionSetId" TEXT NOT NULL,
    "competencyId" TEXT,
    "targetLevel" INTEGER,
    "question" TEXT NOT NULL,
    "followUp" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningResource_tenantId_idx" ON "LearningResource"("tenantId");

-- CreateIndex
CREATE INDEX "LearningResource_isActive_idx" ON "LearningResource"("isActive");

-- CreateIndex
CREATE INDEX "CompetencyLearningResource_learningResourceId_idx" ON "CompetencyLearningResource"("learningResourceId");

-- CreateIndex
CREATE INDEX "CompetencyLearningResource_competencyId_idx" ON "CompetencyLearningResource"("competencyId");

-- CreateIndex
CREATE INDEX "CompetencyLearningResource_competencyId_targetLevel_idx" ON "CompetencyLearningResource"("competencyId", "targetLevel");

-- CreateIndex
CREATE INDEX "InterviewQuestionSet_tenantId_idx" ON "InterviewQuestionSet"("tenantId");

-- CreateIndex
CREATE INDEX "InterviewQuestionSet_roleProfileId_idx" ON "InterviewQuestionSet"("roleProfileId");

-- CreateIndex
CREATE INDEX "InterviewQuestionSet_createdById_idx" ON "InterviewQuestionSet"("createdById");

-- CreateIndex
CREATE INDEX "InterviewQuestion_questionSetId_idx" ON "InterviewQuestion"("questionSetId");

-- CreateIndex
CREATE INDEX "InterviewQuestion_competencyId_idx" ON "InterviewQuestion"("competencyId");

-- AddForeignKey
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyLearningResource" ADD CONSTRAINT "CompetencyLearningResource_learningResourceId_fkey" FOREIGN KEY ("learningResourceId") REFERENCES "LearningResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyLearningResource" ADD CONSTRAINT "CompetencyLearningResource_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestionSet" ADD CONSTRAINT "InterviewQuestionSet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestionSet" ADD CONSTRAINT "InterviewQuestionSet_roleProfileId_fkey" FOREIGN KEY ("roleProfileId") REFERENCES "RoleProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestionSet" ADD CONSTRAINT "InterviewQuestionSet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "InterviewQuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
