import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db, userSessions } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const SessionSchema = z.object({
  websiteUrl: z.string().optional(),
  icp: z.object({
    solution: z.string(),
    workflows: z.array(z.string()),
    industries: z.array(z.string()),
    buyerRoles: z.array(z.string()),
    firmographics: z.object({
      size: z.string(),
      geo: z.string(),
    }),
  }).optional(),
  analysisStep: z.string().optional(),
});

async function getSessionHandler() {
  try {
    const userId = 'demo-user'; // TODO: Get from auth context
    
    // Get the most recent session for this user
    const sessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.updatedAt))
      .limit(1);
    
    if (sessions.length === 0) {
      return NextResponse.json({
        session: null,
        message: 'No session found',
      });
    }
    
    return NextResponse.json({
      session: sessions[0],
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

async function saveSessionHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const data = SessionSchema.parse(body);
    
    const userId = 'demo-user'; // TODO: Get from auth context
    
    // Check if session exists
    const existing = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing session
      const updated = await db
        .update(userSessions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(userSessions.userId, userId))
        .returning();
      
      return NextResponse.json({
        session: updated[0],
        message: 'Session updated',
      });
    } else {
      // Create new session
      const created = await db
        .insert(userSessions)
        .values({
          userId,
          ...data,
        })
        .returning();
      
      return NextResponse.json({
        session: created[0],
        message: 'Session created',
      });
    }
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getSessionHandler);
export const POST = requireAuth(saveSessionHandler);

