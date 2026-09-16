'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CompetencyType } from '@prisma/client';
import { InterviewQuestionSetWithDetails } from '@/services/interview-questions';
import {
  updateInterviewQuestionSetAction,
  deleteInterviewQuestionSetAction,
} from '@/actions/interview-questions';

interface Props {
  questionSet: InterviewQuestionSetWithDetails;
}

interface EditableQuestion {
  id?: string;
  competencyId?: string | null;
  competencyName?: string;
  competencyType?: CompetencyType;
  targetLevel?: number | null;
  question: string;
  followUp: string;
  orderIndex: number;
}

export function InterviewQuestionSetDetail({ questionSet }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(questionSet.title);
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    questionSet.questions.map((q) => ({
      id: q.id,
      competencyId: q.competencyId,
      competencyName: q.competency?.name || 'Custom Question',
      competencyType: q.competency?.type,
      targetLevel: q.targetLevel,
      question: q.question,
      followUp: q.followUp || '',
      orderIndex: q.orderIndex,
    }))
  );

  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [customFollowUpText, setCustomFollowUpText] = useState('');

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

  const handleSave = () => {
    if (!title.trim() || questions.length === 0) {
      setError('Please provide a title and at least one question.');
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await updateInterviewQuestionSetAction(questionSet.id, {
        title: title.trim(),
        questions: questions.map((q, idx) => ({
          id: q.id,
          competencyId: q.competencyId || null,
          targetLevel: q.targetLevel || null,
          question: q.question,
          followUp: q.followUp || null,
          orderIndex: idx,
        })),
      });

      if (!res.success) {
        setError(res.error || 'Failed to update interview question set');
      } else {
        setSuccess('Interview guide updated successfully.');
        setIsEditing(false);
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this interview guide?')) return;

    startTransition(async () => {
      const res = await deleteInterviewQuestionSetAction(questionSet.id);
      if (!res.success) {
        setError(res.error || 'Failed to delete interview guide');
      } else {
        router.push('/organization-admin/interview-questions');
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-stone-500 mb-1.5 font-medium">
            <Link href="/organization-admin/interview-questions" className="hover:text-neutral-900 hover:underline">
              ← Back to Interview Guides
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{questionSet.title}</h1>
          <p className="text-sm text-stone-500 mt-1">
            Role Profile: <span className="font-bold text-neutral-800">{questionSet.roleProfile.name}</span>
            {questionSet.roleProfile.isArchived && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200/60">
                Archived Role
              </span>
            )}
            <span className="mx-2">•</span>
            {questions.length} Questions
            <span className="mx-2">•</span>
            Created by {questionSet.createdBy.name} on {new Date(questionSet.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <a
            href={`/api/reports/interview-questions/${questionSet.id}/pdf`}
            download
            className="inline-flex items-center px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-800 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF Guide
          </a>

          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Edit Questions
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-800">
          {success}
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/80 shadow-xs space-y-6">
        {isEditing && (
          <div className="space-y-4 border-b border-stone-100 pb-5">
            <div>
              <label htmlFor="editTitle" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Interview Guide Title
              </label>
              <input
                id="editTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-stone-500 font-medium">
                Reorder, update question text, or delete questions below.
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCustom(true)}
                className="inline-flex items-center px-4 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
              >
                + Add Custom Question
              </button>
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
          </div>
        )}

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="p-5 bg-stone-50/50 border border-stone-200/80 rounded-xl space-y-3 hover:border-stone-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-200 text-xs font-bold text-stone-700">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-bold text-neutral-900">
                    {q.competencyName || 'General / Custom Question'}
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

                {isEditing && (
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
                )}
              </div>

              {isEditing ? (
                <>
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
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-neutral-900 font-medium whitespace-pre-wrap">{q.question}</p>
                  {q.followUp && (
                    <p className="text-xs text-stone-600 italic bg-white/70 p-3 rounded-xl border border-stone-200/60">
                      {q.followUp}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-stone-100">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Delete Interview Guide
          </button>

          {isEditing && (
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setTitle(questionSet.title);
                  setQuestions(
                    questionSet.questions.map((q) => ({
                      id: q.id,
                      competencyId: q.competencyId,
                      competencyName: q.competency?.name || 'Custom Question',
                      competencyType: q.competency?.type,
                      targetLevel: q.targetLevel,
                      question: q.question,
                      followUp: q.followUp || '',
                      orderIndex: q.orderIndex,
                    }))
                  );
                }}
                className="px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="px-5 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
