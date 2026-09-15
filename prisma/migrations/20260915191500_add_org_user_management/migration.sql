-- AlterTable
ALTER TABLE "TenantInvitation" ADD COLUMN "managerId" TEXT,
ADD COLUMN "roleProfileId" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "roleProfileId" TEXT;

-- CreateIndex
CREATE INDEX "TenantInvitation_managerId_idx" ON "TenantInvitation"("managerId");

-- CreateIndex
CREATE INDEX "TenantInvitation_roleProfileId_idx" ON "TenantInvitation"("roleProfileId");

-- CreateIndex
CREATE INDEX "User_roleProfileId_idx" ON "User"("roleProfileId");

-- AddForeignKey
ALTER TABLE "TenantInvitation" ADD CONSTRAINT "TenantInvitation_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvitation" ADD CONSTRAINT "TenantInvitation_roleProfileId_fkey" FOREIGN KEY ("roleProfileId") REFERENCES "RoleProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleProfileId_fkey" FOREIGN KEY ("roleProfileId") REFERENCES "RoleProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
