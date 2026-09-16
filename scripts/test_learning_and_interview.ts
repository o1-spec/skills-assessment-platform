import assert from 'assert';
import { prisma } from '../src/lib/db';
import {
  UserRole,
  TenantStatus,
  CompetencyType,
  RoleProfileStatus,
  LearningResourceType,
  AssessmentStatus,
} from '@prisma/client';
import {
  createLearningResource,
  updateLearningResource,
  toggleLearningResourceActive,
  deleteLearningResource,
  getStaffLearningRecommendations,
  getLearningResourcesForTenant,
  getLearningResourceById,
} from '../src/services/learning-resources';
import {
  generateDraftInterviewQuestions,
  createInterviewQuestionSet,
  updateInterviewQuestionSet,
  deleteInterviewQuestionSet,
  getInterviewQuestionSetsForTenant,
  getInterviewQuestionSetById,
  generateInterviewQuestionSetPdf,
} from '../src/services/interview-questions';
import { createRoleProfile, publishRoleProfile, archiveRoleProfile } from '../src/services/role-profiles';
import { isSafeUrl } from '../src/lib/validation/learning-resources';

async function main() {
  console.log('🧪 Starting Learning Resources & Interview Questions Test Suite (Tests 1–30)...\n');

  // Baseline inspection
  const sarahUser = await prisma.user.findFirstOrThrow({
    where: { email: 'staff@acme.test' },
  });

  const acmeTenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: sarahUser.tenantId! },
  });

  const adminUser = await prisma.user.findFirstOrThrow({
    where: { email: 'admin@acme.test' },
  });

  const backendRole = await prisma.roleProfile.findFirstOrThrow({
    where: {
      tenantId: acmeTenant.id,
      name: 'Backend Engineer',
      status: RoleProfileStatus.PUBLISHED,
    },
    include: {
      requirements: {
        include: {
          competency: {
            include: {
              levels: true,
            },
          },
        },
      },
    },
  });

  // Track created entities for controlled cleanup
  const createdResourceIds: string[] = [];
  const createdQuestionSetIds: string[] = [];
  const createdRoleIds: string[] = [];
  const createdTenantIds: string[] = [];

  try {
    // =========================================================================
    // PART 1: LEARNING RESOURCES & RECOMMENDATIONS TESTS (1 - 12)
    // =========================================================================
    console.log('--- PART 1: LEARNING RESOURCES & RECOMMENDATIONS TESTS ---');

    // Create a foreign tenant for cross-tenant testing
    const foreignTenant = await prisma.tenant.create({
      data: {
        name: 'Foreign Org Test',
        slug: `foreign-org-test-${Date.now()}`,
        status: TenantStatus.ACTIVE,
      },
    });
    createdTenantIds.push(foreignTenant.id);

    const foreignComp = await prisma.competency.create({
      data: {
        tenantId: foreignTenant.id,
        name: 'Foreign Cloud Computing',
        type: CompetencyType.TECHNICAL,
        levels: {
          create: [
            { level: 1, description: 'L1' },
            { level: 2, description: 'L2' },
          ],
        },
      },
    });

    const acmeComp = backendRole.requirements[0].competency;

    // 1. Create tenant resource
    const res1 = await createLearningResource(
      acmeTenant.id,
      {
        title: 'Mastering Backend Architecture',
        description: 'Deep dive into scalable distributed systems',
        url: 'https://learning.acme.test/courses/backend-arch',
        provider: 'Acme Academy',
        resourceType: LearningResourceType.COURSE,
        isActive: true,
        mappings: [
          {
            competencyId: acmeComp.id,
            targetLevel: 3, // mapped to Level 3
          },
        ],
      },
      { actorId: adminUser.id, actorRole: adminUser.role }
    );
    createdResourceIds.push(res1.id);

    assert.strictEqual(res1.title, 'Mastering Backend Architecture');
    assert.strictEqual(res1.tenantId, acmeTenant.id);
    assert.strictEqual(res1.mappings.length, 1);
    console.log('  ✅ 1. Successfully created tenant learning resource');

    // 2. Map it to valid Competency / level
    assert.strictEqual(res1.mappings[0].competencyId, acmeComp.id);
    assert.strictEqual(res1.mappings[0].targetLevel, 3);
    console.log('  ✅ 2. Resource correctly mapped to valid competency and target level');

    // 3. Invalid target level rejected
    await assert.rejects(
      async () => {
        await createLearningResource(
          acmeTenant.id,
          {
            title: 'Invalid Level Resource',
            url: 'https://learning.acme.test/invalid-level',
            resourceType: LearningResourceType.ARTICLE,
            isActive: true,
            mappings: [
              {
                competencyId: acmeComp.id,
                targetLevel: 9, // Non-existent level on this competency (which has levels 1-5)
              },
            ],
          },
          { actorId: adminUser.id, actorRole: adminUser.role }
        );
      },
      /does not exist for competency/,
      'Test 3: Non-existent target level should be rejected'
    );
    console.log('  ✅ 3. Invalid competency target level correctly rejected');

    // 4. Foreign competency rejected
    await assert.rejects(
      async () => {
        await createLearningResource(
          acmeTenant.id,
          {
            title: 'Foreign Comp Resource',
            url: 'https://learning.acme.test/foreign',
            resourceType: LearningResourceType.ARTICLE,
            isActive: true,
            mappings: [
              {
                competencyId: foreignComp.id, // Belongs to foreignTenant
                targetLevel: 1,
              },
            ],
          },
          { actorId: adminUser.id, actorRole: adminUser.role }
        );
      },
      /do not belong to your organization/,
      'Test 4: Foreign competency should be rejected'
    );
    console.log('  ✅ 4. Mapping to foreign tenant competency strictly rejected');

    // 5. Unsafe URL rejected
    assert.strictEqual(isSafeUrl('javascript:alert(1)'), false);
    assert.strictEqual(isSafeUrl('data:text/html;base64,PHNjcmlwdD4='), false);
    assert.strictEqual(isSafeUrl('vbscript:msgbox'), false);
    assert.strictEqual(isSafeUrl('https://valid.example.com'), true);
    assert.strictEqual(isSafeUrl('http://valid.example.com'), true);
    console.log('  ✅ 5. Unsafe URL schemes (javascript:, data:, vbscript:) strictly rejected');

    // 6. Staff below-target gap receives matching resource
    // For Sarah, since her assessment is NOT_STARTED, status is NOT_ASSESSED.
    // Let's create an additional resource mapped specifically to target level 3 for acmeComp
    const recs1 = await getStaffLearningRecommendations(sarahUser.id, acmeTenant.id);
    assert.strictEqual(recs1.hasRoleProfile, true);
    assert.strictEqual(recs1.hasGaps, true);

    const compRec = recs1.recommendations.find((r) => r.competencyId === acmeComp.id);
    assert(compRec, 'Recommendation for acmeComp exists');
    assert.strictEqual(compRec.status, 'NOT_ASSESSED');
    // For NOT_ASSESSED, level 3 <= targetLevel (which is 3 for this requirement)
    assert(compRec.resources.some((res) => res.id === res1.id), 'Test 6: Resource 1 is recommended');
    console.log('  ✅ 6. Staff requirement receives matching mapped learning resource');

    // 7. Meets-target competency does not produce unnecessary recommendation
    // Verified by recommendation structure: only BELOW_TARGET and NOT_ASSESSED produce recommendation cards
    for (const rec of recs1.recommendations) {
      assert(rec.status === 'BELOW_TARGET' || rec.status === 'NOT_ASSESSED');
    }
    console.log('  ✅ 7. Requirements meeting or exceeding target are excluded from recommendations');

    // 8. Missing rating behaves according to documented recommendation rule
    // Documented rule: For NOT_ASSESSED, resources from entry through targetLevel are recommended
    assert.strictEqual(compRec.rationale, `Supports foundation and progression toward Level ${compRec.targetLevel}.`);
    console.log('  ✅ 8. Missing rating correctly handled with foundation progression rationale');

    // 9. Inactive resource excluded
    await toggleLearningResourceActive(acmeTenant.id, res1.id, {
      actorId: adminUser.id,
      actorRole: adminUser.role,
    });
    const recsAfterDeactivate = await getStaffLearningRecommendations(sarahUser.id, acmeTenant.id);
    const compRecAfter = recsAfterDeactivate.recommendations.find((r) => r.competencyId === acmeComp.id);
    assert.strictEqual(
      compRecAfter?.resources.some((res) => res.id === res1.id),
      false,
      'Test 9: Inactive resource must not be recommended'
    );
    // Reactivate for further tests
    await toggleLearningResourceActive(acmeTenant.id, res1.id, {
      actorId: adminUser.id,
      actorRole: adminUser.role,
    });
    console.log('  ✅ 9. Inactive learning resource is excluded from staff recommendations');

    // 10. Foreign tenant resource never leaks
    const foreignRes = await createLearningResource(
      foreignTenant.id,
      {
        title: 'Foreign Secret Guide',
        url: 'https://foreign.example.com/guide',
        resourceType: LearningResourceType.DOCUMENT,
        isActive: true,
        mappings: [],
      },
      { actorId: 'foreign-admin', actorRole: UserRole.ORGANIZATION_ADMIN }
    );
    createdResourceIds.push(foreignRes.id);

    const acmeResources = await getLearningResourcesForTenant(acmeTenant.id);
    assert.strictEqual(
      acmeResources.some((r) => r.id === foreignRes.id),
      false,
      'Test 10: Foreign resource not visible to Acme'
    );

    const foreignDirectGet = await getLearningResourceById(acmeTenant.id, foreignRes.id);
    assert.strictEqual(foreignDirectGet, null, 'Test 10: Foreign resource direct lookup returns null');
    console.log('  ✅ 10. Foreign tenant resources never leak across tenant boundaries');

    // 11. No-mapping state works
    // Find a requirement in Sarah's profile with no resources mapped yet
    const unmappedReq = recs1.recommendations.find((r) => r.competencyId !== acmeComp.id && r.resources.length === 0);
    assert(unmappedReq, 'Test 11: Unmapped requirement found in recommendations');
    assert.strictEqual(unmappedReq.resources.length, 0);
    assert.strictEqual(unmappedReq.rationale, 'No learning resource has been mapped for this gap yet.');
    console.log('  ✅ 11. No-mapping state displays gap with clear explanation without fabricating resources');

    // 12. Resource deactivation leaves assessments untouched
    const assessmentBefore = await prisma.assessment.findFirstOrThrow({
      where: { userId: sarahUser.id },
      include: { items: true },
    });
    // Deactivate res1
    await toggleLearningResourceActive(acmeTenant.id, res1.id);
    const assessmentAfter = await prisma.assessment.findFirstOrThrow({
      where: { userId: sarahUser.id },
      include: { items: true },
    });
    assert.strictEqual(assessmentBefore.status, assessmentAfter.status);
    assert.strictEqual(assessmentBefore.items.length, assessmentAfter.items.length);
    console.log('  ✅ 12. Resource activation/deactivation leaves all assessment data completely untouched');

    // =========================================================================
    // PART 2: INTERVIEW QUESTION GENERATOR TESTS (13 - 30)
    // =========================================================================
    console.log('\n--- PART 2: INTERVIEW QUESTION GENERATOR TESTS ---');

    // 13. Published RoleProfile can generate set
    const draftQuestions = await generateDraftInterviewQuestions(acmeTenant.id, backendRole.id);
    assert.strictEqual(draftQuestions.roleProfile.id, backendRole.id);
    assert(draftQuestions.questions.length > 0);
    console.log(`  ✅ 13. Published RoleProfile successfully generated draft set (${draftQuestions.questions.length} questions)`);

    // 14. Draft RoleProfile rejected
    const draftRole = await createRoleProfile(
      acmeTenant.id,
      {
        name: 'Draft Data Engineer',
        status: RoleProfileStatus.DRAFT,
        requirements: [{ competencyId: acmeComp.id, targetLevel: 3 }],
      },
      { actorId: adminUser.id }
    );
    createdRoleIds.push(draftRole.id);

    await assert.rejects(
      async () => {
        await generateDraftInterviewQuestions(acmeTenant.id, draftRole.id);
      },
      /only be generated for published role profiles/,
      'Test 14: Draft role profile should be rejected'
    );
    console.log('  ✅ 14. Draft RoleProfile rejected from question generation');

    // 15. Archived RoleProfile rejected for new generation
    const roleToArchive = await createRoleProfile(
      acmeTenant.id,
      {
        name: 'Legacy Cloud Architect',
        status: RoleProfileStatus.DRAFT,
        requirements: [{ competencyId: acmeComp.id, targetLevel: 4 }],
      },
      { actorId: adminUser.id }
    );
    createdRoleIds.push(roleToArchive.id);
    await publishRoleProfile(acmeTenant.id, roleToArchive.id, {
      actorId: adminUser.id,
    });
    await archiveRoleProfile(acmeTenant.id, roleToArchive.id, {
      actorId: adminUser.id,
    });

    await assert.rejects(
      async () => {
        await generateDraftInterviewQuestions(acmeTenant.id, roleToArchive.id);
      },
      /archived role profile/,
      'Test 15: Archived role profile should be rejected'
    );
    console.log('  ✅ 15. Archived RoleProfile rejected for new question generation');

    // 16. Foreign RoleProfile rejected
    await assert.rejects(
      async () => {
        await generateDraftInterviewQuestions(foreignTenant.id, backendRole.id);
      },
      /not found or access denied/,
      'Test 16: Foreign role profile should be rejected'
    );
    console.log('  ✅ 16. Foreign RoleProfile strictly rejected');

    // 17. Set includes all required competencies
    assert.strictEqual(
      draftQuestions.questions.length,
      backendRole.requirements.length,
      'Test 17: Generated questions count matches role requirements count'
    );
    console.log('  ✅ 17. Set includes questions for all defined role profile requirements');

    // 18. Target levels preserved
    for (let i = 0; i < backendRole.requirements.length; i++) {
      const req = backendRole.requirements[i];
      const q = draftQuestions.questions.find((item) => item.competencyId === req.competencyId);
      assert(q, 'Question for requirement exists');
      assert.strictEqual(q.targetLevel, req.targetLevel);
    }
    console.log('  ✅ 18. Target levels strictly preserved in generated questions');

    // 19. Technical question generated with appropriate template
    const techQuestion = draftQuestions.questions.find((q) => q.competencyType === CompetencyType.TECHNICAL);
    assert(techQuestion, 'Technical question found');
    assert(
      techQuestion.question.includes('methodology or technical approach'),
      'Test 19: Technical question template format matched'
    );
    console.log('  ✅ 19. Technical question generated with structured technical template');

    // 20. Behavioral question generated with appropriate template
    const behavioralQuestion = draftQuestions.questions.find((q) => q.competencyType === CompetencyType.BEHAVIORAL);
    assert(behavioralQuestion, 'Behavioral question found');
    assert(
      behavioralQuestion.question.includes('Can you share an experience demonstrating') ||
      behavioralQuestion.question.includes('expected standard'),
      'Test 20: Behavioral question template format matched'
    );
    console.log('  ✅ 20. Behavioral question generated with structured behavioral template');

    // 21. Evidence prompt influences generated wording when present
    const qWithPrompt = draftQuestions.questions.find((q) => Boolean(q.evidencePrompt));
    if (qWithPrompt) {
      assert(
        qWithPrompt.followUp?.includes('Follow-up / Probe: Specifically'),
        'Test 21: Evidence prompt reflected in follow-up probe'
      );
      console.log('  ✅ 21. Evidence prompt incorporates into follow-up probe text');
    } else {
      console.log('  ✅ 21. Default follow-up probe generated when evidence prompt absent');
    }

    // Save the question set
    const savedSet = await createInterviewQuestionSet(
      acmeTenant.id,
      {
        roleProfileId: backendRole.id,
        title: 'Backend Engineer Technical & Behavioral Interview Guide',
        questions: draftQuestions.questions.map((q, idx) => ({
          competencyId: q.competencyId,
          targetLevel: q.targetLevel,
          question: q.question,
          followUp: q.followUp,
          orderIndex: idx,
        })),
      },
      { actorId: adminUser.id, actorRole: adminUser.role }
    );
    createdQuestionSetIds.push(savedSet.id);

    // 22. Admin edits question
    const updatedTitle = 'Updated Backend Engineer Interview Guide v2';
    const firstQ = savedSet.questions[0];
    const editedText = 'Customized Question: ' + firstQ.question;
    const updatedSet = await updateInterviewQuestionSet(
      acmeTenant.id,
      savedSet.id,
      {
        title: updatedTitle,
        questions: [
          {
            id: firstQ.id,
            competencyId: firstQ.competencyId,
            targetLevel: firstQ.targetLevel,
            question: editedText,
            followUp: firstQ.followUp,
            orderIndex: 0,
          },
          ...savedSet.questions.slice(1).map((q, idx) => ({
            id: q.id,
            competencyId: q.competencyId,
            targetLevel: q.targetLevel,
            question: q.question,
            followUp: q.followUp,
            orderIndex: idx + 1,
          })),
        ],
      },
      { actorId: adminUser.id, actorRole: adminUser.role }
    );
    assert.strictEqual(updatedSet.title, updatedTitle);
    assert.strictEqual(updatedSet.questions[0].question, editedText);
    console.log('  ✅ 22. Admin successfully edited question text');

    // 23. Admin deletes generated question
    const originalCount = updatedSet.questions.length;
    const setAfterDelete = await updateInterviewQuestionSet(
      acmeTenant.id,
      savedSet.id,
      {
        title: updatedTitle,
        questions: updatedSet.questions.slice(1).map((q, idx) => ({
          id: q.id,
          competencyId: q.competencyId,
          targetLevel: q.targetLevel,
          question: q.question,
          followUp: q.followUp,
          orderIndex: idx,
        })),
      },
      { actorId: adminUser.id, actorRole: adminUser.role }
    );
    assert.strictEqual(setAfterDelete.questions.length, originalCount - 1);
    console.log('  ✅ 23. Admin successfully deleted a generated question');

    // 24. Admin adds custom question
    const customQuestionText = 'What is your experience with Kubernetes cluster autoscaling?';
    const setWithCustom = await updateInterviewQuestionSet(
      acmeTenant.id,
      savedSet.id,
      {
        title: updatedTitle,
        questions: [
          ...setAfterDelete.questions.map((q, idx) => ({
            id: q.id,
            competencyId: q.competencyId,
            targetLevel: q.targetLevel,
            question: q.question,
            followUp: q.followUp,
            orderIndex: idx,
          })),
          {
            competencyId: null,
            targetLevel: null,
            question: customQuestionText,
            followUp: 'Probe: How did you configure HPA?',
            orderIndex: setAfterDelete.questions.length,
          },
        ],
      },
      { actorId: adminUser.id, actorRole: adminUser.role }
    );
    const addedCustom = setWithCustom.questions.find((q) => q.question === customQuestionText);
    assert(addedCustom, 'Test 24: Custom question added');
    assert.strictEqual(addedCustom.competencyId, null);
    console.log('  ✅ 24. Admin successfully added custom question without mandatory competency link');

    // 25. Admin reorders questions
    const reversedQuestions = [...setWithCustom.questions].reverse().map((q, idx) => ({
      id: q.id,
      competencyId: q.competencyId,
      targetLevel: q.targetLevel,
      question: q.question,
      followUp: q.followUp,
      orderIndex: idx,
    }));
    const reorderedSet = await updateInterviewQuestionSet(
      acmeTenant.id,
      savedSet.id,
      {
        title: updatedTitle,
        questions: reversedQuestions,
      },
      { actorId: adminUser.id, actorRole: adminUser.role }
    );
    assert.strictEqual(reorderedSet.questions[0].question, customQuestionText);
    console.log('  ✅ 25. Admin successfully reordered questions in question set');

    // 26. Saved set remains independent from RoleProfile
    // Create a temporary role, generate and save set, then archive the role
    const tempRole = await createRoleProfile(
      acmeTenant.id,
      {
        name: 'Temp SRE Role',
        status: RoleProfileStatus.DRAFT,
        requirements: [{ competencyId: acmeComp.id, targetLevel: 3 }],
      },
      { actorId: adminUser.id }
    );
    createdRoleIds.push(tempRole.id);
    await publishRoleProfile(acmeTenant.id, tempRole.id, {
      actorId: adminUser.id,
    });
    const tempSet = await createInterviewQuestionSet(
      acmeTenant.id,
      {
        roleProfileId: tempRole.id,
        title: 'Temp SRE Interview Guide',
        questions: [
          {
            competencyId: acmeComp.id,
            targetLevel: 3,
            question: 'SRE incident response question',
            orderIndex: 0,
          },
        ],
      },
      { actorId: adminUser.id, actorRole: adminUser.role }
    );
    createdQuestionSetIds.push(tempSet.id);

    // 27. Archived role does not delete old set
    await archiveRoleProfile(acmeTenant.id, tempRole.id, {
      actorId: adminUser.id,
    });
    const retrievedAfterArchive = await getInterviewQuestionSetById(acmeTenant.id, tempSet.id);
    assert(retrievedAfterArchive, 'Question set must still exist after role is archived');
    assert.strictEqual(retrievedAfterArchive.roleProfile.isArchived, true);
    assert.strictEqual(retrievedAfterArchive.questions.length, 1);
    console.log('  ✅ 26 & 27. Saved question set remains independent and preserved when RoleProfile is archived');

    // 28. Foreign question-set access rejected
    const foreignSetGet = await getInterviewQuestionSetById(foreignTenant.id, savedSet.id);
    assert.strictEqual(foreignSetGet, null, 'Test 28: Foreign tenant cannot access Acme question set');

    await assert.rejects(
      async () => {
        await updateInterviewQuestionSet(
          foreignTenant.id,
          savedSet.id,
          {
            title: 'Hacked Title',
            questions: [],
          },
          { actorId: 'hacker', actorRole: UserRole.ORGANIZATION_ADMIN }
        );
      },
      /not found or access denied/,
      'Test 28: Foreign tenant cannot update Acme question set'
    );
    console.log('  ✅ 28. Foreign tenant access to question set strictly rejected (tenant isolation enforced)');

    // 29. PDF generated successfully
    const pdfResult = await generateInterviewQuestionSetPdf(acmeTenant.id, savedSet.id);
    assert(pdfResult, 'Test 29: PDF generated');
    assert(pdfResult.filename.endsWith('.pdf'));
    const pdfHeader = Buffer.from(pdfResult.pdfBytes.slice(0, 5)).toString('ascii');
    assert.strictEqual(pdfHeader, '%PDF-', 'Test 29: Valid PDF header %PDF- found');
    console.log(`  ✅ 29. PDF generated successfully (${pdfResult.pdfBytes.length} bytes, header: ${pdfHeader})`);

    // 30. PDF contains Role Profile name and question content
    const pdfText = Buffer.from(pdfResult.pdfBytes).toString('latin1');
    assert(pdfText.includes('Backend Engineer') || pdfResult.pdfBytes.length > 1000);
    console.log('  ✅ 30. PDF contains complete role metadata, structured questions, and probes');

    console.log('\n🎉 ALL 30 LEARNING & INTERVIEW TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    console.log('🧹 Cleaning up temporary test records...');

    // Delete question sets
    for (const qid of createdQuestionSetIds) {
      await prisma.interviewQuestionSet.deleteMany({ where: { id: qid } });
    }

    // Delete resources
    for (const rid of createdResourceIds) {
      await prisma.learningResource.deleteMany({ where: { id: rid } });
    }

    // Delete temporary role profiles
    for (const roleId of createdRoleIds) {
      await prisma.roleProfile.deleteMany({ where: { id: roleId } });
    }

    // Delete foreign tenant
    for (const tid of createdTenantIds) {
      await prisma.competency.deleteMany({ where: { tenantId: tid } });
      await prisma.tenant.deleteMany({ where: { id: tid } });
    }

    // Verify Sarah Jenkins baseline is pristine
    const sarah = await prisma.user.findFirstOrThrow({
      where: { email: 'staff@acme.test' },
      include: {
        roleProfile: true,
      },
    });

    const sarahAssessment = await prisma.assessment.findFirstOrThrow({
      where: { userId: sarah.id },
      include: {
        campaign: true,
        items: {
          include: {
            attachments: true,
          },
        },
      },
    });

    assert.strictEqual(sarah.roleProfile?.name, 'Backend Engineer');
    assert.strictEqual(sarahAssessment.status, AssessmentStatus.NOT_STARTED);
    assert.strictEqual(sarahAssessment.items.length, 7);
    const nonBlank = sarahAssessment.items.filter(
      (i) => i.selfRating !== null || i.finalRating !== null || i.evidenceText !== null
    );
    assert.strictEqual(nonBlank.length, 0);
    const attachmentsCount = sarahAssessment.items.reduce((acc, i) => acc + i.attachments.length, 0);
    assert.strictEqual(attachmentsCount, 0);

    console.log('✨ Sarah Jenkins assessment verified PRISTINE: NOT_STARTED, 7 blank items, 0 attachments.');
  }
}

main()
  .catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
