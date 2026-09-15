import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function cleanConnectionString(rawUrl?: string) {
  if (!rawUrl) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete('sslmode');
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function createPrismaClient() {
  const connectionString = cleanConnectionString(process.env.DATABASE_URL);
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
