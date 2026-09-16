'use client';

import { useActionState, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  submitCorroborationAction,
  CorroborationFormActionState,
} from '../actions';
import { ManagerCorroborationDetail } from '@/services';
import { CompetencyType } from '@prisma/client';
import { EvidenceAttachmentsSection } from '@/app/staff/assessments/[id]/evidence-attachments-section';

interface CorroborationFormProps {
  assessment: ManagerCorroborationDetail;
}

const initialActionState: CorroborationFormActionState = {};

export function CorroborationForm({ assessment }: CorroborationFormProps) {
  const [reviews, setReviews] = useState<
    Record<string, { rating: number; justification: string }>
  >(() => {
    const initial: Record<string, { rating: number; justification: string }> = {};
    for (const item of assessment.items) {
      initial[item.id] = {
        rating: item.selfRating || (item.competency.levels[0]?.level ?? 1),
        justification: item.corroboration?.justification || '',
      };
    }
    return initial;
  });

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [state, formAction, isPending] = useActionState(
    submitCorroborationAction,
    initialActionState
  );
  const [, startTransition] = useTransition();

  const totalItems = assessment.items.length;
  const changedItemsCount = assessment.items.filter(
    (item) => reviews[item.id]?.rating !== item.selfRating
  ).length;

  const technicalItems = assessment.items.filter(
    (i) => i.competency.type === CompetencyType.TECHNICAL
  );
  const behavioralItems = assessment.items.filter(
    (i) => i.competency.type === CompetencyType.BEHAVIORAL
  );

  const handleRatingChange = (itemId: string, newRating: number) => {
    setReviews((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        rating: newRating,
      },
    }));
  };

  const handleJustificationChange = (itemId: string, text: string) => {
    setReviews((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        justification: text,
      },
    }));
  };

  const getPayload = () => {
    return Object.entries(reviews).map(([itemId, val]) => ({
      assessmentItemId: itemId,
      rating: val.rating,
      justification: val.justification.trim() === '' ? null : val.justification,
    }));
  };

  const handleOpenConfirmModal = () => {
    const errors: string[] = [];

    for (const item of assessment.items) {
      const review = reviews[item.id];
      if (!review || !review.rating) {
        errors.push(`"${item.competency.name}" requires a rating.`);
        continue;
      }

      if (review.rating !== item.selfRating) {
        if (!review.justification || review.justification.trim().length === 0) {
          errors.push(
            `Justification is required for "${item.competency.name}" because the rating was changed from Level ${item.selfRating} to Level ${review.rating}.`
          );
        }
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationErrors([]);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    const formData = new FormData();
    formData.append('assessmentId', assessment.id);
    formData.append('items', JSON.stringify(getPayload()));

    setIsConfirmModalOpen(false);
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-xs sticky top-16 z-20 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">
              Corroboration Review
            </div>
            <div className="text-sm font-bold text-neutral-900 mt-0.5">
              {assessment.user.name} &bull; {totalItems} Competencies ({changedItemsCount} adjusted)
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/manager/corroborations"
              className="inline-flex items-center px-3.5 py-2 border border-stone-200/80 text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs transition-colors"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleOpenConfirmModal}
              disabled={isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Completing Review...' : 'Complete Review'}
            </button>
          </div>
        </div>
      </div>

      {state?.error && (
        <div className="rounded-2xl bg-red-50 p-4 border border-red-200 text-xs text-red-800">
          {state.error}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="rounded-2xl bg-amber-50/90 p-4 border border-amber-200 text-xs text-amber-900 space-y-2">
          <h3 className="font-semibold text-amber-950">
            Please resolve the following before completing the review:
          </h3>
          <ul className="list-disc list-inside text-amber-800 space-y-1">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-8">
        {technicalItems.length > 0 && (
          <div className="space-y-6">
            <div className="border-b border-stone-200/80 pb-2">
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neutral-900" />
                Technical Competencies
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Verify technical proficiency ratings and supporting evidence.
              </p>
            </div>

            <div className="space-y-6">
              {technicalItems.map((item, index) => renderReviewCard(item, index + 1))}
            </div>
          </div>
        )}

        {behavioralItems.length > 0 && (
          <div className="space-y-6">
            <div className="border-b border-stone-200/80 pb-2">
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Behavioral Competencies
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Verify collaboration, communication, and leadership capabilities.
              </p>
            </div>

            <div className="space-y-6">
              {behavioralItems.map((item, index) =>
                renderReviewCard(item, technicalItems.length + index + 1)
              )}
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-stone-200/80 flex items-center justify-between">
          <Link
            href="/manager/corroborations"
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            &larr; Back to Corroboration Queue
          </Link>

          <button
            type="button"
            onClick={handleOpenConfirmModal}
            disabled={isPending}
            className="px-5 py-2 border border-transparent text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 shadow-2xs transition-colors"
          >
            Complete Review
          </button>
        </div>
      </div>

      {isConfirmModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-stone-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Complete Corroboration Review</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Assessment evaluation for {assessment.user.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              You are about to complete this review. The assessment will be finalized and capability ratings stored.
            </p>

            {changedItemsCount > 0 && (
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900">
                You have adjusted {changedItemsCount} self-rating(s) with supporting justification.
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 border border-stone-200/80 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs"
              >
                Confirm & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderReviewCard(
    item: ManagerCorroborationDetail['items'][number],
    num: number
  ) {
    const currentReview = reviews[item.id] || {
      rating: item.selfRating || 1,
      justification: '',
    };
    const isRatingChanged = currentReview.rating !== item.selfRating;
    const staffSelectedLevel = item.competency.levels.find(
      (l) => l.level === item.selfRating
    );

    return (
      <div
        key={item.id}
        className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 space-y-5 shadow-xs ${isRatingChanged ? 'border-amber-300 ring-1 ring-amber-300/60' : 'border-stone-200/80'
          }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold text-neutral-400 font-mono">#{num}</span>
            <h3 className="text-base font-bold text-neutral-900">{item.competency.name}</h3>
            <span
              className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${item.competency.type === CompetencyType.TECHNICAL
                  ? 'bg-stone-100 text-neutral-800 border-stone-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
            >
              {item.competency.type}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-neutral-700 border border-stone-200">
              Staff Self-Rating: Level {item.selfRating}
            </span>
            {isRatingChanged && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Adjusted to Level {currentReview.rating}
              </span>
            )}
          </div>
        </div>

        {/* Staff Submission Zone */}
        <div className="bg-stone-50/70 rounded-xl p-4 border border-stone-200/70 space-y-3">
          <div>
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              Staff Self-Rating: Level {item.selfRating}
            </div>
            {staffSelectedLevel && (
              <p className="text-xs text-neutral-700 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs leading-relaxed">
                <span className="font-semibold text-neutral-900">Benchmark:</span>{' '}
                {staffSelectedLevel.description}
              </p>
            )}
          </div>

          <div>
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              Supporting Evidence Provided by Staff:
            </div>
            {item.evidenceText ? (
              <p className="text-xs text-neutral-700 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs whitespace-pre-wrap leading-relaxed">
                {item.evidenceText}
              </p>
            ) : (
              <p className="text-xs text-neutral-400 italic bg-white p-3 rounded-xl border border-stone-200">
                No supporting evidence was submitted.
              </p>
            )}

            <EvidenceAttachmentsSection
              assessmentItemId={item.id}
              assessmentId={assessment.id}
              initialAttachments={item.attachments || []}
              isReadOnly={true}
              isManager={true}
            />
          </div>
        </div>

        {/* Manager Corroboration Selection */}
        <div className="space-y-2.5 pt-2 border-t border-stone-100">
          <div className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
            Corroborated Manager Rating:
          </div>

          <div className="grid grid-cols-1 gap-2">
            {item.competency.levels.map((level) => {
              const isSelected = currentReview.rating === level.level;
              const isStaffChoice = item.selfRating === level.level;

              return (
                <label
                  key={level.id}
                  onClick={() => handleRatingChange(item.id, level.level)}
                  className={`flex items-start p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${isSelected
                      ? 'border-neutral-900 bg-stone-50/80 ring-1 ring-neutral-900 shadow-2xs'
                      : 'border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/40 bg-white'
                    }`}
                >
                  <input
                    type="radio"
                    name={`manager-rating-${item.id}`}
                    value={level.level}
                    checked={isSelected}
                    onChange={() => handleRatingChange(item.id, level.level)}
                    className="h-4 w-4 text-neutral-900 border-stone-300 focus:ring-neutral-900 mt-0.5 accent-neutral-900"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900">Level {level.level}</span>
                      {isStaffChoice && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-neutral-700 border border-stone-200">
                          Staff Choice
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-neutral-600 leading-relaxed">{level.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Manager Justification Area */}
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
            Manager Justification / Comments
            {isRatingChanged ? (
              <span className="ml-1 text-amber-600 font-bold">* (Required because rating was adjusted)</span>
            ) : (
              <span className="ml-1 text-neutral-400 font-normal">(Optional)</span>
            )}
          </label>

          {isRatingChanged && (
            <p className="text-xs text-amber-800 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80">
              Please explain why the corroborated rating differs from the employee&apos;s self-rating of Level {item.selfRating}.
            </p>
          )}

          <textarea
            rows={2}
            value={currentReview.justification}
            onChange={(e) => handleJustificationChange(item.id, e.target.value)}
            placeholder={
              isRatingChanged
                ? 'Provide detailed justification for adjusting this rating...'
                : 'Optional manager feedback or observations...'
            }
            className={`w-full rounded-xl border px-3.5 py-2.5 text-xs shadow-2xs focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white ${isRatingChanged && currentReview.justification.trim() === ''
                ? 'border-amber-300 focus:border-amber-500'
                : 'border-stone-200 focus:border-neutral-900'
              }`}
          />
        </div>
      </div>
    );
  }
}
