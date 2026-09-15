import { AssessmentStatus, CampaignStatus, RoleProfileStatus } from '@prisma/client';

/**
 * Formats a Date or ISO string into a standard, human-readable date.
 * Example output: "15 Sep 2026"
 */
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

/**
 * Returns human-friendly text for assessment lifecycle statuses.
 */
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

/**
 * Returns human-friendly text for assessment campaign statuses.
 */
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

/**
 * Returns human-friendly text for role profile statuses.
 */
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

/**
 * Returns human-friendly text for gap statuses.
 */
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
