import Link from 'next/link';
import { requireTenantUser } from '@/lib/auth';
import {
  getActiveCompetenciesForTenant,
  getPublishedRoleProfilesForTenant,
  getEligibleCampaignParticipants,
  getEligibleCampaignTeams,
} from '@/services';
import { CreateCampaignForm } from './create-campaign-form';

export default async function NewCampaignPage() {
  const user = await requireTenantUser();

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
            <li className="text-gray-900 font-medium" aria-current="page">
              New Campaign
            </li>
          </ol>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Create Assessment Campaign</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up a new assessment cycle, choose your scope, select assessed competencies, and target participants.
        </p>
      </div>

      {/* Form Component */}
      <CreateCampaignForm
        roleProfiles={roleProfiles}
        competencies={competencies}
        staffParticipants={staffParticipants}
        teams={teams}
      />
    </div>
  );
}
