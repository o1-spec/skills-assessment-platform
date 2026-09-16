import { AssessmentStatus, CampaignStatus, RoleProfileStatus } from '@prisma/client';

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'object' ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAssessmentStatus(status: AssessmentStatus | string): string {
  switch (status) {
    case AssessmentStatus.NOT_STARTED:
      return 'Not Started';
    case AssessmentStatus.DRAFT:
      return 'In Progress (Draft)';
    case AssessmentStatus.PENDING_CORROBORATION:
      return 'Pending Corroboration';
    case AssessmentStatus.SUBMITTED:
      return 'Submitted';
    case AssessmentStatus.COMPLETED:
      return 'Completed';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function formatCampaignStatus(status: CampaignStatus | string): string {
  switch (status) {
    case CampaignStatus.ACTIVE:
      return 'Active';
    case CampaignStatus.DRAFT:
      return 'Draft';
    case CampaignStatus.CLOSED:
      return 'Closed';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function formatRoleStatus(status: RoleProfileStatus | string): string {
  switch (status) {
    case RoleProfileStatus.PUBLISHED:
      return 'Published';
    case RoleProfileStatus.DRAFT:
      return 'Draft';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function formatGapStatus(status: string): string {
  switch (status) {
    case 'BELOW_TARGET':
      return 'Below Target';
    case 'MEETS_TARGET':
      return 'Meets Target';
    case 'EXCEEDS_TARGET':
      return 'Exceeds Target';
    default:
      return status.replace(/_/g, ' ');
  }
}
