import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/db';
import {
  AssessmentStatus,
  UserRole,
  TenantStatus,
} from '@prisma/client';
import {
  uploadEvidenceAttachment,
  deleteEvidenceAttachment,
  getEvidenceAttachmentSignedUrl,
  getAttachmentsForAssessmentItem,
} from '../src/services/evidence-attachments';
import {
  saveAssessmentDraft,
  submitAssessment,
  getStaffAssessmentById,
} from '../src/services/assessments';
import {
  getManagerCorroborationById,
  submitCorroboration,
} from '../src/services/corroborations';
import { getCampaignMonitoringStats } from '../src/services/campaigns';
import { getStorageClient } from '../src/lib/storage/supabase-storage';
import { MAX_EVIDENCE_FILE_SIZE_BYTES } from '../src/lib/validation/evidence-attachment';

async function runTests() {
  console.log('🧪 Starting Evidence File Attachments (SF-04) Business Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // 1. Fetch Acme Tenant & Baseline Data
  const acme = await prisma.tenant.findUnique({
    where: { slug: 'acme-technologies' },
    include: {
      users: true,
      campaigns: {
        where: { name: 'Q3 Engineering Skills Assessment' },
        include: {
          assessments: {
            include: {
              items: {
                include: {
                  competency: true,
                  attachments: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!acme) throw new Error('Acme tenant not found');

  const q3Campaign = acme.campaigns[0];
  if (!q3Campaign) throw new Error('Q3 Engineering Skills Assessment not found');

  const sarah = acme.users.find((u) => u.email === 'staff@acme.test')!;
  const michael = acme.users.find((u) => u.email === 'manager@acme.test')!;


  assert(!!sarah, 'Sarah Jenkins (staff) exists');
  assert(!!michael, 'Michael Manager exists');
  assert(sarah.managerId === michael.id, 'Sarah Jenkins reports to Michael Manager');

  const sarahAssessment = q3Campaign.assessments.find((a) => a.userId === sarah.id);
  assert(!!sarahAssessment, 'Sarah has an assessment in Q3 Campaign');
  assert(sarahAssessment?.status === AssessmentStatus.NOT_STARTED, 'Sarah assessment is initially NOT_STARTED');
  assert(sarahAssessment?.items.length === 7, 'Sarah assessment has 7 competency items');

  const targetItem = sarahAssessment!.items[0];

  // Create another staff in Acme
  const passwordHash = await bcrypt.hash('TestPassword123!', 10);
  const otherStaff = await prisma.user.create({
    data: {
      name: 'Other Acme Staff',
      email: `other-staff-${Date.now()}@acme.test`,
      passwordHash,
      role: UserRole.STAFF,
      tenantId: acme.id,
      isActive: true,
    },
  });

  // Create another manager in Acme (not Sarah's manager)
  const otherManager = await prisma.user.create({
    data: {
      name: 'Unrelated Manager',
      email: `unrelated-mgr-${Date.now()}@acme.test`,
      passwordHash,
      role: UserRole.MANAGER,
      tenantId: acme.id,
      isActive: true,
    },
  });

  // Create a foreign tenant and foreign staff
  const foreignTenant = await prisma.tenant.create({
    data: {
      name: 'Foreign Org Storage Test',
      slug: `foreign-storage-${Date.now()}`,
      status: TenantStatus.ACTIVE,
      isOnboarded: true,
      seatLimit: 10,
    },
  });

  const foreignStaff = await prisma.user.create({
    data: {
      name: 'Foreign Staff',
      email: `foreign-staff-${Date.now()}@foreign.test`,
      passwordHash,
      role: UserRole.STAFF,
      tenantId: foreignTenant.id,
      isActive: true,
    },
  });

  const createdAttachmentIds: string[] = [];
  const createdStoragePaths: string[] = [];

  try {
    console.log('\n--- SECTION 1: Schema, Upload, and Validation ---');

    // 1.1 Upload valid PDF attachment by Sarah
    const samplePdfBuffer = Buffer.from('%PDF-1.4 sample pdf content for skills assessment evidence');
    const attachment1 = await uploadEvidenceAttachment(
      sarah.id,
      acme.id,
      targetItem.id,
      {
        name: 'architecture-diagram.pdf',
        type: 'application/pdf',
        size: samplePdfBuffer.length,
        buffer: samplePdfBuffer,
      }
    );
    createdAttachmentIds.push(attachment1.id);
    createdStoragePaths.push(attachment1.storagePath);

    assert(!!attachment1.id, '1. EvidenceAttachment record created in DB');
    assert(attachment1.fileName === 'architecture-diagram.pdf', '1. Sanitized file name preserved');
    assert(attachment1.mimeType === 'application/pdf', '1. MIME type stored as application/pdf');
    assert(attachment1.assessmentItemId === targetItem.id, '1. Linked to target AssessmentItem');

    // Verify storage object was written
    const storage = getStorageClient();
    const storageObjectExists = await storage.hasObject(attachment1.storagePath);
    assert(storageObjectExists, '2. Storage object exists at isolated storage path');
    assert(
      attachment1.storagePath.startsWith(`${acme.id}/${sarahAssessment!.id}/${targetItem.id}/`),
      '2. Storage path follows tenantId/assessmentId/assessmentItemId convention'
    );

    // 1.2 Upload second attachment (PNG image) to same AssessmentItem
    const samplePngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const attachment2 = await uploadEvidenceAttachment(
      sarah.id,
      acme.id,
      targetItem.id,
      {
        name: 'test-screenshot.png',
        type: 'image/png',
        size: samplePngBuffer.length,
        buffer: samplePngBuffer,
      }
    );
    createdAttachmentIds.push(attachment2.id);
    createdStoragePaths.push(attachment2.storagePath);

    assert(!!attachment2.id, '3. Multiple attachments linked to one AssessmentItem');

    const itemAttachments = await getAttachmentsForAssessmentItem(targetItem.id, acme.id);
    assert(
      itemAttachments.length === 2,
      `4. getAttachmentsForAssessmentItem returns 2 attachments (got: ${itemAttachments.length})`
    );

    // 1.3 Validation Rejections: Unsupported MIME type
    let unsupportedMimeRejected = false;
    try {
      await uploadEvidenceAttachment(
        sarah.id,
        acme.id,
        targetItem.id,
        {
          name: 'malicious-script.exe',
          type: 'application/x-msdownload',
          size: 1024,
          buffer: Buffer.from('binary-content'),
        }
      );
    } catch {
      unsupportedMimeRejected = true;
    }
    assert(unsupportedMimeRejected, '5. Unsupported MIME type (.exe) rejected with validation error');

    // 1.4 Validation Rejections: Oversized file
    let oversizedRejected = false;
    try {
      await uploadEvidenceAttachment(
        sarah.id,
        acme.id,
        targetItem.id,
        {
          name: 'huge-video.mp4',
          type: 'application/pdf',
          size: MAX_EVIDENCE_FILE_SIZE_BYTES + 1024,
          buffer: Buffer.alloc(1024),
        }
      );
    } catch {
      oversizedRejected = true;
    }
    assert(oversizedRejected, '6. Oversized file (>10MB) rejected with validation error');

    // 1.5 Authorization: Another staff member cannot upload to Sarah's item
    let otherStaffUploadRejected = false;
    try {
      await uploadEvidenceAttachment(
        otherStaff.id,
        acme.id,
        targetItem.id,
        {
          name: 'unauthorized.pdf',
          type: 'application/pdf',
          size: 100,
          buffer: Buffer.from('data'),
        }
      );
    } catch {
      otherStaffUploadRejected = true;
    }
    assert(otherStaffUploadRejected, '7. Other staff member cannot upload to Sarah AssessmentItem');

    // 1.6 Authorization: Foreign tenant staff cannot upload
    let foreignStaffUploadRejected = false;
    try {
      await uploadEvidenceAttachment(
        foreignStaff.id,
        foreignTenant.id,
        targetItem.id,
        {
          name: 'foreign.pdf',
          type: 'application/pdf',
          size: 100,
          buffer: Buffer.from('data'),
        }
      );
    } catch {
      foreignStaffUploadRejected = true;
    }
    assert(foreignStaffUploadRejected, '8. Foreign tenant staff cannot upload to Acme AssessmentItem');

    // 1.7 Invalid AssessmentItem ID rejected
    let invalidItemRejected = false;
    try {
      await uploadEvidenceAttachment(
        sarah.id,
        acme.id,
        'non-existent-item-id',
        {
          name: 'test.pdf',
          type: 'application/pdf',
          size: 100,
          buffer: Buffer.from('data'),
        }
      );
    } catch {
      invalidItemRejected = true;
    }
    assert(invalidItemRejected, '9. Non-existent AssessmentItem ID rejected');

    console.log('\n--- SECTION 2: Persistence & Save Draft Behavior ---');

    // 2.1 Verify Save Draft does NOT delete attachments
    await saveAssessmentDraft(sarah.id, acme.id, {
      assessmentId: sarahAssessment!.id,
      items: [
        {
          assessmentItemId: targetItem.id,
          selfRating: 3,
          evidenceText: 'Demonstrated REST API design and documentation.',
        },
      ],
    });

    const assessmentAfterDraft = await getStaffAssessmentById(sarahAssessment!.id, sarah.id, acme.id);
    assert(
      assessmentAfterDraft?.status === AssessmentStatus.DRAFT,
      '10. Assessment transitioned to DRAFT'
    );
    const targetItemAfterDraft = assessmentAfterDraft?.items.find((i) => i.id === targetItem.id);
    assert(
      targetItemAfterDraft?.evidenceText === 'Demonstrated REST API design and documentation.',
      '11. Text evidence saved successfully'
    );
    assert(
      targetItemAfterDraft?.attachments.length === 2,
      `12. Save Draft preserved attachments (count: ${targetItemAfterDraft?.attachments.length})`
    );

    console.log('\n--- SECTION 3: Delete Permission & Error Handling ---');

    // 3.1 Other user cannot delete Sarah's attachment
    let otherUserDeleteRejected = false;
    try {
      await deleteEvidenceAttachment(otherStaff.id, acme.id, attachment2.id);
    } catch {
      otherUserDeleteRejected = true;
    }
    assert(otherUserDeleteRejected, '13. Other staff member cannot delete Sarah attachment');

    // 3.2 Foreign tenant user cannot delete
    let foreignDeleteRejected = false;
    try {
      await deleteEvidenceAttachment(foreignStaff.id, foreignTenant.id, attachment2.id);
    } catch {
      foreignDeleteRejected = true;
    }
    assert(foreignDeleteRejected, '14. Foreign tenant user cannot delete attachment');

    // 3.3 Sarah deletes attachment2
    await deleteEvidenceAttachment(sarah.id, acme.id, attachment2.id);
    const att2StorageExists = await storage.hasObject(attachment2.storagePath);
    assert(!att2StorageExists, '15. Object removed from storage upon authorized deletion');

    const att2InDb = await prisma.evidenceAttachment.findUnique({
      where: { id: attachment2.id },
    });
    assert(att2InDb === null, '16. DB record removed only after successful storage deletion');

    console.log('\n--- SECTION 4: Signed URL & Secure Retrieval ---');

    // 4.1 Sarah obtains signed URL for her attachment1
    const staffSignedUrl = await getEvidenceAttachmentSignedUrl(
      sarah.id,
      UserRole.STAFF,
      acme.id,
      attachment1.id
    );
    assert(!!staffSignedUrl.url, '17. Staff generates signed download URL');
    assert(
      !staffSignedUrl.url.includes('permanent-public-url'),
      '18. Signed URL is temporary/private, not stored permanent public URL'
    );
    assert(staffSignedUrl.fileName === 'architecture-diagram.pdf', '19. Correct filename returned');

    // 4.2 Michael Manager obtains signed URL for Sarah's attachment
    const managerSignedUrl = await getEvidenceAttachmentSignedUrl(
      michael.id,
      UserRole.MANAGER,
      acme.id,
      attachment1.id
    );
    assert(!!managerSignedUrl.url, '20. Michael Manager can retrieve Sarah attachment signed URL');

    // 4.3 Unrelated Manager cannot access Sarah's attachment
    let unrelatedMgrRejected = false;
    try {
      await getEvidenceAttachmentSignedUrl(
        otherManager.id,
        UserRole.MANAGER,
        acme.id,
        attachment1.id
      );
    } catch {
      unrelatedMgrRejected = true;
    }
    assert(unrelatedMgrRejected, '21. Unrelated manager rejected from accessing Sarah evidence attachment');

    // 4.4 Manager cannot delete staff attachment
    let managerDeleteRejected = false;
    try {
      await deleteEvidenceAttachment(michael.id, acme.id, attachment1.id);
    } catch {
      managerDeleteRejected = true;
    }
    assert(managerDeleteRejected, '22. Manager cannot delete staff evidence attachment');

    // 4.5 Cross-tenant access rejected
    let crossTenantAccessRejected = false;
    try {
      await getEvidenceAttachmentSignedUrl(
        foreignStaff.id,
        UserRole.STAFF,
        foreignTenant.id,
        attachment1.id
      );
    } catch {
      crossTenantAccessRejected = true;
    }
    assert(crossTenantAccessRejected, '23. Cross-tenant access to attachment ID rejected');

    console.log('\n--- SECTION 5: Submission Lock & Manager Corroboration ---');

    // 5.1 Fill all 7 items to submit assessment
    const allItemsPayload = sarahAssessment!.items.map((it) => ({
      assessmentItemId: it.id,
      selfRating: 3,
      evidenceText: 'Completed required projects with production impact.',
    }));

    await submitAssessment(sarah.id, acme.id, {
      assessmentId: sarahAssessment!.id,
      items: allItemsPayload,
    });

    const submittedAssessment = await prisma.assessment.findUnique({
      where: { id: sarahAssessment!.id },
    });
    assert(
      submittedAssessment?.status === AssessmentStatus.PENDING_CORROBORATION,
      '24. Assessment submitted and transitioned to PENDING_CORROBORATION'
    );

    // 5.2 After submission: upload rejected
    let postSubmitUploadRejected = false;
    try {
      await uploadEvidenceAttachment(
        sarah.id,
        acme.id,
        targetItem.id,
        {
          name: 'late-attachment.pdf',
          type: 'application/pdf',
          size: 100,
          buffer: Buffer.from('data'),
        }
      );
    } catch {
      postSubmitUploadRejected = true;
    }
    assert(postSubmitUploadRejected, '25. Upload rejected after assessment submission (locked)');

    // 5.3 After submission: delete rejected
    let postSubmitDeleteRejected = false;
    try {
      await deleteEvidenceAttachment(sarah.id, acme.id, attachment1.id);
    } catch {
      postSubmitDeleteRejected = true;
    }
    assert(postSubmitDeleteRejected, '26. Delete rejected after assessment submission (locked)');

    // 5.4 Manager Corroboration view includes staff attachments
    const managerReview = await getManagerCorroborationById(
      sarahAssessment!.id,
      michael.id,
      acme.id
    );
    assert(!!managerReview, '27. Manager corroboration detail loaded');
    const targetItemInManagerView = managerReview?.items.find((i) => i.id === targetItem.id);
    assert(
      targetItemInManagerView?.attachments.length === 1,
      '28. Manager view includes staff evidence attachments'
    );
    assert(
      targetItemInManagerView?.attachments[0].id === attachment1.id,
      '28. Correct attachment ID visible to manager'
    );

    // 5.5 Complete corroboration
    const corroborationPayload = managerReview!.items.map((it) => ({
      assessmentItemId: it.id,
      rating: it.selfRating || 3,
      justification: null,
    }));

    await submitCorroboration(michael.id, acme.id, {
      assessmentId: sarahAssessment!.id,
      items: corroborationPayload,
    });

    const completedAssessment = await prisma.assessment.findUnique({
      where: { id: sarahAssessment!.id },
    });
    assert(
      completedAssessment?.status === AssessmentStatus.COMPLETED,
      '29. Assessment corroboration completed (status: COMPLETED)'
    );

    // 5.6 Historical immutability: attachments still retrievable
    const postCompleteAttachments = await getAttachmentsForAssessmentItem(targetItem.id, acme.id);
    assert(
      postCompleteAttachments.length === 1,
      '30. Attachments remain intact on COMPLETED assessment'
    );

    // 5.7 User deactivation does NOT delete historical attachments
    await prisma.user.update({
      where: { id: otherStaff.id },
      data: { isActive: false, deactivatedAt: new Date() },
    });
    const stillRetrievable = await getAttachmentsForAssessmentItem(targetItem.id, acme.id);
    assert(stillRetrievable.length === 1, '31. User deactivations do not purge historical attachments');

    // 5.8 Campaign monitoring shows 100% completion
    const stats = await getCampaignMonitoringStats(acme.id, q3Campaign.id);
    assert(stats?.completed === 1, '32. Campaign monitoring reflects completed assessment');
    assert(stats?.completionPercentage === 100, '32. Campaign completion percentage is 100%');
  } finally {
    console.log('\n--- Restoring Sarah Jenkins seeded Q3 assessment to pristine state ---');

    // Remove all test attachments created in test
    for (const path of createdStoragePaths) {
      try {
        const storage = getStorageClient();
        await storage.deleteObject(path);
      } catch {}
    }

    if (createdAttachmentIds.length > 0) {
      await prisma.evidenceAttachment.deleteMany({
        where: { id: { in: createdAttachmentIds } },
      });
    }

    // Clean up corroboration records for Sarah's assessment
    await prisma.corroboration.deleteMany({
      where: {
        assessmentItem: {
          assessmentId: sarahAssessment!.id,
        },
      },
    });

    // Reset Sarah's assessment items to blank
    await prisma.assessmentItem.updateMany({
      where: { assessmentId: sarahAssessment!.id },
      data: {
        selfRating: null,
        evidenceText: null,
        finalRating: null,
      },
    });

    // Reset Sarah's assessment to NOT_STARTED
    await prisma.assessment.update({
      where: { id: sarahAssessment!.id },
      data: {
        status: AssessmentStatus.NOT_STARTED,
        submittedAt: null,
        completedAt: null,
      },
    });

    // Clean up temporary test users
    await prisma.user.deleteMany({
      where: { id: { in: [otherStaff.id, otherManager.id, foreignStaff.id] } },
    });
    await prisma.tenant.delete({ where: { id: foreignTenant.id } });

    // Verify Sarah's Q3 assessment is pristine
    const restoredSarahAssessment = await prisma.assessment.findUnique({
      where: { id: sarahAssessment!.id },
      include: {
        items: {
          include: { attachments: true },
        },
      },
    });

    assert(
      restoredSarahAssessment?.status === AssessmentStatus.NOT_STARTED,
      '33. Sarah Q3 assessment restored to NOT_STARTED'
    );
    assert(
      Boolean(
        restoredSarahAssessment?.items.every(
          (i) => i.selfRating === null && i.evidenceText === null && i.finalRating === null
        )
      ),
      '33. Sarah Q3 assessment items reset to blank (pristine)'
    );
    assert(
      Boolean(restoredSarahAssessment?.items.every((i) => i.attachments.length === 0)),
      '33. Sarah Q3 assessment has 0 lingering attachments'
    );

  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  await prisma.$disconnect();
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('Fatal test error:', err);
  await prisma.$disconnect();
  process.exit(1);
});

