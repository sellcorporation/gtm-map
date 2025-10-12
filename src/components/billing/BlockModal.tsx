'use client';

import { Lock } from 'lucide-react';
import { useState } from 'react';

interface BlockModalProps {
  isOpen: boolean;
  used: number;
  allowed: number;
  plan: string;
  onClose: () => void;
  onUpgrade: (plan: 'starter' | 'pro') => void;
}

/**
 * Block Modal Component
 * 
 * Shown when user hits their limit (10/10, 50/50, 200/200).
 * Provides single CTA to upgrade.
 */
export function BlockModal({
  isOpen,
  allowed,
  plan,
  onClose,
  onUpgrade,
}: BlockModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!isOpen) return null;

  // Determine suggested plan based on current plan
  const isTrialOrFree = plan === 'trial' || plan === 'free';
  const suggestedPlan = isTrialOrFree || plan === 'starter' ? 'pro' : 'starter';
  const suggestedGenerations = suggestedPlan === 'pro' ? 200 : 50;
  const suggestedPrice = suggestedPlan === 'pro' ? '£99' : '£29';

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    await onUpgrade(suggestedPlan);
    setIsUpgrading(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <Lock className="h-6 w-6 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold mt-4 text-gray-900">
            You&apos;ve reached your limit
          </h3>
          
          <p className="text-sm text-gray-600 mt-2">
            {plan === 'trial' && `You've used all ${allowed} AI generations in your trial. Upgrade to continue generating high-quality prospects.`}
            {plan === 'free' && `You've used all ${allowed} AI generations. Upgrade to continue generating high-quality prospects.`}
            {plan === 'starter' && (
              <>
                🎉 <strong>Amazing work!</strong> You&apos;ve used all {allowed} AI generations this month. 
                You&apos;re clearly a power user! Upgrade to Pro for {suggestedGenerations} generations/month and keep the momentum going.
              </>
            )}
            {plan === 'pro' && (
              <>
                🎊 <strong>Incredible!</strong> You&apos;ve used all {allowed} AI generations this month. 
                You&apos;re a true power user! We&apos;re working on a feature to unlock extra AI generations for users like you.
                <br /><br />
                <strong>Want early access?</strong> Send us an email at{' '}
                <a 
                  href="mailto:ionut.furnea@sellcorporation.com?subject=Request%20for%20Extra%20AI%20Generations" 
                  className="text-blue-600 hover:text-blue-700 underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  ionut.furnea@sellcorporation.com
                </a>
                {' '}and we&apos;ll prioritize your request. Your limit resets next month.
              </>
            )}
          </p>

          <div className="mt-6 space-y-3">
            {/* Only show upgrade button if not already on Pro */}
            {plan !== 'pro' && (
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
              >
                {isUpgrading ? 'Upgrading...' : `Upgrade to ${suggestedPlan === 'pro' ? 'Pro' : 'Starter'} (${suggestedPrice}/month)`}
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-full px-6 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              {plan === 'pro' ? 'Got it' : 'Maybe later'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

