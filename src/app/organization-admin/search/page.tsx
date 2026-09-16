import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { searchTenantEntities } from '@/services/search';
import Link from 'next/link';

export const metadata = {
  title: 'In-Tenant Search | Skills Assessment Platform',
  description: 'Search competencies, role profiles, and people within your organization.',
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const resolvedParams = await searchParams;
  const query = resolvedParams.q?.trim() || '';

  const results = await searchTenantEntities(user.tenantId!, user.role, query, {
    actorUserId: user.id,
    limitPerCategory: 10,
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Search</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find competencies, role profiles, and people across {user.tenant?.name || 'your organization'}.
        </p>
      </div>

      {/* Search Input Bar */}
      <form method="GET" className="relative">
        <div className="relative">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search competencies, roles, people..."
            className="w-full pl-11 pr-24 py-3.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            className="absolute inset-y-1.5 right-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors shadow-sm flex items-center"
          >
            Search
          </button>
        </div>
      </form>

      {/* Results or Prompt */}
      {query.length < 2 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-700">Enter a query of 2 or more characters to search.</p>
          <p className="text-xs text-gray-400 mt-1">Search is automatically restricted to your organization&apos;s domain.</p>
        </div>
      ) : results.totalMatches === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          <p className="text-sm font-medium text-gray-700">No results found matching &ldquo;{query}&rdquo;.</p>
          <p className="text-xs text-gray-400 mt-1">Try refining your search terms or checking for spelling typos.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Found {results.totalMatches} match{results.totalMatches !== 1 ? 'es' : ''} for &ldquo;{query}&rdquo;
          </div>

          {/* Competencies */}
          {results.competencies.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Competencies ({results.competencies.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {results.competencies.map((c) => (
                  <Link
                    key={c.id}
                    href={c.href}
                    className="py-3 flex items-center justify-between group hover:text-blue-600 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">{c.title}</p>
                      {c.subtitle && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{c.subtitle}</p>}
                    </div>
                    {c.statusBadge && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {c.statusBadge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Role Profiles */}
          {results.roles.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  Role Profiles ({results.roles.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {results.roles.map((r) => (
                  <Link
                    key={r.id}
                    href={r.href}
                    className="py-3 flex items-center justify-between group hover:text-indigo-600 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600">{r.title}</p>
                      {r.subtitle && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{r.subtitle}</p>}
                    </div>
                    {r.statusBadge && (
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {r.statusBadge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* People */}
          {results.people.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  People ({results.people.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {results.people.map((p) => (
                  <Link
                    key={p.id}
                    href={p.href}
                    className="py-3 flex items-center justify-between group hover:text-emerald-600 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-600">{p.title}</p>
                      {p.subtitle && <p className="text-xs text-gray-500 mt-0.5">{p.subtitle}</p>}
                    </div>
                    {p.statusBadge && (
                      <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {p.statusBadge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
