'use client';

import { useActionState, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  saveAssessmentDraftAction,
  submitAssessmentAction,
  AssessmentFormActionState,
} from '../actions';
import { StaffAssessmentDetail } from '@/services';
import { CompetencyType } from '@prisma/client';

interface AssessmentFormProps {
  assessment: StaffAssessmentDetail;
}

const initialActionState: AssessmentFormActionState = {};

export function AssessmentForm({ assessment }: AssessmentFormProps) {
  // Local state for answers: map of itemId -> { selfRating: number | null, evidenceText: string }
  const [answers, setAnswers] = useState<
    Record<string, { selfRating: number | null; evidenceText: string }>
  >(() => {
    const initial: Record<string, { selfRating: number | null; evidenceText: string }> = {};
    for (const item of assessment.items) {
      initial[item.id] = {
        selfRating: item.selfRating,
        evidenceText: item.evidenceText || '',
      };
    }
    return initial;
  });

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [draftSuccessMessage, setDraftSuccessMessage] = useState<string | null>(null);
  const [clientValidationErrors, setClientValidationErrors] = useState<string[]>([]);

  // Server action states
  const [draftState, draftAction, isDraftPending] = useActionState(
    saveAssessmentDraftAction,
    initialActionState
  );
  const [submitState, submitAction, isSubmitPending] = useActionState(
    submitAssessmentAction,
    initialActionState
  );

  const [, startTransition] = useTransition();

  // Progress metrics
  const totalItems = assessment.items.length;
  const answeredItems = Object.values(answers).filter((a) => a.selfRating !== null).length;
  const progressPercent = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;

  // Group competencies
  const technicalItems = assessment.items.filter(
    (i) => i.competency.type === CompetencyType.TECHNICAL
  );
  const behavioralItems = assessment.items.filter(
    (i) => i.competency.type === CompetencyType.BEHAVIORAL
  );

  // Handle rating selection
  const handleRatingChange = (itemId: string, level: number) => {
    setDraftSuccessMessage(null);
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selfRating: level,
      },
    }));
  };

  // Handle evidence change
  const handleEvidenceChange = (itemId: string, text: string) => {
    setDraftSuccessMessage(null);
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        evidenceText: text,
      },
    }));
  };

  // Payload serializer
  const getPayloadItems = () => {
    return Object.entries(answers).map(([itemId, val]) => ({
      assessmentItemId: itemId,
      selfRating: val.selfRating,
      evidenceText: val.evidenceText.trim() === '' ? null : val.evidenceText,
    }));
  };

  // Trigger Save Draft
  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    setDraftSuccessMessage(null);
    setClientValidationErrors([]);

    const formData = new FormData();
    formData.append('assessmentId', assessment.id);
    formData.append('items', JSON.stringify(getPayloadItems()));

    startTransition(() => {
      draftAction(formData);
    });
  };

  // Validate before opening submit confirmation modal
  const handleOpenSubmitModal = () => {
    setDraftSuccessMessage(null);
    const errors: string[] = [];

    for (const item of assessment.items) {
      const answer = answers[item.id];
      if (!answer || answer.selfRating === null) {
        errors.push(`"${item.competency.name}" needs a rating selected.`);
        continue;
      }

      const selectedLevel = item.competency.levels.find((l) => l.level === answer.selfRating);
      if (selectedLevel?.evidencePrompt && selectedLevel.evidencePrompt.trim().length > 0) {
        if (!answer.evidenceText || answer.evidenceText.trim().length === 0) {
          errors.push(
            `"${item.competency.name}" at Level ${selectedLevel.level} requires supporting evidence.`
          );
        }
      }
    }

    if (errors.length > 0) {
      setClientValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setClientValidationErrors([]);
    setIsSubmitModalOpen(true);
  };

  // Trigger Final Submission
  const handleConfirmSubmit = () => {
    const formData = new FormData();
    formData.append('assessmentId', assessment.id);
    formData.append('items', JSON.stringify(getPayloadItems()));

    setIsSubmitModalOpen(false);
    startTransition(() => {
      submitAction(formData);
    });
  };

  return (
    <div className="space-y-6">
      {/* Sticky Progress Bar Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500 font-medium">Self-Assessment Progress</div>
            <div className="text-sm font-bold text-gray-900">
              {answeredItems} of {totalItems} competencies answered ({progressPercent}%)
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isDraftPending || isSubmitPending}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isDraftPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving Draft...
                </>
              ) : (
                'Save Draft'
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenSubmitModal}
              disabled={isDraftPending || isSubmitPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitPending ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Alert Notices */}
      {draftState?.error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="text-sm font-medium text-red-800">{draftState.error}</div>
        </div>
      )}

      {submitState?.error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="text-sm font-medium text-red-800">{submitState.error}</div>
        </div>
      )}

      {draftState?.success && !draftSuccessMessage && (
        <div className="rounded-md bg-emerald-50 p-4 border border-emerald-200">
          <div className="text-sm font-medium text-emerald-800">
            {draftState.message || 'Draft progress saved successfully.'}
          </div>
        </div>
      )}

      {clientValidationErrors.length > 0 && (
        <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
          <h3 className="text-sm font-semibold text-amber-800">
            Please complete the following items before submitting:
          </h3>
          <ul className="mt-2 list-disc list-inside text-xs text-amber-700 space-y-1">
            {clientValidationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Competencies Form Sections */}
      <form onSubmit={handleSaveDraft} className="space-y-8">
        {/* Technical Competencies */}
        {technicalItems.length > 0 && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-2">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="h-2 w-2 rounded-full bg-blue-600 mr-2" />
                Technical Competencies
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Evaluate your core engineering, development, and technical proficiencies.
              </p>
            </div>

            <div className="space-y-6">
              {technicalItems.map((item, index) => renderCompetencyCard(item, index + 1))}
            </div>
          </div>
        )}

        {/* Behavioral Competencies */}
        {behavioralItems.length > 0 && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-2">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="h-2 w-2 rounded-full bg-emerald-600 mr-2" />
                Behavioral Competencies
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Evaluate collaboration, communication, and professional conduct.
              </p>
            </div>

            <div className="space-y-6">
              {behavioralItems.map((item, index) =>
                renderCompetencyCard(item, technicalItems.length + index + 1)
              )}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
          <Link
            href="/staff/assessments"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            &larr; Back to My Assessments
          </Link>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isDraftPending || isSubmitPending}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Save Draft
            </button>

            <button
              type="button"
              onClick={handleOpenSubmitModal}
              disabled={isDraftPending || isSubmitPending}
              className="px-5 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Submit Assessment
            </button>
          </div>
        </div>
      </form>

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
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
                <h3 className="text-base font-bold text-gray-900">Confirm Submission</h3>
                <p className="text-xs text-gray-500">
                  {assessment.campaign.requiresCorroboration
                    ? 'Your assessment will be submitted for manager review.'
                    : 'Your self-assessment will be finalized.'}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              You are about to submit this assessment. You will not be able to edit it afterward.
            </p>

            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitPending}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper renderer for a single competency card
  function renderCompetencyCard(item: StaffAssessmentDetail['items'][number], num: number) {
    const currentAnswer = answers[item.id] || { selfRating: null, evidenceText: '' };
    const isAnswered = currentAnswer.selfRating !== null;
    const selectedLevelRecord = item.competency.levels.find(
      (l) => l.level === currentAnswer.selfRating
    );

    return (
      <div
        key={item.id}
        className={`bg-white rounded-lg border transition-all ${
          isAnswered ? 'border-gray-300 shadow-sm' : 'border-amber-200 shadow-sm'
        } p-6 space-y-5`}
      >
        {/* Header */}
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

          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
              isAnswered ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isAnswered ? `Level ${currentAnswer.selfRating} Selected` : 'Not Selected'}
          </span>
        </div>

        {item.competency.description && (
          <p className="text-xs text-gray-600">{item.competency.description}</p>
        )}

        {/* Level Radio Options */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Select Your Capability Level:
          </div>

          <div className="grid grid-cols-1 gap-2">
            {item.competency.levels.map((level) => {
              const isSelected = currentAnswer.selfRating === level.level;

              return (
                <label
                  key={level.id}
                  onClick={() => handleRatingChange(item.id, level.level)}
                  className={`flex items-start p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`competency-${item.id}`}
                    value={level.level}
                    checked={isSelected}
                    onChange={() => handleRatingChange(item.id, level.level)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900">Level {level.level}</span>
                    </div>
                    <p className="mt-0.5 text-gray-600 leading-relaxed">{level.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Evidence Section */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Supporting Evidence & Examples
            {selectedLevelRecord?.evidencePrompt && (
              <span className="ml-1 text-red-500">*</span>
            )}
          </label>

          {selectedLevelRecord?.evidencePrompt ? (
            <div className="p-2.5 rounded bg-blue-50/50 border border-blue-100 text-xs text-blue-900">
              <span className="font-semibold">Evidence Prompt:</span>{' '}
              {selectedLevelRecord.evidencePrompt}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Describe recent projects, contributions, or achievements demonstrating this competency level.
            </p>
          )}

          <textarea
            rows={3}
            value={currentAnswer.evidenceText}
            onChange={(e) => handleEvidenceChange(item.id, e.target.value)}
            placeholder="Provide specific examples, context, or achievements..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    );
  }
}
