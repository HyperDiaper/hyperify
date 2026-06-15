'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Minus } from 'lucide-react';
import ProgressRing from '../ui/ProgressRing';

interface QuantHabitProps {
  value: number;
  target: number;
  unit: string;
  onChange: (value: number) => void;
  gradient: string;
  habitId: string;
}

const gradientMapColors: Record<string, { start: string; end: string }> = {
  'gradient-volt-blue': { start: '#a3e635', end: '#2563eb' },
  'gradient-lime-emerald': { start: '#a3e635', end: '#059669' },
  'gradient-gold-rose': { start: '#f59e0b', end: '#ec4899' },
  'gradient-cyan-blue': { start: '#00f2fe', end: '#2563eb' },
  'gradient-sunset-orange': { start: '#f97316', end: '#e11d48' },
  'gradient-electric-purple': { start: '#7c3aed', end: '#db2777' },
  'gradient-aurora-teal': { start: '#0d9488', end: '#34d399' },
  'gradient-cyberpunk': { start: '#f43f5e', end: '#06b6d4' },
  'gradient-lavender-indigo': { start: '#a5b4fc', end: '#4f46e5' },
  'gradient-monochrome': { start: '#334155', end: '#f8fafc' },
};

export default function QuantHabit({
  value = 0,
  target = 1,
  unit = '',
  onChange,
  gradient,
  habitId,
}: QuantHabitProps) {
  const [localVal, setLocalVal] = useState<string>(String(value));
  const colors = gradientMapColors[gradient] || { start: '#a3e635', end: '#0d9488' };
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e.target.value);
  };

  const handleBlur = () => {
    let parsed = parseFloat(localVal);
    if (isNaN(parsed) || parsed < 0) {
      parsed = 0;
    }
    setLocalVal(String(parsed));
    onChange(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  const adjust = (amount: number) => {
    const current = parseFloat(localVal) || 0;
    const next = Math.max(0, current + amount);
    setLocalVal(String(next));
    onChange(next);
  };

  const progress = target > 0 ? (parseFloat(localVal) || 0) / target : 0;
  const isTargetMet = progress >= 1;

  return (
    <div className="flex items-center gap-4">
      {/* Decrement Button */}
      <button
        onClick={() => adjust(-1)}
        className="w-8 h-8 rounded-lg bg-dark-805 bg-dark-800 text-gray-400 hover:text-white border border-white/[0.04] hover:border-white/[0.08] transition-colors flex items-center justify-center active:scale-95"
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* Progress Ring with Input Inside */}
      <div className="relative flex items-center justify-center">
        <ProgressRing
          id={habitId}
          progress={progress}
          size={80}
          strokeWidth={5}
          gradientStart={colors.start}
          gradientEnd={colors.end}
        />
        
        {/* Absolute Centered Direct Input */}
        <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in">
          <input
            ref={inputRef}
            type="number"
            value={localVal}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`w-14 bg-transparent text-center text-base font-bold text-white focus:outline-none focus:ring-0 ${
              isTargetMet ? 'text-transparent bg-clip-text' : ''
            }`}
            style={
              isTargetMet
                ? {
                    backgroundImage: `linear-gradient(135deg, ${colors.start}, ${colors.end})`,
                    WebkitBackgroundClip: 'text',
                  }
                : undefined
            }
          />
          <span className="text-[10px] text-dark-500 font-medium truncate max-w-[60px]" title={unit}>
            {unit || 'count'}
          </span>
        </div>
      </div>

      {/* Increment Button */}
      <button
        onClick={() => adjust(1)}
        className="w-8 h-8 rounded-lg bg-dark-800 text-gray-400 hover:text-white border border-white/[0.04] hover:border-white/[0.08] transition-colors flex items-center justify-center active:scale-95"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
