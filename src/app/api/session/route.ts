import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { db, userSessions } from '@/lib/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// ========== VALIDATION SCHEMAS ==========

const ICPSchema = z.object({
  solution: z.string().min(1, 'Solution description is required'),
  workflows: z.array(z.string()).min(1, 'Customer workflows are required'),
  industries: z.array(z.string()).min(1, 'Industries are required'),
  buyerRoles: z.array(z.string()).min(1, 'Buyer roles are required'),
  firmographics: z.object({
    size: z.string().min(1, 'Company size is required'),
    geo: z.string().min(1, 'Geography is required'),
  }),
}).passthrough(); // Allow additional fields

const CustomerSchema = z.object({
  name: z.string(),
  domain: z.string(),
}).passthrough();

const SessionSchema = z.object({
  icp: ICPSchema.optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
  analysisStep: z.number().int().min(0).max(4).optional().nullable(),
  customers: z.array(CustomerSchema).optional().nullable(),
});

// ========== GET SESSION ==========

async function getSessionHandler(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[SESSION-GET ${requestId}] Starting...`);

  try {
    // Authenticate
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[SESSION-GET ${requestId}] Not authenticated`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[SESSION-GET ${requestId}] User: ${user.email}`);

    // Fetch session from database
    const sessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, user.id))
      .limit(1);

    const session = sessions[0] || null;

    console.log(`[SESSION-GET ${requestId}] Found session: ${session ? 'YES' : 'NO'}`);

    // Return session or null (not 404 — empty is valid)
    const response = NextResponse.json({
      session: session ? {
        icp: session.icp,
        websiteUrl: session.websiteUrl,
        analysisStep: session.analysisStep,
        customers: session.customers,
        lastActive: session.lastActive,
      } : null,
    });

    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error(`[SESSION-GET ${requestId}] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// ========== POST/UPDATE SESSION ==========

async function updateSessionHandler(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[SESSION-POST ${requestId}] Starting...`);

  try {
    // Authenticate
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`[SESSION-POST ${requestId}] Not authenticated`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[SESSION-POST ${requestId}] User: ${user.email}`);

    // Parse and validate body
    const body = await request.json();
    const validatedData = SessionSchema.parse(body);

    console.log(`[SESSION-POST ${requestId}] Validated data:`, {
      hasICP: !!validatedData.icp,
      hasWebsiteUrl: !!validatedData.websiteUrl,
      analysisStep: validatedData.analysisStep,
      customerCount: validatedData.customers?.length || 0,
    });

    // Upsert session (PostgreSQL conflict resolution)
    const upsertedSession = await db
      .insert(userSessions)
      .values({
        userId: user.id,
        icp: validatedData.icp || null,
        websiteUrl: validatedData.websiteUrl || null,
        analysisStep: validatedData.analysisStep || 0,
        customers: validatedData.customers || null,
        lastActive: new Date(),
      })
      .onConflictDoUpdate({
        target: userSessions.userId,
        set: {
          icp: validatedData.icp || null,
          websiteUrl: validatedData.websiteUrl || null,
          analysisStep: validatedData.analysisStep || 0,
          customers: validatedData.customers || null,
          lastActive: new Date(),
        },
      })
      .returning();

    console.log(`[SESSION-POST ${requestId}] Session saved successfully`);

    const response = NextResponse.json({
      success: true,
      session: {
        icp: upsertedSession[0].icp,
        websiteUrl: upsertedSession[0].websiteUrl,
        analysisStep: upsertedSession[0].analysisStep,
        customers: upsertedSession[0].customers,
        lastActive: upsertedSession[0].lastActive,
      },
    });

    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error(`[SESSION-POST ${requestId}] Error:`, error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid session data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    );
  }
}

export const GET = getSessionHandler;
export const POST = updateSessionHandler;

