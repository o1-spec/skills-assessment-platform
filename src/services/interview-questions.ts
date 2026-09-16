import { prisma } from '@/lib/db';
import {
  AuditAction,
  CompetencyType,
  InterviewQuestion,
  InterviewQuestionSet,
  RoleProfileStatus,
} from '@prisma/client';
import { logAuditEvent, AuditActorContext } from './audit';
import {
  SaveInterviewQuestionSetInput,
  UpdateInterviewQuestionSetInput,
  saveInterviewQuestionSetSchema,
  updateInterviewQuestionSetSchema,
} from '@/lib/validation/interview-questions';
import { PDFDocument, PDFFont, rgb, StandardFonts } from 'pdf-lib';

export interface GeneratedQuestionItem {
  competencyId: string;
  competencyName: string;
  competencyType: CompetencyType;
  targetLevel: number;
  levelDescription: string;
  evidencePrompt: string | null;
  question: string;
  followUp: string | null;
  orderIndex: number;
}

export interface InterviewQuestionSetWithDetails extends InterviewQuestionSet {
  roleProfile: {
    id: string;
    name: string;
    description: string | null;
    status: RoleProfileStatus;
    isArchived: boolean;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  questions: Array<
    InterviewQuestion & {
      competency: {
        id: string;
        name: string;
        type: CompetencyType;
      } | null;
    }
  >;
}

export async function generateDraftInterviewQuestions(
  tenantId: string,
  roleProfileId: string
): Promise<{
  roleProfile: { id: string; name: string; description: string | null };
  suggestedTitle: string;
  questions: GeneratedQuestionItem[];
}> {
  if (!tenantId || !roleProfileId) {
    throw new Error('Tenant ID and Role Profile ID are required');
  }

  const roleProfile = await prisma.roleProfile.findFirst({
    where: {
      id: roleProfileId,
      tenantId,
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
        orderBy: [
          { competency: { type: 'asc' } },
          { competency: { name: 'asc' } },
        ],
      },
    },
  });

  if (!roleProfile) {
    throw new Error('Role profile not found or access denied');
  }

  if (roleProfile.status !== RoleProfileStatus.PUBLISHED) {
    throw new Error('Interview question sets can only be generated for published role profiles');
  }

  if (roleProfile.isArchived) {
    throw new Error('Cannot generate interview question set for an archived role profile');
  }

  if (roleProfile.requirements.length === 0) {
    throw new Error('Role profile has no requirements defined');
  }

  const questions: GeneratedQuestionItem[] = [];

  for (let i = 0; i < roleProfile.requirements.length; i++) {
    const req = roleProfile.requirements[i];
    const comp = req.competency;
    const targetLevelObj = comp.levels.find((l) => l.level === req.targetLevel);

    const levelDescription =
      targetLevelObj?.description?.trim() ||
      `Demonstrates Level ${req.targetLevel} proficiency in ${comp.name}`;

    const rawPrompt = targetLevelObj?.evidencePrompt?.trim() || null;

    let primaryQuestion = '';
    let followUp = '';

    if (comp.type === CompetencyType.TECHNICAL) {
      primaryQuestion = `Describe a situation where you applied ${comp.name} to deliver work requiring: "${levelDescription}". What methodology or technical approach did you take, and what was the outcome?`;

      if (rawPrompt) {
        followUp = `Follow-up / Probe: Specifically, ${rawPrompt.charAt(0).toLowerCase() + rawPrompt.slice(1)}`;
      } else {
        followUp = `Follow-up / Probe: What technical trade-offs, architecture constraints, or debugging challenges did you navigate during this work?`;
      }
    } else {
      primaryQuestion = `Can you share an experience demonstrating ${comp.name}? How did your specific actions reflect the expected standard: "${levelDescription}"?`;

      if (rawPrompt) {
        followUp = `Follow-up / Probe: Specifically, ${rawPrompt.charAt(0).toLowerCase() + rawPrompt.slice(1)}`;
      } else {
        followUp = `Follow-up / Probe: How did you communicate with stakeholders or team members, and how did your actions impact team effectiveness?`;
      }
    }

    questions.push({
      competencyId: comp.id,
      competencyName: comp.name,
      competencyType: comp.type,
      targetLevel: req.targetLevel,
      levelDescription,
      evidencePrompt: rawPrompt,
      question: primaryQuestion,
      followUp,
      orderIndex: i,
    });
  }

  return {
    roleProfile: {
      id: roleProfile.id,
      name: roleProfile.name,
      description: roleProfile.description,
    },
    suggestedTitle: `${roleProfile.name} - Interview Guide & Evaluation Questions`,
    questions,
  };
}

