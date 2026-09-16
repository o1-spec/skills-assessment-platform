'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RoleProfileStatus } from '@prisma/client';
import {
  publishRoleProfileAction,
  archiveRoleProfileAction,
  unarchiveRoleProfileAction,
} from '../actions';

interface RoleActionsProps {
  roleProfile: {
    id: string;
    name: string;
    status: RoleProfileStatus;
    isArchived: boolean;
    requirementsCount: number;
    assignedUsersCount: number;
  };
}

export function RoleActions({ roleProfile }: RoleActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const isDraft = roleProfile.status === RoleProfileStatus.DRAFT;
  const isArchived = roleProfile.isArchived;

  const handlePublish = () => {
    if (roleProfile.requirementsCount === 0) {
      setError('Cannot publish a role profile with 0 competencies.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await publishRoleProfileAction(roleProfile.id);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to publish role profile.');
      }
    });
  };

  const handleArchive = () => {
    setError(null);
    startTransition(async () => {
      try {
        await archiveRoleProfileAction(roleProfile.id);
        setShowArchiveConfirm(false);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to archive role profile.');
      }
    });
  };

  const handleUnarchive = () => {
    setError(null);
    startTransition(async () => {
      try {
        await unarchiveRoleProfileAction(roleProfile.id);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to unarchive role profile.');
      }
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 text-xs rounded-md bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        {isDraft && !isArchived && (
          <Link
            href={`/organization-admin/roles/${roleProfile.id}/edit`}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="-ml-0.5 mr-1.5 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Role Profile
          </Link>
        )}

        {isDraft && !isArchived && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPending}
            className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
          >
            <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            {isPending ? 'Publishing...' : 'Publish Role'}
          </button>
        )}

        {!isArchived && (
          <button
            type="button"
            onClick={() => setShowArchiveConfirm(true)}
            disabled={isPending}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
          >
            <svg className="-ml-0.5 mr-1.5 h-4 w-4 text-gray-400 group-hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Archive Role
          </button>
        )}

        {isArchived && (
          <button
            type="button"
            onClick={handleUnarchive}
            disabled={isPending}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            <svg className="-ml-0.5 mr-1.5 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isPending ? 'Restoring...' : 'Unarchive Role'}
          </button>
        )}
      </div>

      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Archive Role Profile</h3>
                <p className="text-xs text-gray-500">Safe retirement of role benchmark</p>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                Are you sure you want to archive <strong className="text-gray-900">{roleProfile.name}</strong>?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">What happens when archived:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Existing users and historical assessments retain their association.</li>
                  <li>This role will no longer be available for new user assignments or new campaigns.</li>
                  <li>You can unarchive this role profile at any time.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(false)}
                disabled={isPending}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isPending ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
