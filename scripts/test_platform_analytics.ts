import { prisma } from '../src/lib/db';
import { getPlatformAnalytics } from '../src/services/platform-analytics';

async function run() {
  console.log('=== Running Platform Analytics Test Suite ===');

  const analytics = await getPlatformAnalytics();

  console.log('Tenants:', analytics.tenants);
  console.log('Users:', analytics.users.total, 'Active:', analytics.users.active);
  console.log('Campaigns:', analytics.campaigns);
  console.log('Assessments:', analytics.assessments);
  console.log('Framework distribution:', analytics.frameworkAdoptionDistribution);
  console.log('Industry templates:', analytics.industryTemplateUsage);
  console.log('Benchmarking notice:', analytics.benchmarkingNotice.status);

  // Assertions
  if (typeof analytics.tenants.total !== 'number' || analytics.tenants.total < 1) {
    throw new Error('Expected at least 1 tenant in analytics');
  }

  if (typeof analytics.assessments.completionRate !== 'number') {
    throw new Error('Expected completionRate to be a number');
  }

  if (analytics.benchmarkingNotice.status !== 'OPERATIONAL_ANALYTICS_ONLY') {
    throw new Error('Expected benchmarkingNotice status OPERATIONAL_ANALYTICS_ONLY');
  }

  console.log('✔ Platform Analytics tests passed successfully!');
}

run()
  .catch((err) => {
    console.error('❌ Platform Analytics test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