export async function getInterviewQuestionSetsForTenant(
  tenantId: string
): Promise<InterviewQuestionSetWithDetails[]> {
  if (!tenantId) return [];

  const sets = await prisma.interviewQuestionSet.findMany({
    where: { tenantId },
    include: {
      roleProfile: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          isArchived: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      questions: {
        include: {
          competency: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return sets as InterviewQuestionSetWithDetails[];
}

export async function getInterviewQuestionSetById(
  tenantId: string,
  id: string
): Promise<InterviewQuestionSetWithDetails | null> {
  if (!tenantId || !id) return null;

  const set = await prisma.interviewQuestionSet.findFirst({
    where: { id, tenantId },
    include: {
      roleProfile: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          isArchived: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      questions: {
        include: {
          competency: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return set as InterviewQuestionSetWithDetails | null;
}

export async function createInterviewQuestionSet(
  tenantId: string,
  input: SaveInterviewQuestionSetInput,
  actor: AuditActorContext & { actorId: string }
): Promise<InterviewQuestionSetWithDetails> {
  const validated = saveInterviewQuestionSetSchema.parse(input);

  const roleProfile = await prisma.roleProfile.findFirst({
    where: {
      id: validated.roleProfileId,
      tenantId,
    },
  });

  if (!roleProfile) {
    throw new Error('Role profile not found or access denied');
  }

  if (roleProfile.status !== RoleProfileStatus.PUBLISHED) {
    throw new Error('Interview question sets can only be created for published role profiles');
  }

  if (roleProfile.isArchived) {
    throw new Error('Cannot create interview question set for an archived role profile');
  }

  const compIds = validated.questions
    .map((q) => q.competencyId)
    .filter((id): id is string => Boolean(id));

  if (compIds.length > 0) {
    const tenantComps = await prisma.competency.findMany({
      where: {
        id: { in: compIds },
        tenantId,
      },
    });

    if (tenantComps.length !== new Set(compIds).size) {
      throw new Error('One or more referenced competencies do not belong to your organization');
    }
  }

  const questionSet = await prisma.$transaction(async (tx) => {
    const created = await tx.interviewQuestionSet.create({
      data: {
        tenantId,
        roleProfileId: validated.roleProfileId,
        title: validated.title,
        createdById: actor.actorId,
      },
    });

    const questionsData = validated.questions.map((q, index) => ({
      questionSetId: created.id,
      competencyId: q.competencyId || null,
      targetLevel: q.targetLevel || null,
      question: q.question,
      followUp: q.followUp || null,
      orderIndex: q.orderIndex !== undefined ? q.orderIndex : index,
    }));

    await tx.interviewQuestion.createMany({
      data: questionsData,
    });

    return tx.interviewQuestionSet.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        roleProfile: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            isArchived: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        questions: {
          include: {
            competency: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  });

  await logAuditEvent({
    tenantId,
    actorId: actor.actorId,
    actorRole: actor.actorRole || null,
    action: AuditAction.INTERVIEW_QUESTION_SET_CREATE,
    resourceType: 'InterviewQuestionSet',
    resourceId: questionSet.id,
    details: {
      title: questionSet.title,
      roleProfileId: questionSet.roleProfileId,
      roleProfileName: questionSet.roleProfile.name,
      questionsCount: questionSet.questions.length,
    },
    ipAddress: actor.ipAddress || null,
    userAgent: actor.userAgent || null,
  });

  return questionSet as InterviewQuestionSetWithDetails;
}

export async function updateInterviewQuestionSet(
  tenantId: string,
  id: string,
  input: UpdateInterviewQuestionSetInput,
  actor: AuditActorContext & { actorId: string }
): Promise<InterviewQuestionSetWithDetails> {
  const existing = await prisma.interviewQuestionSet.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Interview question set not found or access denied');
  }

  const validated = updateInterviewQuestionSetSchema.parse(input);

  const compIds = validated.questions
    .map((q) => q.competencyId)
    .filter((cid): cid is string => Boolean(cid));

  if (compIds.length > 0) {
    const tenantComps = await prisma.competency.findMany({
      where: {
        id: { in: compIds },
        tenantId,
      },
    });

    if (tenantComps.length !== new Set(compIds).size) {
      throw new Error('One or more referenced competencies do not belong to your organization');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.interviewQuestionSet.update({
      where: { id },
      data: {
        title: validated.title,
      },
    });

    await tx.interviewQuestion.deleteMany({
      where: { questionSetId: id },
    });

    const questionsData = validated.questions.map((q, index) => ({
      questionSetId: id,
      competencyId: q.competencyId || null,
      targetLevel: q.targetLevel || null,
      question: q.question,
      followUp: q.followUp || null,
      orderIndex: q.orderIndex !== undefined ? q.orderIndex : index,
    }));

    await tx.interviewQuestion.createMany({
      data: questionsData,
    });

    return tx.interviewQuestionSet.findUniqueOrThrow({
      where: { id },
      include: {
        roleProfile: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            isArchived: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        questions: {
          include: {
            competency: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  });

  await logAuditEvent({
    tenantId,
    actorId: actor.actorId,
    actorRole: actor.actorRole || null,
    action: AuditAction.INTERVIEW_QUESTION_SET_UPDATE,
    resourceType: 'InterviewQuestionSet',
    resourceId: updated.id,
    details: {
      title: updated.title,
      questionsCount: updated.questions.length,
    },
    ipAddress: actor.ipAddress || null,
    userAgent: actor.userAgent || null,
  });

  return updated as InterviewQuestionSetWithDetails;
}

export async function deleteInterviewQuestionSet(
  tenantId: string,
  id: string,
  actor: AuditActorContext & { actorId: string }
): Promise<void> {
  const existing = await prisma.interviewQuestionSet.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Interview question set not found or access denied');
  }

  await prisma.interviewQuestionSet.delete({
    where: { id },
  });

  await logAuditEvent({
    tenantId,
    actorId: actor.actorId,
    actorRole: actor.actorRole || null,
    action: AuditAction.INTERVIEW_QUESTION_SET_DELETE,
    resourceType: 'InterviewQuestionSet',
    resourceId: id,
    details: {
      deleted: true,
      title: existing.title,
    },
    ipAddress: actor.ipAddress || null,
    userAgent: actor.userAgent || null,
  });
}

export async function generateInterviewQuestionSetPdf(
  tenantId: string,
  id: string
): Promise<{ filename: string; pdfBytes: Uint8Array } | null> {
  const set = await getInterviewQuestionSetById(tenantId, id);
  if (!set) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  const orgName = tenant?.name || 'Organization';

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const primaryColor = rgb(0.12, 0.23, 0.54);
  const textColor = rgb(0.07, 0.09, 0.15);
  const mutedColor = rgb(0.35, 0.4, 0.47);
  const lightBg = rgb(0.96, 0.97, 0.98);
  const borderColor = rgb(0.88, 0.9, 0.93);
  const technicalColor = rgb(0.1, 0.45, 0.85);
  const behavioralColor = rgb(0.55, 0.2, 0.8);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawHeaderSmall = () => {
    currentPage.drawText(
      `${orgName.toUpperCase()} — INTERVIEW GUIDE: ${set.roleProfile.name.toUpperCase()}`,
      {
        x: margin,
        y: pageHeight - 25,
        size: 8,
        font: fontRegular,
        color: mutedColor,
      }
    );
    currentPage.drawLine({
      start: { x: margin, y: pageHeight - 30 },
      end: { x: pageWidth - margin, y: pageHeight - 30 },
      thickness: 0.5,
      color: borderColor,
    });
  };

  const ensureSpace = (neededHeight: number): void => {
    if (y - neededHeight < margin + 40) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeaderSmall();
    }
  };

  const wrapText = (text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  currentPage.drawText(orgName.toUpperCase(), {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: primaryColor,
  });
  y -= 18;

  currentPage.drawText(set.title, {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: textColor,
  });
  y -= 16;

  currentPage.drawText(
    `Role Profile: ${set.roleProfile.name}  |  Generated: ${new Date().toLocaleDateString(
      'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    )}  |  Questions: ${set.questions.length}`,
    {
      x: margin,
      y,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    }
  );
  y -= 24;

  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: borderColor,
  });
  y -= 25;

  for (let idx = 0; idx < set.questions.length; idx++) {
    const q = set.questions[idx];
    const comp = q.competency;
    const qLines = wrapText(q.question, contentWidth - 24, fontRegular, 10);
    const followUpLines = q.followUp
      ? wrapText(q.followUp, contentWidth - 24, fontOblique, 9)
      : [];

    const itemHeight = 36 + qLines.length * 14 + (followUpLines.length > 0 ? followUpLines.length * 13 + 12 : 0) + 16;

    ensureSpace(itemHeight);

    currentPage.drawRectangle({
      x: margin,
      y: y - itemHeight + 16,
      width: contentWidth,
      height: itemHeight - 8,
      color: lightBg,
      borderColor,
      borderWidth: 0.5,
    });

    const tagText = comp
      ? `${comp.name} (Level ${q.targetLevel || '-'}) • ${comp.type}`
      : 'General Question';
    const tagColor = comp?.type === CompetencyType.TECHNICAL ? technicalColor : behavioralColor;

    currentPage.drawText(`Question ${idx + 1}: ${tagText}`, {
      x: margin + 12,
      y: y - 12,
      size: 10,
      font: fontBold,
      color: tagColor,
    });

    let currentY = y - 28;
    for (const line of qLines) {
      currentPage.drawText(line, {
        x: margin + 12,
        y: currentY,
        size: 10,
        font: fontRegular,
        color: textColor,
      });
      currentY -= 14;
    }

    if (followUpLines.length > 0) {
      currentY -= 4;
      for (const line of followUpLines) {
        currentPage.drawText(line, {
          x: margin + 12,
          y: currentY,
          size: 9,
          font: fontOblique,
          color: mutedColor,
        });
        currentY -= 13;
      }
    }

    y -= itemHeight + 8;
  }

  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    page.drawLine({
      start: { x: margin, y: margin + 15 },
      end: { x: pageWidth - margin, y: margin + 15 },
      thickness: 0.5,
      color: borderColor,
    });
    page.drawText(
      `Confidential — For Hiring & Evaluation Use Only  |  Page ${i + 1} of ${totalPages}`,
      {
        x: margin,
        y: margin + 4,
        size: 8,
        font: fontRegular,
        color: mutedColor,
      }
    );
  }

  const pdfBytes = await pdfDoc.save();
  const slug = set.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return {
    filename: `${slug || 'interview-guide'}.pdf`,
    pdfBytes,
  };
}
