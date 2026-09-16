'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubscriptionPlanWithStats } from '@/services/plans';
import {
  createSubscriptionPlanAction,
  updateSubscriptionPlanAction,
  toggleSubscriptionPlanActiveAction,
  deleteSubscriptionPlanAction,
} from '@/actions/plans';

interface PlansDirectoryViewProps {
  initialPlans: SubscriptionPlanWithStats[];
}

export function PlansDirectoryView({ initialPlans }: PlansDirectoryViewProps) {
  const router = useRouter();
  const [plans] = useState<SubscriptionPlanWithStats[]>(initialPlans);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanWithStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createDefaultSeats, setCreateDefaultSeats] = useState(25);
  const [createIsActive, setCreateIsActive] = useState(true);

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDefaultSeats, setEditDefaultSeats] = useState(25);
  const [editIsActive, setEditIsActive] = useState(true);

  function openCreateModal() {
    setError(null);
    setCreateName('');
    setCreateDescription('');
    setCreateDefaultSeats(25);
    setCreateIsActive(true);
    setIsCreateModalOpen(true);
  }

  function openEditModal(plan: SubscriptionPlanWithStats) {
    setError(null);
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditDescription(plan.description || '');
    setEditDefaultSeats(plan.defaultSeatLimit);
    setEditIsActive(plan.isActive);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('name', createName);
      formData.set('description', createDescription);
      formData.set('defaultSeatLimit', String(createDefaultSeats));
      formData.set('isActive', String(createIsActive));

      const res = await createSubscriptionPlanAction(formData);
      if (!res.success) {
        setError(res.error || 'Failed to create plan.');
        setIsSubmitting(false);
        return;
      }

      setIsCreateModalOpen(false);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlan) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('name', editName);
      formData.set('description', editDescription);
      formData.set('defaultSeatLimit', String(editDefaultSeats));
      formData.set('isActive', String(editIsActive));

      const res = await updateSubscriptionPlanAction(editingPlan.id, formData);
      if (!res.success) {
        setError(res.error || 'Failed to update plan.');
        setIsSubmitting(false);
        return;
      }

      setEditingPlan(null);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(plan: SubscriptionPlanWithStats) {
    setError(null);
    try {
      const res = await toggleSubscriptionPlanActiveAction(plan.id, !plan.isActive);
      if (!res.success) {
        setError(res.error || 'Failed to toggle plan status.');
        return;
      }
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    }
  }

  async function handleDelete(plan: SubscriptionPlanWithStats) {
    if (plan._count.tenants > 0) {
      setError(`Cannot delete "${plan.name}" because it is assigned to ${plan._count.tenants} organization(s). Deactivate it instead.`);
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete plan "${plan.name}"?`)) {
      return;
    }

    setError(null);
    try {
      const res = await deleteSubscriptionPlanAction(plan.id);
      if (!res.success) {
        setError(res.error || 'Failed to delete plan.');
        return;
      }
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Subscription Plans</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure platform subscription tiers, default seat quotas, and plan availability for tenant provisioning.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Plan
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start space-x-2">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border transition-shadow shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden ${plan.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50/60 opacity-85'
              }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <span
                    className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded text-xs font-semibold ${plan.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                  >
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-extrabold text-indigo-600">{plan.defaultSeatLimit}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Default Seats</div>
                </div>
              </div>

              <p className="mt-4 text-xs text-gray-600 line-clamp-3 min-h-10.5">
                {plan.description || 'No description provided.'}
              </p>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="font-medium">Active Tenants</span>
                <span className="font-bold text-gray-900 px-2 py-0.5 bg-gray-100 rounded-md">
                  {plan._count.tenants} {plan._count.tenants === 1 ? 'organization' : 'organizations'}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleToggleActive(plan)}
                className={`text-xs font-semibold transition-colors ${plan.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'
                  }`}
              >
                {plan.isActive ? 'Deactivate' : 'Activate'}
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => openEditModal(plan)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Edit
                </button>

                {plan._count.tenants === 0 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(plan)}
                    className="text-xs font-semibold text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-5 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Create Subscription Plan</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growth, Enterprise Plus"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of target tier or organizational scope..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Default Seat Limit *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={createDefaultSeats}
                  onChange={(e) => setCreateDefaultSeats(parseInt(e.target.value) || 1)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="createIsActive"
                  checked={createIsActive}
                  onChange={(e) => setCreateIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="createIsActive" className="text-sm font-medium text-gray-700">
                  Active (available for new tenant provisioning)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-5 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Edit Plan: {editingPlan.name}</h3>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Default Seat Limit *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editDefaultSeats}
                  onChange={(e) => setEditDefaultSeats(parseInt(e.target.value) || 1)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="editIsActive" className="text-sm font-medium text-gray-700">
                  Active (available for new tenant provisioning)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
