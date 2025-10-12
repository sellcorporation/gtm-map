'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { CreditCard, Loader2, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<{
    plan_id: string;
    status: string;
    stripe_customer_id?: string;
    current_period_end?: string;
  } | null>(null);
  const [usage, setUsage] = useState({ used: 0, allowed: 0 });
  const [upgrading, setUpgrading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Check for upgrade success message
    const upgraded = searchParams.get('upgraded');
    const plan = searchParams.get('plan');
    
    if (upgraded === 'true' && plan) {
      const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
      toast.success(`🎉 Successfully upgraded to ${planName}! Your new limits are active immediately.`, {
        duration: 5000,
      });
      
      // Clean up URL
      window.history.replaceState({}, '', '/settings/billing');
    }
    
    loadBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBillingData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get subscription
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setSubscription(sub);

      // Get actual usage data (same logic as main page)
      const { data: trial } = await supabase
        .from('trial_usage')
        .select('generations_used, max_generations, expires_at')
        .eq('user_id', user.id)
        .single();

      const now = new Date();
      const hasActiveTrial = trial && now < new Date(trial.expires_at);

      let used = 0;
      let allowed = 0;

      if (hasActiveTrial) {
        // Trial usage
        used = trial.generations_used || 0;
        allowed = trial.max_generations || 10;
      } else {
        // Get monthly usage from usage_counters
        const periodStart = new Date();
        periodStart.setUTCDate(1);
        periodStart.setUTCHours(0, 0, 0, 0);

        const { data: usageData } = await supabase
          .from('usage_counters')
          .select('used')
          .eq('user_id', user.id)
          .eq('metric', 'ai_generations')
          .eq('period_start', periodStart.toISOString().split('T')[0])
          .single();

        used = usageData?.used || 0;

        // Get plan limit from subscription_plans
        const planId = sub?.plan_id || 'free';
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('max_ai_generations_per_month')
          .eq('id', planId)
          .single();

        allowed = planData?.max_ai_generations_per_month || 0;
      }

      setUsage({ used, allowed });
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(plan: 'starter' | 'pro') {
    setUpgrading(true);
    try {
      console.log('[BILLING] Calling checkout API for plan:', plan);
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      console.log('[BILLING] Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[BILLING] Checkout failed:', errorData);
        alert(`Checkout failed: ${errorData.error || 'Unknown error'}`);
        setUpgrading(false);
        return;
      }

      const data = await response.json();
      console.log('[BILLING] Response data:', data);
      
      if (data.url) {
        console.log('[BILLING] Redirecting to Stripe:', data.url);
        window.location.href = data.url;
      } else {
        console.error('[BILLING] No URL in response');
        alert('Failed to create checkout session');
        setUpgrading(false);
      }
    } catch (error) {
      console.error('[BILLING] Error creating checkout:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUpgrading(false);
    }
  }

  async function openCustomerPortal() {
    try {
      console.log('[BILLING] Opening customer portal...');
      setUpgrading(true); // Reuse loading state
      
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to open portal' }));
        console.error('[BILLING] Portal failed:', errorData);
        alert(`Failed to open portal: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const data = await response.json();
      console.log('[BILLING] Portal URL:', data.url);
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create portal session');
      }
    } catch (error) {
      console.error('[BILLING] Error opening portal:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpgrading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentPlan = subscription?.plan_id || 'free';
  const planName = currentPlan === 'pro' ? 'Pro' : currentPlan === 'starter' ? 'Starter' : 'Free';
  const planPrice = currentPlan === 'pro' ? '£99' : currentPlan === 'starter' ? '£29' : '£0';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with Back Button */}
      <div>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Market Map
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage your subscription and usage
        </p>
      </div>

      {/* Current Plan */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{planName} Plan</h3>
            <p className="text-sm text-gray-600 mt-1">
              {planPrice}/month • {usage.allowed} AI generations
            </p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            Active
          </span>
        </div>

        {/* Usage */}
        {usage.allowed > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>This month&apos;s usage</span>
              <span className="font-medium">
                {usage.used} of {usage.allowed} generations used
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usage.used >= usage.allowed
                    ? 'bg-red-500'      // Red ONLY at 100%
                    : (usage.used / usage.allowed) * 100 >= 80
                    ? 'bg-amber-500'    // Amber at 80-99%
                    : 'bg-gray-600'     // Gray under 80%
                }`}
                style={{ width: `${Math.min((usage.used / usage.allowed) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Options */}
      {currentPlan !== 'pro' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Upgrade your plan</h3>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Starter */}
            {currentPlan === 'free' && (
              <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <h4 className="text-lg font-semibold text-gray-900">Starter</h4>
                <p className="text-3xl font-bold text-gray-900 mt-2">£29<span className="text-sm font-normal text-gray-600">/month</span></p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-600" />
                    50 AI generations per month
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-600" />
                    Unlimited prospects
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-600" />
                    Priority support
                  </li>
                </ul>
                <button
                  onClick={() => handleUpgrade('starter')}
                  disabled={upgrading}
                  className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {upgrading ? 'Processing...' : 'Upgrade to Starter'}
                </button>
              </div>
            )}

            {/* Pro */}
            <div className="border-2 border-blue-600 rounded-lg p-6 bg-white shadow-md hover:shadow-lg transition-shadow relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                Most Popular
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Pro</h4>
              <p className="text-3xl font-bold text-gray-900 mt-2">£99<span className="text-sm font-normal text-gray-600">/month</span></p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-600" />
                  200 AI generations per month
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-600" />
                  Unlimited prospects
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-600" />
                  Priority support
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-600" />
                  Advanced features
                </li>
              </ul>
              <button
                onClick={() => handleUpgrade('pro')}
                disabled={upgrading}
                className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {upgrading ? 'Processing...' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Billing */}
      {currentPlan !== 'free' && (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage billing</h3>
          <p className="text-sm text-gray-600 mb-4">
            Update payment method, view invoices, or cancel subscription
          </p>
          <button
            onClick={openCustomerPortal}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Manage billing
          </button>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading billing...</p>
        </div>
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  );
}

