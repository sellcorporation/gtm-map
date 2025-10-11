'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, LogOut, Settings, ChevronDown, CreditCard } from 'lucide-react';

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; fullName: string | null } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          email: user.email || '',
          fullName: user.user_metadata?.full_name || null,
        });
      }
    });

    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [supabase]);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (!user) {
    return null; // Don't show menu if no user
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
          {user.fullName ? user.fullName[0].toUpperCase() : user.email[0].toUpperCase()}
        </div>
        <span className="text-sm font-medium text-gray-700 max-w-[150px] truncate hidden md:block">
          {user.fullName || user.email}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform hidden md:block ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{user.fullName || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/settings/billing');
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Billing & Usage</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // You can open settings modal here if needed
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>AI Settings</span>
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{loading ? 'Logging out...' : 'Log out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

