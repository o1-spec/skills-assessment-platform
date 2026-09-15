import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireTenantUser } from '@/lib/auth';
import {
  getCampaignById,
  getActiveCompetenciesForTenant,
  getPublishedRoleProfilesForTenant,
  getEligibleCampaignParticipants,
  getEligibleCampaignTeams,
} from '@/services';
import { CampaignStatus } from '@prisma/client';
import { EditCampaignForm } from './edit-campaign-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignDraftPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireTenantUser();

  const campaign = await getCampaignById(id, user.tenantId);

  if (!campaign) {
    notFound();
  }

  // Active or Closed campaigns cannot be edited
  if (campaign.status !== CampaignStatus.DRAFT) {
    redirect(`/organization-admin/campaigns/${campaign.id}`);
  }

  const [roleProfiles, competencies, staffParticipants, teams] = await Promise.all([
    getPublishedRoleProfilesForTenant(user.tenantId),
    getActiveCompetenciesForTenant(user.tenantId),
    getEligibleCampaignParticipants(user.tenantId),
    getEligibleCampaignTeams(user.tenantId),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div>
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/organization-admin/campaigns" className="hover:text-gray-900 transition-colors">
                Campaigns
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li>
              <Link
                href={`/organization-admin/campaigns/${campaign.id}`}
                className="hover:text-gray-900 transition-colors truncate max-w-xs"
              >
                {campaign.name}
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li className="text-gray-900 font-medium" aria-current="page">
              Edit Draft
            </li>
          </ol>
        </nav>
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-900">Edit Campaign Draft</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            DRAFT
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Modify campaign parameters, scope, selected competencies, or target participants before launching.
        </p>
      </div>

      {/* Edit Form */}
      <EditCampaignForm
        campaign={campaign}
        roleProfiles={roleProfiles}
        competencies={competencies}
        staffParticipants={staffParticipants}
        teams={teams}
      />
    </div>
  );
}
