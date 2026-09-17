'use client';

import { useState } from 'react';

interface ExportButtonProps {
  url: string;
  label: string;
  filename?: string;
  className?: string;
  title?: string;
}

export function ExportButton({ url, label, filename, className, title }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isExporting) return;
    setIsExporting(true);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || url.split('/').pop() || 'report';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  const defaultClassName =
    'px-2.5 py-1 text-[11px] font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50';

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isExporting}
        title={title}
        className={className || defaultClassName}
      >
        {isExporting ? 'Exporting...' : label}
      </button>

      {isExporting && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-neutral-800 flex items-center space-x-3 transition-all animate-in fade-in slide-in-from-bottom-4">
          <svg
            className="animate-spin h-4 w-4 text-emerald-400"
            xmlns="http://www.w3.org/2000/svg"
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
          <span className="text-xs font-medium">Exporting {label}...</span>
        </div>
      )}
    </>
  );
}
