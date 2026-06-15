'use client';

import { useHabitsContext } from '@/context/HabitContext';
import * as Icons from 'lucide-react';

interface CategoryBadgeProps {
  categoryId: string;
  categoryName?: string;
  categoryColor?: string;
}

// Maps color names to tailwind border/text styles
const colorClasses: Record<string, string> = {
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  lime: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  gold: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  lavender: 'bg-indigo-300/10 text-indigo-300 border-indigo-300/20',
  mint: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
};

export default function CategoryBadge({ categoryId, categoryName, categoryColor }: CategoryBadgeProps) {
  const { categories } = useHabitsContext();
  
  // Try to find the category in the dynamic categories list
  const found = categories.find((c) => c.id === categoryId);
  
  const name = categoryName || found?.name || categoryId;
  const color = categoryColor || found?.color || 'violet';
  const iconName = found?.icon || 'Tag';

  const IconComponent = (Icons as any)[iconName] || Icons.Tag;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
        colorClasses[color] || colorClasses.violet
      }`}
    >
      <IconComponent className="w-3.5 h-3.5" />
      {name}
    </span>
  );
}
