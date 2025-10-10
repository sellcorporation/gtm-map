import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'gtm-session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}

export function createSession(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const sessionId = await getSessionCookie();
  if (!sessionId) return false;
  
  // In a real app, you'd verify the session against a database
  // For this MVP, we'll just check if the session exists
  return !!sessionId;
}

export function requireAuth(handler: (req: NextRequest) => Promise<NextResponse | Response>) {
  return async (req: NextRequest): Promise<NextResponse | Response> => {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    return handler(req);
  };
}
