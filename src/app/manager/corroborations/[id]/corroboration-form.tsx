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
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500 font-medium">Reviewing Direct Report</div>
            <div className="text-sm font-bold text-gray-900">
              {assessment.user.name} &bull; {totalItems} Competencies ({changedItemsCount} adjusted)
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/manager/corroborations"
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleOpenConfirmModal}
              disabled={isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Completing Review...' : 'Complete Review'}
            </button>
          </div>
        </div>
      </div>

      {state?.error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="text-sm font-medium text-red-800">{state.error}</div>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
          <h3 className="text-sm font-semibold text-amber-800">
            Please resolve the following before completing the review:
          </h3>
          <ul className="mt-2 list-disc list-inside text-xs text-amber-700 space-y-1">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-8">
        {technicalItems.length > 0 && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-2">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="h-2 w-2 rounded-full bg-blue-600 mr-2" />
                Technical Competencies
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
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
            <div className="border-b border-gray-200 pb-2">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="h-2 w-2 rounded-full bg-emerald-600 mr-2" />
                Behavioral Competencies
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
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

        <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
          <Link
            href="/manager/corroborations"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            &larr; Back to Corroboration Queue
          </Link>

          <button
            type="button"
            onClick={handleOpenConfirmModal}
            disabled={isPending}
            className="px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            Complete Review
          </button>
        </div>
      </div>

      {isConfirmModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-gray-500/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Complete Corroboration Review</h3>
                <p className="text-xs text-gray-500">
                  Assessment for {assessment.user.name}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              You are about to complete this review. The assessment will be finalized and capability ratings stored.
            </p>

            {changedItemsCount > 0 && (
              <div className="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800">
                You have adjusted {changedItemsCount} self-rating(s) with supporting justification.
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isPending}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
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
        className={`bg-white rounded-lg border transition-all ${
          isRatingChanged ? 'border-amber-300 shadow-sm ring-1 ring-amber-300' : 'border-gray-200 shadow-sm'
        } p-6 space-y-5`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400">#{num}</span>
            <h3 className="text-base font-bold text-gray-900">{item.competency.name}</h3>
            <span
              className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                item.competency.type === CompetencyType.TECHNICAL
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {item.competency.type}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Staff Self-Rating: Level {item.selfRating}
            </span>
            {isRatingChanged && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                Adjusted to Level {currentReview.rating}
              </span>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
          <div>
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Staff Self-Rating: Level {item.selfRating}
            </div>
            {staffSelectedLevel && (
              <p className="text-xs text-gray-600 bg-white p-2.5 rounded border border-gray-200">
                <span className="font-semibold text-gray-800">Benchmark:</span>{' '}
                {staffSelectedLevel.description}
              </p>
            )}
          </div>

          <div>
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Supporting Evidence Provided by Staff:
            </div>
            {item.evidenceText ? (
              <p className="text-xs text-gray-700 bg-white p-2.5 rounded border border-gray-200 whitespace-pre-wrap">
                {item.evidenceText}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic bg-white p-2.5 rounded border border-gray-200">
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

        <div className="space-y-2.5 pt-2 border-t border-gray-100">
          <div className="text-xs font-bold text-gray-800 uppercase tracking-wider">
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
                  className={`flex items-start p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`manager-rating-${item.id}`}
                    value={level.level}
                    checked={isSelected}
                    onChange={() => handleRatingChange(item.id, level.level)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 mt-0.5"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900">Level {level.level}</span>
                      {isStaffChoice && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          Staff Choice
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-gray-600 leading-relaxed">{level.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
            Manager Justification / Comments
            {isRatingChanged ? (
              <span className="ml-1 text-red-600 font-bold">* (Required because rating was adjusted)</span>
            ) : (
              <span className="ml-1 text-gray-400 font-normal">(Optional)</span>
            )}
          </label>

          {isRatingChanged && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
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
            className={`w-full rounded-md border px-3 py-2 text-xs shadow-sm focus:ring-1 ${
              isRatingChanged && currentReview.justification.trim() === ''
                ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          />
        </div>
      </div>
    );
  }
}
