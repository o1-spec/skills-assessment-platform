import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'skills_session';
export const SESSION_DURATION_SECONDS = 8 * 60 * 60;

function getAuthSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error('AUTH_SECRET is not configured. Please set AUTH_SECRET in your environment.');
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  impersonatedTenantId?: string | null;
  impersonationReason?: string | null;
  exp?: number;
}

export async function createSessionToken(
  userId: string,
  impersonation?: { impersonatedTenantId: string; impersonationReason: string }
): Promise<string> {
  const secretKey = getAuthSecretKey();
  const token = await new SignJWT({
    userId,
    impersonatedTenantId: impersonation?.impersonatedTenantId ?? null,
    impersonationReason: impersonation?.impersonationReason ?? null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey);

  return token;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getAuthSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    if (typeof payload.userId !== 'string') {
      return null;
    }

    return {
      userId: payload.userId,
      impersonatedTenantId:
        typeof payload.impersonatedTenantId === 'string' ? payload.impersonatedTenantId : null,
      impersonationReason:
        typeof payload.impersonationReason === 'string' ? payload.impersonationReason : null,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
