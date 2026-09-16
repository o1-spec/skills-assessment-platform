import { getCurrentUser, getRoleDashboardPath } from '@/lib/auth';
import {
  LandingNavbar,
  LandingHero,
  LandingFeatures,
  LandingRolesGrid,
  LandingHowItWorks,
  LandingMetrics,
  LandingCTA,
  LandingFooter,
} from '@/components/landing';

export default async function HomePage() {
  const user = await getCurrentUser();
  const dashboardPath = user ? getRoleDashboardPath(user.role) : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <LandingNavbar user={user} dashboardPath={dashboardPath} />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingRolesGrid />
        <LandingHowItWorks />
        <LandingMetrics />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
