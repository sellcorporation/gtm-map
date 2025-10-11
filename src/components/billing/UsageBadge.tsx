'use client';

import { Zap } from 'lucide-react';

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
 */
export function UsageBadge({ used, allowed, plan }: UsageBadgeProps) {
  const percentage = allowed > 0 ? (used / allowed) * 100 : 0;
  
  // Color based on usage
  const getColor = () => {
    if (percentage >= 90) return 'text-red-500 bg-red-50';
    if (percentage >= 80) return 'text-amber-500 bg-amber-50';
    return 'text-gray-700 bg-gray-100';
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getColor()}`}>
      <Zap className="h-4 w-4" />
      <span className="text-xs font-medium">
        {used}/{allowed} AI generations
      </span>
    </div>
  );
}

