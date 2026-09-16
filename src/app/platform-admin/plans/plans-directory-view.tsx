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
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Subscription Plans</h1>
          <p className="text-xs text-stone-500 mt-1">
            Configure platform subscription tiers, default seat quotas, and plan availability for tenant provisioning.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-xs font-semibold rounded-xl shadow-2xs text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Plan
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-800 flex items-start space-x-2.5">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl border transition-shadow shadow-xs hover:shadow-sm flex flex-col justify-between overflow-hidden ${
              plan.isActive ? 'border-stone-200/80' : 'border-stone-200/80 bg-stone-50/60 opacity-85'
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">{plan.name}</h3>
                  <span
                    className={`inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      plan.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : 'bg-stone-100 text-stone-600 border border-stone-200/80'
                    }`}
                  >
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-neutral-900">{plan.defaultSeatLimit}</div>
                  <div className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">Default Seats</div>
                </div>
              </div>

              <p className="mt-4 text-xs text-stone-600 line-clamp-3 min-h-10.5 leading-relaxed">
                {plan.description || 'No description provided.'}
              </p>

              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span className="font-medium">Active Tenants</span>
                <span className="font-bold text-neutral-900 px-2.5 py-0.5 bg-stone-100 border border-stone-200/80 rounded-lg">
                  {plan._count.tenants} {plan._count.tenants === 1 ? 'organization' : 'organizations'}
                </span>
              </div>
            </div>

            <div className="bg-stone-50/70 px-6 py-3.5 border-t border-stone-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleToggleActive(plan)}
                className={`text-xs font-semibold transition-colors cursor-pointer ${
                  plan.isActive ? 'text-amber-700 hover:text-amber-900' : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                {plan.isActive ? 'Deactivate' : 'Activate'}
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => openEditModal(plan)}
                  className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 cursor-pointer"
                >
                  Edit
                </button>

                {plan._count.tenants === 0 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(plan)}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 border border-stone-200/80">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900">Create Subscription Plan</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-neutral-700 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growth, Enterprise Plus"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200/80 rounded-xl focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of target tier or organizational scope..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200/80 rounded-xl focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Default Seat Limit *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={createDefaultSeats}
                  onChange={(e) => setCreateDefaultSeats(parseInt(e.target.value) || 1)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200/80 rounded-xl focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="createIsActive"
                  checked={createIsActive}
                  onChange={(e) => setCreateIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-neutral-900 accent-neutral-900 focus:ring-neutral-900"
                />
                <label htmlFor="createIsActive" className="text-xs font-semibold text-neutral-800">
                  Active (available for new tenant provisioning)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-stone-200/80 rounded-xl text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-xl text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 border border-stone-200/80">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900">Edit Plan: {editingPlan.name}</h3>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="text-stone-400 hover:text-neutral-700 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200/80 rounded-xl focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200/80 rounded-xl focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Default Seat Limit *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editDefaultSeats}
                  onChange={(e) => setEditDefaultSeats(parseInt(e.target.value) || 1)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200/80 rounded-xl focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-neutral-900 accent-neutral-900 focus:ring-neutral-900"
                />
                <label htmlFor="editIsActive" className="text-xs font-semibold text-neutral-800">
                  Active (available for new tenant provisioning)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 border border-stone-200/80 rounded-xl text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-xl text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 shadow-2xs cursor-pointer"
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
