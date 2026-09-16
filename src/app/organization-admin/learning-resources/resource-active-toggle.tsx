'use client';

import { useState, useTransition } from 'react';
import { toggleLearningResourceActiveAction } from '@/actions/learning-resources';

interface Props {
  resourceId: string;
  initialActive: boolean;
}

export function ResourceActiveToggle({ resourceId, initialActive }: Props) {
  const [isActive, setIsActive] = useState(initialActive);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const res = await toggleLearningResourceActiveAction(resourceId);
      if (res.success && res.isActive !== undefined) {
        setIsActive(res.isActive);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200/80'
      } ${isPending ? 'opacity-50' : ''}`}
      title="Click to toggle active status"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          isActive ? 'bg-emerald-500' : 'bg-stone-400'
        }`}
      />
      {isActive ? 'Active' : 'Inactive'}
    </button>
  );
}
