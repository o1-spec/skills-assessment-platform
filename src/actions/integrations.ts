'use server';

import { getCurrentUser } from '@/lib/auth/service';
import { updateIntegrationConfiguration } from '@/services/integrations';
import { UserRole, IntegrationProviderType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function updateIntegrationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.PLATFORM_ADMIN) {
    throw new Error('Unauthorized: Platform Administrator access required.');
  }

  const providerType = formData.get('providerType') as IntegrationProviderType;
  const providerName = formData.get('providerName')?.toString();
  const isEnabled = formData.get('isEnabled') === 'true' || formData.get('isEnabled') === 'on';
  const metadataRaw = formData.get('metadata')?.toString();

  if (!providerType || !providerName) {
    throw new Error('Provider type and provider name are required.');
  }

  let metadata: Record<string, unknown> | undefined;
  if (metadataRaw && metadataRaw.trim()) {
    try {
      metadata = JSON.parse(metadataRaw.trim());
    } catch {
      throw new Error('Integration metadata must be valid JSON.');
    }
  }

  await updateIntegrationConfiguration(user.id, {
    providerType,
    providerName,
    isEnabled,
    metadata,
  });

  revalidatePath('/platform-admin/integrations');
}
