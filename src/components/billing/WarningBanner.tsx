'use client';

import { AlertTriangle, Lock, X } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WarningBannerProps {
  used: number;
  allowed: number;
  plan: string;
  isAtLimit?: boolean;
}

/**
 * Warning Banner Component
 * 
 * Shows when user is near their limit (80%+) or at limit (100%).
 * - Warning state (80-99%): Amber, dismissible
 * - Limit state (100%): Red, with upgrade button
 */
export function WarningBanner({ used, allowed, plan, isAtLimit = false }: WarningBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && !isAtLimit) return null; // Can't dismiss when at limit

  const remaining = allowed - used;
  const upgradePlan = plan === 'trial' || plan === 'free' ? 'Starter' : plan === 'starter' ? 'Pro' : null;
  const upgradeGenerations = plan === 'trial' || plan === 'free' ? 50 : plan === 'starter' ? 200 : null;
  const upgradePrice = plan === 'trial' || plan === 'free' ? '£29' : plan === 'starter' ? '£99' : null;

  // At limit: Red banner with upgrade button
  if (isAtLimit) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Lock className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                You&apos;ve reached your limit of {allowed} AI generations this month
              </p>
              <p className="text-xs text-red-700 mt-1">
                {plan === 'pro' 
                  ? 'Your limit resets next month. You\'re on the highest plan!'
                  : upgradePlan 
                    ? `Upgrade to ${upgradePlan} to continue generating prospects immediately.`
                    : 'Upgrade to continue generating prospects.'
                }
              </p>
            </div>
            {upgradePlan && (
              <button
                onClick={() => router.push('/settings/billing')}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                Upgrade to {upgradePlan}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Warning state: Amber banner, dismissible
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              You&apos;ve used {used} of {allowed} AI generations
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Only {remaining} generation{remaining !== 1 ? 's' : ''} left this month. 
              {upgradePlan && (
                <>
                  {' '}Upgrade to {upgradePlan} for {upgradeGenerations} generations/month ({upgradePrice})
                </>
              )}
            </p>
          </div>
          {upgradePlan && (
            <button
              onClick={() => router.push('/settings/billing')}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap ml-3"
            >
              Upgrade to {upgradePlan}
            </button>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800 ml-3"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

