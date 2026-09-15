-- CreateTable
CREATE TABLE "EvidenceAttachment" (
    "id" TEXT NOT NULL,
    "assessmentItemId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceAttachment_assessmentItemId_idx" ON "EvidenceAttachment"("assessmentItemId");

-- AddForeignKey
ALTER TABLE "EvidenceAttachment" ADD CONSTRAINT "EvidenceAttachment_assessmentItemId_fkey" FOREIGN KEY ("assessmentItemId") REFERENCES "AssessmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
