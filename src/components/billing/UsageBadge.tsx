'use client';

import { useRouter } from 'next/navigation';
import { Zap, Lock } from 'lucide-react';

interface UsageBadgeProps {
  used: number;
  allowed: number;
  plan: string;
}

/**
 * Usage Badge Component
 * 
 * Displays current AI generation usage in header.
 * Shows different colors based on usage level.
 * Clickable - navigates to billing page.
 * 
 * States:
 * - Gray + Lightning: Under 80% (healthy)
 * - Amber + Lightning: 80-99% (warning, can still generate)
 * - Red + Lock: 100% (at limit, blocked)
 */
export function UsageBadge({ used, allowed, plan }: UsageBadgeProps) {
  const router = useRouter();
  const percentage = allowed > 0 ? (used / allowed) * 100 : 0;
  const isAtLimit = used >= allowed;
  
  // Color based on usage
  const getColor = () => {
    if (isAtLimit) return 'text-red-500 bg-red-50 hover:bg-red-100'; // Red ONLY at 100%
    if (percentage >= 80) return 'text-amber-500 bg-amber-50 hover:bg-amber-100'; // Amber at 80-99%
    return 'text-gray-700 bg-gray-100 hover:bg-gray-200'; // Gray under 80%
  };

  const handleClick = () => {
    router.push('/settings/billing');
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${getColor()}`}
      aria-label="View billing and usage details"
      title="Click to view billing"
    >
      {isAtLimit ? (
        <Lock className="h-4 w-4" />
      ) : (
        <Zap className="h-4 w-4" />
      )}
      <span className="text-xs font-medium">
        {used}/{allowed} AI generations
      </span>
    </button>
  );
}

