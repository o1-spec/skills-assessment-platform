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
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start">
          <svg className="w-5 h-5 mr-2 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-4">
        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">
          Step 1: Choose Target Role Profile
        </h2>

        {roleProfiles.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            No published role profiles are available. Please create and publish a role profile first.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <label htmlFor="roleProfileSelect" className="block text-sm font-semibold text-gray-700 mb-1">
                Published Role Profile *
              </label>
              <select
                id="roleProfileSelect"
                value={selectedRoleId}
                onChange={(e) => {
                  setSelectedRoleId(e.target.value);
                  setHasGenerated(false);
                }}
                disabled={isPending}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
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
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Generating Questions...' : '⚡ Generate Question Set'}
              </button>
            </div>
          </div>
        )}
      </div>

      {hasGenerated && (
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Step 2: Review, Reorder & Edit Questions
              </h2>
              <p className="text-xs text-gray-500">
                Generated deterministically based on competency levels and evidence prompts. You may customize question text or add custom questions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="inline-flex items-center px-3 py-1.5 border border-indigo-600 shadow-2xs text-xs font-semibold rounded-md text-indigo-600 bg-white hover:bg-indigo-50 transition-colors"
            >
              + Add Custom Question
            </button>
          </div>

          <div>
            <label htmlFor="questionSetTitle" className="block text-sm font-semibold text-gray-700 mb-1">
              Interview Guide Title *
            </label>
            <input
              id="questionSetTitle"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {isAddingCustom && (
            <div className="p-4 rounded-lg bg-indigo-50/70 border border-indigo-200 space-y-3">
              <h3 className="text-xs font-bold text-indigo-900 uppercase">Add Custom Interview Question</h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Question Text *</label>
                <textarea
                  rows={2}
                  value={customQuestionText}
                  onChange={(e) => setCustomQuestionText(e.target.value)}
                  placeholder="e.g. Describe your experience collaborating with product designers on complex specs..."
                  className="w-full rounded-md border border-gray-300 p-2 text-sm text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Follow-up Probe (Optional)</label>
                <input
                  type="text"
                  value={customFollowUpText}
                  onChange={(e) => setCustomFollowUpText(e.target.value)}
                  placeholder="e.g. Follow-up: How did you resolve design conflicts?"
                  className="w-full rounded-md border border-gray-300 p-2 text-sm text-gray-900 bg-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomQuestion}
                  disabled={!customQuestionText.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
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
                className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-gray-900">
                      {q.competencyName || 'General / Custom'}
                    </span>
                    {q.targetLevel && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                        Target Level {q.targetLevel}
                      </span>
                    )}
                    {q.competencyType && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          q.competencyType === CompetencyType.TECHNICAL
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
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
                      className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === questions.length - 1}
                      className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                      title="Move down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(idx)}
                      className="p-1 text-red-500 hover:text-red-700 ml-2"
                      title="Delete question"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Primary Question Text
                  </label>
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={(e) => handleQuestionChange(idx, 'question', e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2 text-sm text-gray-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Follow-up / Probe (Optional)
                  </label>
                  <input
                    type="text"
                    value={q.followUp}
                    onChange={(e) => handleQuestionChange(idx, 'followUp', e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2 text-xs text-gray-700 bg-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 shadow-2xs text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSet}
              disabled={isPending || questions.length === 0}
              className="px-5 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving Question Set...' : 'Save Interview Guide'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
