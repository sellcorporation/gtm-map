import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { db, companies } from '@/lib/db';
import { fetchWebsiteContent } from '@/lib/search';
import { analyzeWebsiteAgainstICP } from '@/lib/ai';
import { getEffectiveEntitlements, incrementUsage } from '@/lib/billing/entitlements';

const AnalyzeRequestSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  icp: z.object({
    solution: z.string(),
    workflows: z.array(z.string()),
    industries: z.array(z.string()),
    buyerRoles: z.array(z.string()),
    firmographics: z.object({
      size: z.string(),
      geo: z.string(),
    }),
  }),
});

async function analyzeCompanyHandler(request: NextRequest) {
  try {
    // ========== AUTH & BILLING ENFORCEMENT ==========
    console.log('[COMPANY-ANALYZE] Checking authentication and billing...');
    
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
      console.error('[COMPANY-ANALYZE] Not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[COMPANY-ANALYZE] User authenticated:', user.email);

    // 2. Check entitlements
    const { effectivePlan, isTrialing, allowed, used, thresholds } = 
      await getEffectiveEntitlements(user.id);

    console.log('[COMPANY-ANALYZE] Entitlements:', {
      plan: effectivePlan,
      trial: isTrialing,
      used,
      allowed,
      thresholds,
    });

    // 3. Check if at hard limit (BLOCK)
    if (used >= thresholds.blockAt) {
      console.log('[COMPANY-ANALYZE] BLOCKED: User at limit');
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
      console.log(`[COMPANY-ANALYZE] WARNING: User at ${used}/${allowed} (${remaining} left)`);
    }

    // 5. Increment usage (atomic)
    console.log('[COMPANY-ANALYZE] Incrementing usage...');
    try {
      await incrementUsage(user.id, isTrialing);
      console.log('[COMPANY-ANALYZE] Usage incremented successfully');
    } catch (usageError) {
      console.error('[COMPANY-ANALYZE] Failed to increment usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to track usage' },
        { status: 500 }
      );
    }

    // ========== PROCEED WITH ANALYSIS ==========
    const body = await request.json();
    const { name, domain, icp } = AnalyzeRequestSchema.parse(body);

    console.log(`Analyzing manually added prospect: ${name} (${domain})`);

    // Fetch website content
    const websiteContent = await fetchWebsiteContent(domain);

    // Analyze against ICP
    const analysis = await analyzeWebsiteAgainstICP(
      websiteContent,
      name,
      domain,
      icp
    );

    // Save the prospect to the database and get the real database ID
    const savedProspect = await db.insert(companies).values({
      userId: user.id,
      name,
      domain,
      source: 'expanded',
      sourceCustomerDomain: null,
      icpScore: analysis.icpScore,
      confidence: analysis.confidence,
      status: 'New',
      rationale: analysis.rationale,
      evidence: analysis.evidence,
      decisionMakers: null,
      quality: null,
      notes: 'Manually added prospect',
      tags: null,
      relatedCompanyIds: null,
    }).returning();

    console.log('[COMPANY-ANALYZE] Saved prospect to database with ID:', savedProspect[0].id);

    return NextResponse.json({
      success: true,
      company: savedProspect[0], // Return the full saved company object with real database ID
      icpScore: analysis.icpScore,
      confidence: analysis.confidence,
      rationale: analysis.rationale,
      evidence: analysis.evidence,
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
    console.error('Company analysis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze company' },
      { status: 500 }
    );
  }
}

export const POST = analyzeCompanyHandler;

