'use client';

import { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, CheckCircle } from 'lucide-react';
import { useStopwatch } from '@/hooks/useStopwatch';
import ProgressRing from '../ui/ProgressRing';

interface DurationHabitProps {
  value: number; // in seconds
  target: number; // in seconds
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

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const hStr = h > 0 ? `${h}:` : '';
  const mStr = String(m).padStart(h > 0 ? 2 : 2, '0');
  const sStr = String(s).padStart(2, '0');

  return `${hStr}${mStr}:${sStr}`;
}

export default function DurationHabit({
  value = 0,
  target = 60,
  onChange,
  gradient,
  habitId,
}: DurationHabitProps) {
  const { elapsedTime, isRunning, start, pause, reset } = useStopwatch(habitId);
  const colors = gradientMapColors[gradient] || { start: '#a3e635', end: '#0d9488' };
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!isRunning && !hasInitialized) {
      reset(value);
      setHasInitialized(true);
    }
  }, [value, isRunning, reset, hasInitialized]);

  const handlePause = () => {
    pause();
    onChange(elapsedTime);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the timer for today?')) {
      reset(0);
      onChange(0);
    }
  };

  const handleCompleteInstantly = () => {
    reset(target);
    onChange(target);
  };

  const progress = target > 0 ? elapsedTime / target : 0;
  const isTargetMet = progress >= 1;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="w-8 h-8 rounded-lg bg-dark-800 text-gray-400 hover:text-white border border-white/[0.04] hover:border-white/[0.08] transition-colors flex items-center justify-center active:scale-95"
          title="Reset timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Progress Ring with Time Inside */}
        <div className="relative flex items-center justify-center">
          <ProgressRing
            id={habitId}
            progress={progress}
            size={96}
            strokeWidth={5}
            gradientStart={colors.start}
            gradientEnd={colors.end}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-lg font-bold text-white tracking-wider ${
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
            >
              {formatTime(elapsedTime)}
            </span>
            <span className="text-[9px] text-dark-500 font-semibold uppercase tracking-wider">
              {formatTime(target)} goal
            </span>
          </div>
        </div>

        {/* Play/Pause Toggle */}
        {isRunning ? (
          <button
            onClick={handlePause}
            className="w-10 h-10 rounded-xl bg-dark-800 text-amber-400 border border-white/[0.04] hover:border-white/[0.08] transition-all flex items-center justify-center active:scale-95 shadow-glow-primary/20 animate-pulse-glow"
          >
            <Pause className="w-5 h-5 fill-current" />
          </button>
        ) : (
          <button
            onClick={start}
            className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center active:scale-95 border
              ${
                isTargetMet
                  ? 'bg-dark-800 border-white/[0.04] text-gray-400 hover:text-white'
                  : 'bg-dark-800 border-white/[0.04] text-emerald-400 hover:text-emerald-300'
              }
            `}
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
        )}
      </div>

      {/* Quick completion button */}
      {!isTargetMet && !isRunning && (
        <button
          onClick={handleCompleteInstantly}
          className="text-xs flex items-center gap-1 text-emerald-500/80 hover:text-emerald-400 font-medium transition-colors"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Log Target Completed
        </button>
      )}
    </div>
  );
}
