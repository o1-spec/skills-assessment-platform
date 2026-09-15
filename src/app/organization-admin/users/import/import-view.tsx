'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  validateCsvUserImportAction,
  confirmCsvUserImportAction,
} from '@/actions/csv-import';
import { CsvRowResult } from '@/services/csv-import';
import { GeneratedInvitation } from '@/services/invitations';

type Step = 'UPLOAD' | 'PREVIEW' | 'RESULT';

export function ImportView() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('UPLOAD');
  const [fileName, setFileName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [validationResults, setValidationResults] = useState<CsvRowResult[]>([]);
  const [hasErrors, setHasErrors] = useState(false);

  const [createdInvitations, setCreatedInvitations] = useState<GeneratedInvitation[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sampleCsvContent = `name,email,role,manager_email,role_profile_name,team_name
Alice Walker,alice.walker@example.com,STAFF,michael.manager@acme.com,Backend Engineer,Backend Engineering
Bob Developer,bob.dev@example.com,STAFF,michael.manager@acme.com,Backend Engineer,Backend Engineering
Carol Manager,carol.mgr@example.com,MANAGER,,,`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'users_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setGlobalError('Please select a valid .csv file.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    if (!csvContent.trim()) {
      setGlobalError('Please select a CSV file first.');
      return;
    }

    setIsValidating(true);
    setGlobalError(null);

    try {
      const res = await validateCsvUserImportAction(csvContent);
      if (!res.success) {
        setGlobalError(res.error || 'Failed to parse or validate CSV file.');
        setIsValidating(false);
        return;
      }

      setValidationResults(res.results || []);
      setHasErrors(!!res.hasErrors);
      setStep('PREVIEW');
    } catch {
      setGlobalError('An unexpected error occurred during CSV validation.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (hasErrors) {
      setGlobalError('Cannot import when rows contain validation errors.');
      return;
    }

    setIsImporting(true);
    setGlobalError(null);

    try {
      const res = await confirmCsvUserImportAction(csvContent);
      if (!res.success) {
        setGlobalError(res.error || 'Failed to import users.');
        setIsImporting(false);
        return;
      }

      setCreatedInvitations(res.invitations || []);
      setStep('RESULT');
      router.refresh();
    } catch {
      setGlobalError('An unexpected error occurred during import execution.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyLink = async (invitation: GeneratedInvitation) => {
    const fullUrl = `${window.location.origin}${invitation.invitationUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(invitation.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch {
      // Fallback
    }
  };

  const validCount = validationResults.filter((r) => r.status === 'VALID').length;
  const errorCount = validationResults.filter((r) => r.status === 'ERROR').length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header & Back */}
      <div>
        <Link
          href="/organization-admin/users"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-4"
        >
          ← Back to Users
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bulk Import Users</h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload a CSV spreadsheet to invite multiple employees and assign roles, managers, and teams in one batch.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-xs transition-colors self-start sm:self-auto"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV Template
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-4 text-xs font-medium">
        <span
          className={`flex items-center gap-1.5 ${
            step === 'UPLOAD' ? 'text-blue-600 font-bold' : 'text-gray-500'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              step === 'UPLOAD' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            1
          </span>
          Upload CSV
        </span>
        <span className="text-gray-300">/</span>
        <span
          className={`flex items-center gap-1.5 ${
            step === 'PREVIEW' ? 'text-blue-600 font-bold' : 'text-gray-500'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              step === 'PREVIEW' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            2
          </span>
          Validate & Preview
        </span>
        <span className="text-gray-300">/</span>
        <span
          className={`flex items-center gap-1.5 ${
            step === 'RESULT' ? 'text-blue-600 font-bold' : 'text-gray-500'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              step === 'RESULT' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            3
          </span>
          Invitations Sent
        </span>
      </div>

      {/* Global Error Banner */}
      {globalError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="font-semibold">Error: </span>
            {globalError}
          </div>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === 'UPLOAD' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xs space-y-6">
          <div className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-8 text-center bg-gray-50/50 transition-colors">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <label className="cursor-pointer">
              <span className="text-sm font-semibold text-blue-600 hover:text-blue-700">Choose a CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">Standard RFC 4180 CSV format (UTF-8)</p>
            {fileName && (
              <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full font-medium">
                📄 {fileName}
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">CSV Column Specifications:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code className="font-mono bg-gray-200 px-1 py-0.5 rounded text-gray-800">name</code> <span className="text-red-500 font-semibold">*Required</span> — Full name of the employee.</li>
              <li><code className="font-mono bg-gray-200 px-1 py-0.5 rounded text-gray-800">email</code> <span className="text-red-500 font-semibold">*Required</span> — Work email address (must be globally unique and not have pending invites).</li>
              <li><code className="font-mono bg-gray-200 px-1 py-0.5 rounded text-gray-800">role</code> <span className="text-red-500 font-semibold">*Required</span> — Must be <code className="font-mono">STAFF</code>, <code className="font-mono">MANAGER</code>, or <code className="font-mono">ORGANIZATION_ADMIN</code>.</li>
              <li><code className="font-mono bg-gray-200 px-1 py-0.5 rounded text-gray-800">manager_email</code> <span className="text-gray-400">Optional</span> — Email of an active manager in this organization.</li>
              <li><code className="font-mono bg-gray-200 px-1 py-0.5 rounded text-gray-800">role_profile_name</code> <span className="text-gray-400">Optional</span> — Name of a published job role profile.</li>
              <li><code className="font-mono bg-gray-200 px-1 py-0.5 rounded text-gray-800">team_name</code> <span className="text-gray-400">Optional</span> — Name of an active team in this organization.</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleValidate}
              disabled={!csvContent || isValidating}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {isValidating ? 'Validating CSV…' : 'Validate & Preview →'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {step === 'PREVIEW' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Rows</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{validationResults.length}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Valid Rows</span>
              <div className="text-2xl font-bold text-green-700 mt-1">{validCount}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Rows with Errors</span>
              <div className="text-2xl font-bold text-red-700 mt-1">{errorCount}</div>
            </div>
          </div>

          {hasErrors && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <div className="font-semibold text-sm text-amber-900 mb-1">
                Batch Contains {errorCount} Error{errorCount === 1 ? '' : 's'}
              </div>
              All rows in the CSV must pass validation before import can proceed. Please update your CSV file to resolve the errors listed below, then upload again.
            </div>
          )}

          {/* Validation Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Parsed Records</h2>
              <span className="text-xs text-gray-500 font-medium">File: {fileName}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-12">Row</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Manager</th>
                    <th className="px-4 py-3">Role Profile</th>
                    <th className="px-4 py-3">Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {validationResults.map((r) => (
                    <tr key={r.rowNumber} className={r.status === 'ERROR' ? 'bg-red-50/40' : 'hover:bg-gray-50/50'}>
                      <td className="px-4 py-3 font-mono text-gray-400">{r.rowNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.status === 'VALID' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-800">
                            ✓ VALID
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800">
                            ✕ ERROR
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 font-mono">{r.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-semibold text-gray-700">
                          {r.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'VALID' ? (
                          r.resolvedManagerName ? (
                            <span>{r.resolvedManagerName}</span>
                          ) : (
                            <span className="text-gray-400 italic">None</span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'VALID' ? (
                          r.resolvedRoleProfileName ? (
                            <span>{r.resolvedRoleProfileName}</span>
                          ) : (
                            <span className="text-gray-400 italic">None</span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'VALID' ? (
                          r.resolvedTeamName ? (
                            <span className="text-blue-700 font-medium">{r.resolvedTeamName}</span>
                          ) : (
                            <span className="text-gray-400 italic">None</span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* If there are error details, list them clearly below table */}
            {hasErrors && (
              <div className="p-6 bg-red-50/50 border-t border-red-100 space-y-2">
                <div className="text-xs font-bold text-red-900 uppercase tracking-wide">
                  Detailed Error Breakdown:
                </div>
                {validationResults
                  .filter((r): r is Extract<CsvRowResult, { status: 'ERROR' }> => r.status === 'ERROR')
                  .map((errRow) => (
                    <div key={errRow.rowNumber} className="text-xs text-red-800 bg-white p-3 rounded-lg border border-red-200">
                      <span className="font-semibold">Row {errRow.rowNumber} ({errRow.email || errRow.name || 'Unknown'}):</span>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        {errRow.errors.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('UPLOAD');
                setValidationResults([]);
                setHasErrors(false);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
            >
              ← Upload Different File
            </button>

            {!hasErrors && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {isImporting ? 'Importing Batch…' : `Confirm & Import ${validCount} Users →`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: RESULT */}
      {step === 'RESULT' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xs space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Successfully Created {createdInvitations.length} Invitations!
            </h2>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Invitations have been generated. You can share each unique invitation link directly with the employee to allow them to complete onboarding.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {createdInvitations.map((inv) => (
              <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-gray-900">{inv.name}</div>
                  <div className="text-gray-500 font-mono">{inv.email} · {inv.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] bg-gray-100 px-2.5 py-1 rounded text-gray-600 truncate max-w-xs">
                    {inv.invitationUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(inv)}
                    className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-medium whitespace-nowrap"
                  >
                    {copiedId === inv.id ? 'Copied! ✓' : 'Copy Link'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-4">
            <Link
              href="/organization-admin/users"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
            >
              Go to Users Directory →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
