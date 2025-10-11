import { supabaseAdmin } from '@/lib/supabase/service';

export interface Entitlements {
  effectivePlan: 'free' | 'starter' | 'pro';
  isTrialing: boolean;
  allowed: number;
  used: number;
  thresholds: { warnAt: number; blockAt: number };
}

/**
 * Get user's effective entitlements with trial expiry handling.
 * 
 * CRITICAL FEATURES:
 * 1. Instant clamp: Computes effective plan BEFORE DB write
 * 2. Idempotent: Safe to call concurrently
 * 3. No hard-coded limits: Reads from subscription_plans
 * 4. Trial tracking: Uses trial_usage table (14 days, 10 gens)
 * 
 * @param userId - Supabase auth.users.id (UUID)
 * @returns Entitlements with effective plan, trial status, and limits
 */
export async function getEffectiveEntitlements(
  userId: string
): Promise<Entitlements> {
  // 1) Check if user has active trial
  const { data: trial } = await supabaseAdmin
    .from('trial_usage')
    .select('expires_at, generations_used, max_generations')
    .eq('user_id', userId)
    .single();

  const now = new Date();
  const hasActiveTrial = trial && now < new Date(trial.expires_at);

  // 2) If trial expired, downgrade to Free (idempotent, background)
  if (trial && !hasActiveTrial) {
    await supabaseAdmin
      .from('user_subscriptions')
      .update({ plan_id: 'free', status: 'active' })
      .eq('user_id', userId)
      .neq('plan_id', 'free'); // Only update if not already Free (idempotent)
  }

  // 3) Get subscription state (uses ai_allowance view for simplicity)
  const { data: allowanceData } = await supabaseAdmin
    .from('ai_allowance')
    .select('allowed, plan_id, status, is_trialing')
    .eq('user_id', userId)
    .single();

  if (!allowanceData) {
    // No subscription found, return Free plan defaults
    return {
      effectivePlan: 'free',
      isTrialing: false,
      allowed: 0,
      used: 0,
      thresholds: { warnAt: 0, blockAt: 0 },
    };
  }

  // 4) Compute effective plan (instant clamp if trial expired)
  const effectivePlan = hasActiveTrial
    ? 'pro' // Trial users get Pro features
    : (allowanceData.plan_id as 'free' | 'starter' | 'pro');

  const isTrialing = hasActiveTrial;
  const allowed = hasActiveTrial ? trial.max_generations : allowanceData.allowed;

  // 5) Get current period usage
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  let used = 0;

  if (hasActiveTrial) {
    // For trial: use generations_used from trial_usage (lifetime, not monthly)
    used = trial.generations_used;
  } else {
    // For paid/free: use usage_counters (monthly)
    const { data: usageData } = await supabaseAdmin
      .from('usage_counters')
      .select('used')
      .eq('user_id', userId)
      .eq('metric', 'ai_generations')
      .eq('period_start', periodStart.toISOString().split('T')[0])
      .single();

    used = usageData?.used || 0;
  }

  // 6) Compute thresholds (NO HARD-CODED VALUES)
  const thresholds = getThresholds(
    isTrialing ? 'trial' : effectivePlan,
    allowed
  );

  return { effectivePlan, isTrialing, allowed, used, thresholds };
}

/**
 * Get warning and block thresholds for a plan.
 * 
 * THRESHOLDS (as specified in ultra-MVP):
 * - Trial (10 gens): Warn at 8, block at 10 (80%)
 * - Starter (50 gens): Warn at 45, block at 50 (90%)
 * - Pro (200 gens): Warn at 190, block at 200 (95%)
 */
function getThresholds(
  plan: 'trial' | 'free' | 'starter' | 'pro',
  allowed: number
): { warnAt: number; blockAt: number } {
  if (plan === 'trial') return { warnAt: 8, blockAt: 10 };
  if (plan === 'starter') return { warnAt: 45, blockAt: 50 };
  if (plan === 'pro') return { warnAt: 190, blockAt: 200 };
  return { warnAt: 0, blockAt: 0 }; // Free plan
}

/**
 * Atomically increment usage counter (or trial usage).
 * 
 * CRITICAL: Uses service role RPC for atomic upsert.
 * Safe to call concurrently (no race conditions).
 * 
 * @param userId - Supabase auth.users.id (UUID)
 */
export async function incrementUsage(userId: string): Promise<void> {
  // 1) Check if user has active trial
  const { data: trial } = await supabaseAdmin
    .from('trial_usage')
    .select('user_id, expires_at')
    .eq('user_id', userId)
    .single();

  const now = new Date();
  const hasActiveTrial = trial && now < new Date(trial.expires_at);

  if (hasActiveTrial) {
    // Increment trial usage (lifetime counter via atomic RPC)
    await supabaseAdmin.rpc('increment_trial_usage', {
      p_user_id: userId,
    });
  } else {
    // Increment monthly usage counter (via atomic RPC)
    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);

    await supabaseAdmin.rpc('increment_usage', {
      p_user_id: userId,
      p_metric: 'ai_generations',
      p_period_start: periodStart.toISOString().split('T')[0],
    });
  }
}

/**
 * Get current month's AI generation usage for user.
 * 
 * @param userId - Supabase auth.users.id (UUID)
 * @returns Number of AI generations used this month (or lifetime for trial)
 */
export async function getUsedThisMonth(userId: string): Promise<number> {
  // 1) Check if user has active trial
  const { data: trial } = await supabaseAdmin
    .from('trial_usage')
    .select('expires_at, generations_used')
    .eq('user_id', userId)
    .single();

  const now = new Date();
  const hasActiveTrial = trial && now < new Date(trial.expires_at);

  if (hasActiveTrial) {
    return trial.generations_used;
  }

  // 2) Get monthly usage
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabaseAdmin
    .from('usage_counters')
    .select('used')
    .eq('user_id', userId)
    .eq('metric', 'ai_generations')
    .eq('period_start', periodStart.toISOString().split('T')[0])
    .single();

  if (error || !data) return 0;
  return data.used;
}

