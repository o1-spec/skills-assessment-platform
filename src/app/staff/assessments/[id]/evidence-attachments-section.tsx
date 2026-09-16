'use client';

import { useState, useTransition, useRef } from 'react';
import { EvidenceAttachment } from '@prisma/client';
import {
  uploadEvidenceAttachmentAction,
  deleteEvidenceAttachmentAction,
  getStaffEvidenceSignedUrlAction,
} from '../actions';
import { getManagerEvidenceSignedUrlAction } from '@/app/manager/corroborations/actions';
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
} from '@/lib/validation';
import { ConfirmDialog } from '@/components/app';

interface EvidenceAttachmentsSectionProps {
  assessmentItemId: string;
  assessmentId: string;
  initialAttachments: EvidenceAttachment[];
  isReadOnly?: boolean;
  isManager?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) {
    return (
      <svg className="h-5 w-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    );
  }
  if (mimeType.includes('image')) {
    return (
      <svg className="h-5 w-5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    );
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return (
      <svg className="h-5 w-5 text-indigo-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 2v10h8V7h-3a1 1 0 01-1-1V3H6v3z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-gray-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
    </svg>
  );
}

export function EvidenceAttachmentsSection({
  assessmentItemId,
  assessmentId,
  initialAttachments = [],
  isReadOnly = false,
  isManager = false,
}: EvidenceAttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<EvidenceAttachment[]>(initialAttachments);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<EvidenceAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [, startTransition] = useTransition();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${formatBytes(file.size)}). Maximum allowed size is ${formatBytes(
          MAX_EVIDENCE_FILE_SIZE_BYTES
        )}.`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!(ALLOWED_EVIDENCE_MIME_TYPES as readonly string[]).includes(file.type.toLowerCase())) {
      setErrorMessage(
        `Invalid file type (${file.type || 'unknown'}). Allowed: PDF, PNG, JPEG, DOC, DOCX.`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('assessmentItemId', assessmentItemId);
    formData.append('assessmentId', assessmentId);
    formData.append('file', file);

    try {
      const result = await uploadEvidenceAttachmentAction(formData);
      if (result.error) {
        setErrorMessage(result.error);
      } else if (result.attachment) {
        setAttachments((prev) => [...prev, result.attachment as EvidenceAttachment]);
      }
    } catch {
      setErrorMessage('An unexpected error occurred while uploading.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteRequest = (attachment: EvidenceAttachment) => {
    setAttachmentToDelete(attachment);
  };

  const handleConfirmDelete = () => {
    if (!attachmentToDelete) return;
    const attachmentId = attachmentToDelete.id;

    setErrorMessage(null);
    setDeletingId(attachmentId);

    startTransition(async () => {
      try {
        const result = await deleteEvidenceAttachmentAction(attachmentId, assessmentId);
        if (result.error) {
          setErrorMessage(result.error);
        } else {
          setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
          setAttachmentToDelete(null);
        }
      } catch {
        setErrorMessage('Failed to delete attachment.');
      } finally {
        setDeletingId(null);
      }
    });
  };

  const handleView = async (attachmentId: string) => {
    setErrorMessage(null);
    setViewingId(attachmentId);

    try {
      const result = isManager
        ? await getManagerEvidenceSignedUrlAction(attachmentId)
        : await getStaffEvidenceSignedUrlAction(attachmentId);

      if (result.error || !result.url) {
        setErrorMessage(result.error || 'Failed to generate download link.');
      } else {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setErrorMessage('Failed to open attachment.');
    } finally {
      setViewingId(null);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Evidence Attachments
        </label>
        <span className="text-[11px] text-gray-500">
          {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="divide-y divide-gray-100 bg-white border border-gray-200 rounded-md overflow-hidden">
          {attachments.map((att) => {
            const isDeleting = deletingId === att.id;
            const isOpening = viewingId === att.id;

            return (
              <li
                key={att.id}
                className="px-3 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  {getFileIcon(att.mimeType)}
                  <div className="truncate">
                    <span className="font-medium text-gray-900 block truncate" title={att.fileName}>
                      {att.fileName}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatBytes(att.fileSize)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleView(att.id)}
                    disabled={isOpening}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors disabled:opacity-50"
                  >
                    {isOpening ? 'Loading...' : 'View / Download'}
                  </button>

                  {!isReadOnly && !isManager && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(att)}
                      disabled={isDeleting}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isDeleting ? 'Deleting...' : 'Remove'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {attachments.length === 0 && isReadOnly && (
        <p className="text-xs text-gray-400 italic">No file attachments provided.</p>
      )}

      {!isReadOnly && !isManager && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            disabled={isUploading}
            className="hidden"
            id={`file-input-${assessmentItemId}`}
          />
          <label
            htmlFor={`file-input-${assessmentItemId}`}
            className={`inline-flex items-center justify-center px-3 py-1.5 border border-dashed border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 cursor-pointer transition-colors ${
              isUploading ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <svg
              className="-ml-0.5 mr-1.5 h-4 w-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
            {isUploading ? 'Uploading Attachment...' : 'Upload File Attachment'}
          </label>
          <span className="text-[11px] text-gray-400">
            PDF, PNG, JPG, DOC, DOCX up to 10MB
          </span>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(attachmentToDelete)}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Evidence Attachment"
        description={
          attachmentToDelete
            ? `Are you sure you want to permanently delete "${attachmentToDelete.fileName}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Attachment"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deletingId !== null}
      />
    </div>
  );
}
