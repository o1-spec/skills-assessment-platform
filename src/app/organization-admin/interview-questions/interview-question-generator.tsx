'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CompetencyType } from '@prisma/client';
import {
  generateDraftInterviewQuestionsAction,
  createInterviewQuestionSetAction,
} from '@/actions/interview-questions';

export interface SelectableRoleProfile {
  id: string;
  name: string;
  description: string | null;
  requirementsCount: number;
}

interface QuestionDraft {
  id?: string;
  competencyId?: string | null;
  competencyName?: string;
  competencyType?: CompetencyType;
  targetLevel?: number | null;
  question: string;
  followUp: string;
  orderIndex: number;
}

interface Props {
  roleProfiles: SelectableRoleProfile[];
}

export function InterviewQuestionGenerator({ roleProfiles }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roleProfiles.length > 0 ? roleProfiles[0].id : ''
  );

  const [hasGenerated, setHasGenerated] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [customFollowUpText, setCustomFollowUpText] = useState('');

  const handleGenerate = () => {
    if (!selectedRoleId) {
      setError('Please select a role profile to generate interview questions.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await generateDraftInterviewQuestionsAction(selectedRoleId);
      if (!res.success || !res.data) {
        setError(res.error || 'Failed to generate interview questions');
      } else {
        setTitle(res.data.suggestedTitle);
        setQuestions(
          res.data.questions.map((q) => ({
            competencyId: q.competencyId,
            competencyName: q.competencyName,
            competencyType: q.competencyType,
            targetLevel: q.targetLevel,
            question: q.question,
            followUp: q.followUp || '',
            orderIndex: q.orderIndex,
          }))
        );
        setHasGenerated(true);
      }
    });
  };

  const handleQuestionChange = (index: number, field: 'question' | 'followUp', value: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((q, idx) => ({ ...q, orderIndex: idx }));
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((q, idx) => ({ ...q, orderIndex: idx }));
    });
  };

  const handleAddCustomQuestion = () => {
    if (!customQuestionText.trim()) return;

    setQuestions((prev) => [
      ...prev,
      {
        competencyId: null,
        competencyName: 'Custom Question',
        competencyType: undefined,
        targetLevel: null,
        question: customQuestionText.trim(),
        followUp: customFollowUpText.trim(),
        orderIndex: prev.length,
      },
    ]);

    setCustomQuestionText('');
    setCustomFollowUpText('');
    setIsAddingCustom(false);
  };

  const handleSaveSet = () => {
    if (!selectedRoleId || !title.trim() || questions.length === 0) {
      setError('Please provide a title and at least one question.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await createInterviewQuestionSetAction({
        roleProfileId: selectedRoleId,
        title: title.trim(),
        questions: questions.map((q, idx) => ({
          competencyId: q.competencyId || null,
          targetLevel: q.targetLevel || null,
          question: q.question,
          followUp: q.followUp || null,
          orderIndex: idx,
        })),
      });

      if (!res.success || !res.questionSetId) {
        setError(res.error || 'Failed to save interview question set');
      } else {
        router.push(`/organization-admin/interview-questions/${res.questionSetId}`);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-800 flex items-start">
          <svg className="w-5 h-5 mr-2 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/80 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-neutral-900 border-b border-stone-100 pb-3">
          Step 1: Choose Target Role Profile
        </h2>

        {roleProfiles.length === 0 ? (
          <div className="text-center py-6 text-sm text-stone-500">
            No published role profiles are available. Please create and publish a role profile first.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <label htmlFor="roleProfileSelect" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Published Role Profile <span className="text-rose-500">*</span>
              </label>
              <select
                id="roleProfileSelect"
                value={selectedRoleId}
                onChange={(e) => {
                  setSelectedRoleId(e.target.value);
                  setHasGenerated(false);
                }}
                disabled={isPending}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
              >
                {roleProfiles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.requirementsCount} competency requirements)
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:pt-6">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending || !selectedRoleId}
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? 'Generating Questions...' : 'Generate Question Set'}
              </button>
            </div>
          </div>
        )}
      </div>

      {hasGenerated && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4 gap-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Step 2: Review, Reorder & Edit Questions
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Generated deterministically based on competency levels and evidence prompts. You may customize question text or add custom questions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="inline-flex items-center px-4 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
            >
              + Add Custom Question
            </button>
          </div>

          <div>
            <label htmlFor="questionSetTitle" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Interview Guide Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="questionSetTitle"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            />
          </div>

          {isAddingCustom && (
            <div className="p-5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-4">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Add Custom Interview Question</h3>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">Question Text <span className="text-rose-500">*</span></label>
                <textarea
                  rows={2}
                  value={customQuestionText}
                  onChange={(e) => setCustomQuestionText(e.target.value)}
                  placeholder="e.g. Describe your experience collaborating with product designers on complex specs..."
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">Follow-up Probe (Optional)</label>
                <input
                  type="text"
                  value={customFollowUpText}
                  onChange={(e) => setCustomFollowUpText(e.target.value)}
                  placeholder="e.g. Follow-up: How did you resolve design conflicts?"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomQuestion}
                  disabled={!customQuestionText.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Add Question
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="p-5 bg-stone-50/50 border border-stone-200/80 rounded-xl space-y-3 hover:border-stone-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-200 text-xs font-bold text-stone-700">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-neutral-900">
                      {q.competencyName || 'General / Custom'}
                    </span>
                    {q.targetLevel && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-800 border border-stone-200/60">
                        Target Level {q.targetLevel}
                      </span>
                    )}
                    {q.competencyType && (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/60"
                      >
                        {q.competencyType}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 text-stone-500 hover:text-neutral-900 disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === questions.length - 1}
                      className="p-1.5 text-stone-500 hover:text-neutral-900 disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(idx)}
                      className="p-1.5 text-rose-600 hover:text-rose-800 ml-2 cursor-pointer"
                      title="Delete question"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Primary Question Text
                  </label>
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={(e) => handleQuestionChange(idx, 'question', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">
                    Follow-up / Probe (Optional)
                  </label>
                  <input
                    type="text"
                    value={q.followUp}
                    onChange={(e) => handleQuestionChange(idx, 'followUp', e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSet}
              disabled={isPending || questions.length === 0}
              className="px-5 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Saving Question Set...' : 'Save Interview Guide'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
