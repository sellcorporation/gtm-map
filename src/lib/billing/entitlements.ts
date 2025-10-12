import { supabaseAdmin } from '@/lib/supabase/service';

/**
 * Get Effective Entitlements for User
 * 
 * Returns the user's current plan, trial status, and usage limits.
 * Implements "instant clamp" for trial expiry (downgrade to Free immediately).
 */
export async function getEffectiveEntitlements(userId: string) {
  // 1) Fetch current subscription state
  const { data: sub, error: subError } = await supabaseAdmin
    .from('user_subscriptions')
    .select('plan_id, status')
    .eq('user_id', userId)
    .single();

  if (subError) {
    console.error('[ENTITLEMENTS] Error fetching subscription:', subError);
    return { effectivePlan: 'free', isTrialing: false, allowed: 0, used: 0, thresholds: { warnAt: 0, blockAt: 0 } };
  }

  // 2) Check trial status
  const { data: trial, error: trialError } = await supabaseAdmin
    .from('trial_usage')
    .select('expires_at, generations_used, max_generations')
    .eq('user_id', userId)
    .single();

  const now = new Date();
  const hasActiveTrial = trial && now < new Date(trial.expires_at);

  // 3) COMPUTE EFFECTIVE PLAN (instant clamp if trial expired)
  const effectivePlan = hasActiveTrial ? 'pro' : (sub?.plan_id || 'free');
  const isTrialing = hasActiveTrial;

  // 4) BACKGROUND DOWNGRADE (idempotent side-effect)
  if (trial && !hasActiveTrial && sub?.status === 'trialing') {
    // Downgrade from trial to free
    await supabaseAdmin
      .from('user_subscriptions')
      .update({ plan_id: 'free', status: 'active' })
      .eq('user_id', userId)
      .eq('status', 'trialing'); // Idempotent
  }

  // 5) Get usage
  let used = 0;
  if (isTrialing) {
    used = trial?.generations_used || 0;
  } else {
    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);

    const { data: usageData } = await supabaseAdmin
      .from('usage_counters')
      .select('used')
      .eq('user_id', userId)
      .eq('metric', 'ai_generations')
      .eq('period_start', periodStart.toISOString().split('T')[0])
      .single();

    used = usageData?.used || 0;
  }

  // 6) Get allowance from plan
  const { data: planData } = await supabaseAdmin
    .from('subscription_plans')
    .select('max_ai_generations_per_month')
    .eq('id', effectivePlan)
    .single();

  const allowed = isTrialing ? (trial?.max_generations || 10) : (planData?.max_ai_generations_per_month || 0);

  // 7) Compute thresholds
  const thresholds = getThresholds(effectivePlan, allowed, isTrialing || false);

  return { effectivePlan, isTrialing, allowed, used, thresholds };
}

/**
 * Get Warning and Block Thresholds
 */
function getThresholds(plan: string, allowed: number, isTrialing: boolean) {
  if (isTrialing) {
    return { warnAt: 8, blockAt: 10 }; // Trial: warn at 8/10, block at 10/10
  }

  if (plan === 'starter') {
    return { warnAt: 45, blockAt: 50 }; // Starter: warn at 45/50, block at 50/50
  }

  if (plan === 'pro') {
    return { warnAt: 190, blockAt: 200 }; // Pro: warn at 190/200, block at 200/200
  }

  return { warnAt: 0, blockAt: 0 }; // Free: no generations
}

/**
 * Increment Usage (Atomic)
 * 
 * Calls the database RPC function to atomically increment usage.
 */
export async function incrementUsage(userId: string, isTrial: boolean) {
  if (isTrial) {
    // Increment trial usage
    const { error } = await supabaseAdmin.rpc('increment_trial_usage', {
      p_user_id: userId,
    });

    if (error) {
      console.error('[USAGE] Failed to increment trial usage:', error);
      throw new Error('Failed to track trial usage');
    }
  } else {
    // Increment monthly usage
    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);

    const { error } = await supabaseAdmin.rpc('increment_usage', {
      p_user_id: userId,
      p_metric: 'ai_generations',
      p_period_start: periodStart.toISOString().split('T')[0],
    });

    if (error) {
      console.error('[USAGE] Failed to increment usage:', error);
      throw new Error('Failed to track usage');
    }
  }
}
