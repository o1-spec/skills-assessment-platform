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
import { EvidenceAttachmentsSection } from './evidence-attachments-section';

interface AssessmentFormProps {
  assessment: StaffAssessmentDetail;
}

const initialActionState: AssessmentFormActionState = {};

export function AssessmentForm({ assessment }: AssessmentFormProps) {
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

  const [draftState, draftAction, isDraftPending] = useActionState(
    saveAssessmentDraftAction,
    initialActionState
  );
  const [submitState, submitAction, isSubmitPending] = useActionState(
    submitAssessmentAction,
    initialActionState
  );

  const [, startTransition] = useTransition();

  const totalItems = assessment.items.length;
  const answeredItems = Object.values(answers).filter((a) => a.selfRating !== null).length;
  const progressPercent = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;

  const technicalItems = assessment.items.filter(
    (i) => i.competency.type === CompetencyType.TECHNICAL
  );
  const behavioralItems = assessment.items.filter(
    (i) => i.competency.type === CompetencyType.BEHAVIORAL
  );

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

  const getPayloadItems = () => {
    return Object.entries(answers).map(([itemId, val]) => ({
      assessmentItemId: itemId,
      selfRating: val.selfRating,
      evidenceText: val.evidenceText.trim() === '' ? null : val.evidenceText,
    }));
  };

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

  const handleOpenSubmitModal = () => {
    setDraftSuccessMessage(null);
    const errors: string[] = [];

    for (const item of assessment.items) {
      const answer = answers[item.id];
      if (!answer || answer.selfRating === null) {
        errors.push(`"${item.competency.name}" needs a capability rating selected.`);
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

  const handleConfirmSubmit = () => {
    const formData = new FormData();
    formData.append('assessmentId', assessment.id);
    formData.append('items', JSON.stringify(getPayloadItems()));

    setIsSubmitModalOpen(false);
    startTransition(() => {
      submitAction(formData);
    });
  };

  const scrollToCompetency = (id: string) => {
    const element = document.getElementById(`competency-card-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sticky Progress & Actions Toolbar */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-xs sticky top-16 z-20 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">
              Self-Assessment Progress
            </div>
            <div className="text-sm font-bold text-neutral-900 mt-0.5">
              {answeredItems} of {totalItems} competencies answered ({progressPercent}%)
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isDraftPending || isSubmitPending}
              className="inline-flex items-center px-4 py-2 border border-stone-200/80 text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs disabled:opacity-50 transition-colors"
            >
              {isDraftPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-neutral-600"
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
                  <span>Saving...</span>
                </>
              ) : (
                'Save Draft'
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenSubmitModal}
              disabled={isDraftPending || isSubmitPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs disabled:opacity-50 transition-colors"
            >
              {isSubmitPending ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
        </div>

        <div className="w-full bg-stone-100 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {draftState?.error && (
        <div className="rounded-2xl bg-red-50 p-4 border border-red-200 text-xs text-red-800">
          {draftState.error}
        </div>
      )}

      {submitState?.error && (
        <div className="rounded-2xl bg-red-50 p-4 border border-red-200 text-xs text-red-800">
          {submitState.error}
        </div>
      )}

      {draftState?.success && !draftSuccessMessage && (
        <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-800">
          {draftState.message || 'Draft progress saved successfully.'}
        </div>
      )}

      {clientValidationErrors.length > 0 && (
        <div className="rounded-2xl bg-amber-50/90 p-4 border border-amber-200 text-xs text-amber-900 space-y-2">
          <h3 className="font-semibold text-amber-950">
            Please complete the following items before submitting:
          </h3>
          <ul className="list-disc list-inside text-amber-800 space-y-1">
            {clientValidationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Two-Pane Wireframe Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Pane: Competency Checklist Navigation */}
        <div className="hidden lg:block lg:col-span-1 sticky top-36 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
              Competencies Checklist
            </h3>

            {technicalItems.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                  Technical ({technicalItems.length})
                </div>
                <div className="space-y-1">
                  {technicalItems.map((item, idx) => {
                    const isAnswered = answers[item.id]?.selfRating !== null;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => scrollToCompetency(item.id)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-stone-50 transition-colors group"
                      >
                        <span className="truncate text-neutral-700 group-hover:text-neutral-900">
                          {idx + 1}. {item.competency.name}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ml-2 ${isAnswered ? 'bg-emerald-500' : 'bg-stone-300'
                            }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {behavioralItems.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase">
                  Behavioral ({behavioralItems.length})
                </div>
                <div className="space-y-1">
                  {behavioralItems.map((item, idx) => {
                    const isAnswered = answers[item.id]?.selfRating !== null;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => scrollToCompetency(item.id)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-stone-50 transition-colors group"
                      >
                        <span className="truncate text-neutral-700 group-hover:text-neutral-900">
                          {technicalItems.length + idx + 1}. {item.competency.name}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ml-2 ${isAnswered ? 'bg-emerald-500' : 'bg-stone-300'
                            }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Main Competency Cards */}
        <div className="lg:col-span-3 space-y-6">
          <form onSubmit={handleSaveDraft} className="space-y-8">
            {technicalItems.length > 0 && (
              <div className="space-y-6">
                <div className="border-b border-stone-200/80 pb-2">
                  <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neutral-900" />
                    Technical Competencies
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Evaluate your core technical skills and proficiency levels.
                  </p>
                </div>

                <div className="space-y-6">
                  {technicalItems.map((item, index) => renderCompetencyCard(item, index + 1))}
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
                    Evaluate communication, ownership, collaboration, and leadership.
                  </p>
                </div>

                <div className="space-y-6">
                  {behavioralItems.map((item, index) =>
                    renderCompetencyCard(item, technicalItems.length + index + 1)
                  )}
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-stone-200/80 flex items-center justify-between">
              <Link
                href="/staff/assessments"
                className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                &larr; Back to My Assessments
              </Link>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isDraftPending || isSubmitPending}
                  className="px-4 py-2 border border-stone-200/80 text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 disabled:opacity-50"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={handleOpenSubmitModal}
                  disabled={isDraftPending || isSubmitPending}
                  className="px-5 py-2 border border-transparent text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 shadow-2xs"
                >
                  Submit Assessment
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {isSubmitModalOpen && (
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
                <h3 className="text-base font-bold text-neutral-900">Confirm Submission</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {assessment.campaign.requiresCorroboration
                    ? 'Your ratings will be submitted for manager review.'
                    : 'Your self-assessment will be finalized.'}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              You are about to submit your self-assessment. Once submitted, answers cannot be edited until reviewed by your manager.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 border border-stone-200/80 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderCompetencyCard(item: StaffAssessmentDetail['items'][number], num: number) {
    const currentAnswer = answers[item.id] || { selfRating: null, evidenceText: '' };
    const isAnswered = currentAnswer.selfRating !== null;
    const selectedLevelRecord = item.competency.levels.find(
      (l) => l.level === currentAnswer.selfRating
    );

    return (
      <div
        id={`competency-card-${item.id}`}
        key={item.id}
        className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 space-y-5 shadow-xs ${isAnswered ? 'border-stone-200/80' : 'border-amber-200/90 ring-1 ring-amber-200/50'
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

          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${isAnswered
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
          >
            {isAnswered ? `Level ${currentAnswer.selfRating} Selected` : 'Not Selected'}
          </span>
        </div>

        {item.competency.description && (
          <p className="text-xs text-neutral-500 leading-relaxed">{item.competency.description}</p>
        )}

        <div className="space-y-2.5">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Select Your Capability Level:
          </div>

          <div className="grid grid-cols-1 gap-2">
            {item.competency.levels.map((level) => {
              const isSelected = currentAnswer.selfRating === level.level;

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
                    name={`competency-${item.id}`}
                    value={level.level}
                    checked={isSelected}
                    onChange={() => handleRatingChange(item.id, level.level)}
                    className="h-4 w-4 text-neutral-900 border-stone-300 focus:ring-neutral-900 mt-0.5 accent-neutral-900"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900">Level {level.level}</span>
                    </div>
                    <p className="mt-1 text-neutral-600 leading-relaxed">{level.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-stone-100">
          <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
            Supporting Evidence & Examples
            {selectedLevelRecord?.evidencePrompt && (
              <span className="ml-1 text-amber-600">*</span>
            )}
          </label>

          {selectedLevelRecord?.evidencePrompt ? (
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-950">
              <span className="font-semibold text-amber-900">Evidence Prompt:</span>{' '}
              {selectedLevelRecord.evidencePrompt}
            </div>
          ) : (
            <p className="text-xs text-neutral-400">
              Describe recent projects, contributions, or achievements demonstrating this competency level.
            </p>
          )}

          <textarea
            rows={3}
            value={currentAnswer.evidenceText}
            onChange={(e) => handleEvidenceChange(item.id, e.target.value)}
            placeholder="Provide specific examples, context, or achievements..."
            className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs text-neutral-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
          />

          <EvidenceAttachmentsSection
            assessmentItemId={item.id}
            assessmentId={assessment.id}
            initialAttachments={item.attachments || []}
            isReadOnly={false}
          />
        </div>
      </div>
    );
  }
}
