'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

interface WarningBannerProps {
  used: number;
  allowed: number;
  plan: string;
}

/**
 * Warning Banner Component
 * 
 * Shows when user is near their limit (8/10, 45/50, 190/200).
 * Dismissible per session.
 */
export function WarningBanner({ used, allowed, plan }: WarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const remaining = allowed - used;
  const upgradePlan = plan === 'trial' || plan === 'free' ? 'Starter' : plan === 'starter' ? 'Pro' : null;
  const upgradeGenerations = plan === 'trial' || plan === 'free' ? 50 : plan === 'starter' ? 200 : null;
  const upgradePrice = plan === 'trial' || plan === 'free' ? '£29' : plan === 'starter' ? '£99' : null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
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
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

