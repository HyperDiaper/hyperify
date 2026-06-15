'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  Settings,
  Flame,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/habits', label: 'Habits', icon: ListChecks },
  { href: '/heatmap', label: 'Heatmap', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 glass-card rounded-none border-r border-white/[0.04] border-y-0 border-l-0 z-40 bg-dark-900/40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/[0.04]">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-black shadow-glow-primary">
          <Flame className="w-5.5 h-5.5 fill-current" />
        </div>
        <div>
          <h1 className="text-xl font-black gradient-text-primary tracking-wide">
            Hyperify
          </h1>
          <p className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">Level up daily</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                ${
                  isActive
                    ? 'bg-gradient-primary text-black shadow-glow-primary font-bold scale-[1.02]'
                    : 'text-dark-500 hover:text-gray-200 hover:bg-dark-800/40'
                }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-3 px-2 mb-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-8 h-8 rounded-full ring-2 ring-dark-800"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-dark-800 border border-white/[0.04] flex items-center justify-center text-xs font-bold text-white">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-200 truncate">
              {user.displayName || 'User'}
            </p>
            <p className="text-xs text-dark-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-dark-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200 font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
