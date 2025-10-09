import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword, verifyPassword, createSession, setSessionCookie, clearSessionCookie } from '@/lib/auth';

const AuthSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = AuthSchema.parse(body);
    
    const correctPassword = process.env.APP_PASSWORD;
    if (!correctPassword) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    if (password === correctPassword) {
      const sessionId = createSession();
      await setSessionCookie(sessionId);
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
