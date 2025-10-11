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
  used,
  allowed,
  plan,
  onClose,
  onUpgrade,
}: BlockModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!isOpen) return null;

  const suggestedPlan = plan === 'free' || plan === 'starter' ? 'pro' : 'starter';
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
            You&apos;ve used all {allowed} AI generations this month.
            {plan === 'free' && ' Start your 14-day trial with Pro features to continue.'}
            {plan !== 'free' && ` Upgrade to ${suggestedPlan === 'pro' ? 'Pro' : 'Starter'} for ${suggestedGenerations} generations/month.`}
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
            >
              {isUpgrading ? 'Upgrading...' : `Upgrade to ${suggestedPlan === 'pro' ? 'Pro' : 'Starter'} (${suggestedPrice}/month)`}
            </button>
            
            <button
              onClick={onClose}
              className="w-full px-6 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

