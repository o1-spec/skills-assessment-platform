export default function Loading() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <div className="flex flex-col items-center max-w-sm w-full text-center space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-md relative z-10">
            <svg
              className="w-8 h-8 text-emerald-400 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-xl animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-tight text-neutral-900">
            Loading Workspace
          </h2>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto">
            Retrieving competencies, verified profiles, and real-time assessment data...
          </p>
        </div>

        <div className="w-48 bg-stone-200/80 rounded-full h-1 overflow-hidden">
          <div className="bg-neutral-900 h-full w-1/3 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
