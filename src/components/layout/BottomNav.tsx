'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/habits', label: 'Habits', icon: ListChecks },
  { href: '/heatmap', label: 'Heatmap', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card rounded-none border-x-0 border-b-0 border-t border-white/[0.04] bg-dark-950/90 backdrop-blur-md">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[64px]
                ${
                  isActive
                    ? 'text-white'
                    : 'text-dark-500 hover:text-gray-300'
                }`}
            >
              <div className="relative">
                <Icon className="w-5.5 h-5.5" />
                {isActive && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4.5 h-0.5 rounded-full bg-gradient-primary" />
                )}
              </div>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
