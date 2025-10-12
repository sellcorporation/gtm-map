/**
 * EXAMPLE: API WIRING FOR ENFORCEMENT
 * 
 * This file shows the correct enforcement flow for AI generation endpoints.
 * Apply this pattern to:
 * - /api/generate-more
 * - /api/decision-makers
 * - /api/company/analyze
 * 
 * ENFORCEMENT ORDER:
 * 1. Get authenticated user (anon client)
 * 2. Check entitlements (service role - bypass RLS)
 * 3. Block if at limit (return 402 Payment Required)
 * 4. Warn if near limit (include warning in response)
 * 5. Increment usage (atomic, service role)
 * 6. Execute AI generation
 * 7. Return result with usage info
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  getEffectiveEntitlements,
  incrementUsage,
} from '@/lib/billing/entitlements';

export async function POST(request: NextRequest) {
  // ----------------------------------------------------------------------------
  // 1. GET AUTHENTICATED USER (anon client - has user context)
  // ----------------------------------------------------------------------------
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ----------------------------------------------------------------------------
  // 2. CHECK ENTITLEMENTS (service role - handles trial expiry, bypass RLS)
  // ----------------------------------------------------------------------------
  
  const { effectivePlan, isTrialing, allowed, used, thresholds } =
    await getEffectiveEntitlements(user.id);

  // ----------------------------------------------------------------------------
  // 3. BLOCK IF AT LIMIT (return 402 Payment Required)
  // ----------------------------------------------------------------------------
  
  if (used >= thresholds.blockAt) {
    // Construct upgrade CTA based on plan
    const cta =
      effectivePlan === 'starter'
        ? {
            message: 'Upgrade to Pro to continue generating',
            upgradePro: '£99/mo (200 AI gens)',
          }
        : effectivePlan === 'free'
        ? {
            message: 'Upgrade to Starter or Pro to continue',
            upgradeStarter: '£29/mo (50 gens)',
            upgradePro: '£99/mo (200 gens)',
          }
        : isTrialing
        ? {
            message: 'Your trial has ended. Upgrade to continue',
            upgradeStarter: '£29/mo (50 gens)',
            upgradePro: '£99/mo (200 gens)',
          }
        : null;

    return NextResponse.json(
      {
        error: 'Limit reached',
        message: `You've reached ${used}/${allowed} AI generations this ${isTrialing ? 'trial' : 'month'}.`,
        used,
        allowed,
        plan: effectivePlan,
        cta,
      },
      { status: 402 }
    );
  }

  // ----------------------------------------------------------------------------
  // 4. WARN IF NEAR LIMIT (include warning in response)
  // ----------------------------------------------------------------------------
  
  const showWarning = used >= thresholds.warnAt && used < thresholds.blockAt;

  const warningMessage = showWarning
    ? effectivePlan === 'starter'
      ? `You've used ${used}/${allowed} AI generations. Upgrade to Pro (200/mo) to continue without interruption.`
      : isTrialing
      ? `You've used ${used}/${allowed} trial generations. Upgrade to Starter or Pro to continue after your trial.`
      : null
    : null;

  // ----------------------------------------------------------------------------
  // 5. INCREMENT USAGE (atomic, service role, before generation)
  // ----------------------------------------------------------------------------
  
  try {
    await incrementUsage(user.id, isTrialing || false);
  } catch (error) {
    console.error('[GENERATE] Failed to increment usage:', error);
    return NextResponse.json(
      { error: 'Failed to track usage' },
      { status: 500 }
    );
  }

  // ----------------------------------------------------------------------------
  // 6. EXECUTE AI GENERATION (your actual generation logic here)
  // ----------------------------------------------------------------------------
  
  // ... your AI generation code ...
  
  const generatedProspects: Array<{
    name: string;
    domain: string;
    // ... add your prospect fields here
  }> = [
    // ... generated data ...
  ];

  // ----------------------------------------------------------------------------
  // 7. RETURN RESULT WITH USAGE INFO
  // ----------------------------------------------------------------------------
  
  return NextResponse.json({
    success: true,
    prospects: generatedProspects,
    usage: {
      used: used + 1, // After increment
      allowed,
      plan: effectivePlan,
      isTrialing,
      showWarning,
      warningMessage,
    },
  });
}

/**
 * ENFORCEMENT SUMMARY:
 * 
 * ✅ Block at limit → 402 response with upgrade CTA
 * ✅ Warn near limit → 200 response with warning message
 * ✅ Increment usage → Atomic, before generation
 * ✅ Execute generation → Only if under limit
 * ✅ Return usage info → User knows where they stand
 * 
 * CRITICAL POINTS:
 * - Always increment BEFORE generation (prevents over-spend if generation fails)
 * - Always use getEffectiveEntitlements (handles trial expiry)
 * - Always use incrementUsage (atomic, safe for concurrency)
 * - Always return usage info (transparency for user)
 */

