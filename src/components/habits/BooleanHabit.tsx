'use client';

import { Check } from 'lucide-react';

interface BooleanHabitProps {
  completed: boolean;
  onToggle: (completed: boolean) => void;
  gradient: string;
}

const gradientMapColors: Record<string, string> = {
  'gradient-volt-blue': 'from-[#a3e635] to-[#2563eb]',
  'gradient-lime-emerald': 'from-[#a3e635] to-[#059669]',
  'gradient-gold-rose': 'from-[#f59e0b] to-[#ec4899]',
  'gradient-cyan-blue': 'from-[#00f2fe] to-[#2563eb]',
  'gradient-sunset-orange': 'from-[#f97316] to-[#e11d48]',
  'gradient-electric-purple': 'from-[#7c3aed] to-[#db2777]',
  'gradient-aurora-teal': 'from-[#0d9488] to-[#34d399]',
  'gradient-cyberpunk': 'from-[#f43f5e] to-[#06b6d4]',
  'gradient-lavender-indigo': 'from-[#a5b4fc] to-[#4f46e5]',
  'gradient-monochrome': 'from-[#334155] to-[#f8fafc]',
};

export default function BooleanHabit({ completed, onToggle, gradient }: BooleanHabitProps) {
  const gradClasses = gradientMapColors[gradient] || 'from-[#a3e635] to-[#0d9488]';

  return (
    <button
      onClick={() => onToggle(!completed)}
      className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 relative overflow-hidden group
        ${
          completed
            ? `bg-gradient-to-br ${gradClasses} border-transparent shadow-lg scale-100`
            : 'border-white/[0.06] hover:border-white/[0.12] bg-dark-950/40 hover:scale-105'
        }
      `}
    >
      {!completed && (
        <span className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      <Check
        className={`w-6 h-6 transition-all duration-300
          ${
            completed
              ? 'text-black scale-100 rotate-0 animate-check-bounce'
              : 'text-gray-500 group-hover:text-gray-300 scale-90 rotate-6'
          }
        `}
      />
    </button>
  );
}
