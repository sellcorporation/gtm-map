import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { generateDecisionMakers } from '@/lib/ai';
import { db, companies } from '@/lib/db';
import { getEffectiveEntitlements, incrementUsage } from '@/lib/billing/entitlements';

const DecisionMakersRequestSchema = z.object({
  companyId: z.number().int().positive(),
  companyName: z.string().min(1),
  companyDomain: z.string().min(1),
  buyerRoles: z.array(z.string()).min(1),
  existingDecisionMakers: z.array(z.object({
    name: z.string(),
    role: z.string(),
    quality: z.enum(['good', 'poor']).optional(),
  })).optional(),
});

async function generateDecisionMakersHandler(request: NextRequest) {
  try {
    // ========== AUTH & BILLING ENFORCEMENT ==========
    console.log('[DECISION-MAKERS] Checking authentication and billing...');
    
    // 1. Authenticate user
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
      console.error('[DECISION-MAKERS] Not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[DECISION-MAKERS] User authenticated:', user.email);

    // 2. Check entitlements
    const { effectivePlan, isTrialing, allowed, used, thresholds } = 
      await getEffectiveEntitlements(user.id);

    console.log('[DECISION-MAKERS] Entitlements:', {
      plan: effectivePlan,
      trial: isTrialing,
      used,
      allowed,
      thresholds,
    });

    // 3. Check if at hard limit (BLOCK)
    if (used >= thresholds.blockAt) {
      console.log('[DECISION-MAKERS] BLOCKED: User at limit');
      const upgradePlan = effectivePlan === 'free' || isTrialing ? 'starter' : 'pro';
      return NextResponse.json({
        error: 'Limit reached',
        message: `You've reached your ${isTrialing ? 'trial' : effectivePlan} limit of ${allowed} AI generations this month.`,
        code: 'LIMIT_REACHED',
        usage: { used, allowed },
        cta: {
          type: 'upgrade',
          plan: upgradePlan,
          url: '/settings/billing',
        },
      }, { status: 402 }); // 402 Payment Required
    }

    // 4. Check if near limit (WARNING)
    const shouldWarn = used >= thresholds.warnAt;
    const remaining = allowed - used;

    if (shouldWarn) {
      console.log(`[DECISION-MAKERS] WARNING: User at ${used}/${allowed} (${remaining} left)`);
    }

    // 5. Increment usage (atomic)
    console.log('[DECISION-MAKERS] Incrementing usage...');
    try {
      await incrementUsage(user.id, isTrialing || false);
      console.log('[DECISION-MAKERS] Usage incremented successfully');
    } catch (usageError) {
      console.error('[DECISION-MAKERS] Failed to increment usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to track usage' },
        { status: 500 }
      );
    }

    // ========== PROCEED WITH GENERATION ==========
    const body = await request.json();
    const { companyId, companyName, companyDomain, buyerRoles, existingDecisionMakers } = DecisionMakersRequestSchema.parse(body);
    
    // Get the current company from database
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (company.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
    
    // Generate decision makers, excluding rejected ones
    const { decisionMakers: newDecisionMakers, isMock } = await generateDecisionMakers(
      companyName,
      companyDomain,
      buyerRoles,
      existingDecisionMakers || []
    );
    
    // Merge with existing decision makers in database
    const existingDMsInDB = (company[0].decisionMakers as Array<{
      name: string;
      role: string;
      linkedin?: string;
      email?: string;
      emailSource?: 'found' | 'generated';
      phone?: string;
      contactStatus: string;
      quality?: string;
      notes?: string;
    }>) || [];
    const mergedDecisionMakers = [...existingDMsInDB, ...newDecisionMakers];
    
    // Update the company record in database with new decision makers and timestamp
    await db
      .update(companies)
      .set({ 
        decisionMakers: mergedDecisionMakers,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));
    
    return NextResponse.json({ 
      success: true, 
      decisionMakers: newDecisionMakers,
      mockData: isMock,
      usage: { 
        used: used + 1, 
        allowed,
        plan: effectivePlan,
        isTrialing,
      },
      warning: shouldWarn ? {
        message: `You have ${remaining - 1} AI generations left this month.`,
        remaining: remaining - 1,
      } : undefined,
    });
    
  } catch (error) {
    console.error('Decision makers generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate decision makers' },
      { status: 500 }
    );
  }
}

export const POST = generateDecisionMakersHandler;

