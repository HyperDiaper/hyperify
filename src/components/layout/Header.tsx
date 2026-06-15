'use client';

import { useAuth } from '@/context/AuthContext';
import { Flame, Bell } from 'lucide-react';

export default function Header() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 glass-card rounded-none border-x-0 border-t-0 border-b border-white/[0.04] bg-dark-950/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 md:px-8 py-4">
        {/* Mobile logo - hidden on desktop */}
        <div className="flex items-center gap-2.5 md:hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-black">
            <Flame className="w-4.5 h-4.5 fill-current" />
          </div>
          <h1 className="text-lg font-bold gradient-text-primary">
            Hyperify
          </h1>
        </div>

        {/* Greeting - visible on desktop */}
        <div className="hidden md:block">
          <h2 className="text-lg font-semibold text-gray-100">
            {getGreeting()},{' '}
            <span className="gradient-text-primary font-bold">
              {user.displayName?.split(' ')[0] || 'there'}
            </span>
          </h2>
          <p className="text-sm text-dark-500">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <button className="relative w-10 h-10 rounded-xl bg-dark-800/40 border border-white/[0.04] flex items-center justify-center text-dark-500 hover:text-gray-200 hover:border-white/[0.08] transition-all duration-200">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-gradient-primary" />
          </button>

          {/* User avatar - mobile only */}
          <div className="md:hidden">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-9 h-9 rounded-xl ring-2 ring-dark-800"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-dark-800 border border-white/[0.04] flex items-center justify-center text-xs font-bold text-white">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
