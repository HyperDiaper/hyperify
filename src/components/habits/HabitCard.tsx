'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useHabitsContext } from '@/context/HabitContext';
import { useCompletions } from '@/hooks/useCompletions';
import { formatDate } from '@/lib/utils';
import { Habit } from '@/types';
import GlassCard from '../ui/GlassCard';
import CategoryBadge from './CategoryBadge';
import BooleanHabit from './BooleanHabit';
import QuantHabit from './QuantHabit';
import DurationHabit from './DurationHabit';
import { Flame, ChevronRight, Edit3 } from 'lucide-react';

interface HabitCardProps {
  habit: Habit;
  onEdit: () => void;
}

export default function HabitCard({ habit, onEdit }: HabitCardProps) {
  const { user } = useAuth();
  const { streaks } = useHabitsContext();
  const router = useRouter();

  // Fetch completions for this habit
  const { completionsMap, toggleCompletion } = useCompletions(
    user?.uid,
    habit.id,
    habit.type,
    habit.target
  );

  const todayStr = formatDate(new Date());
  const todayCompletion = completionsMap[todayStr];
  const isCompletedToday = !!todayCompletion?.completed;

  const streakData = streaks[habit.id] || {
    currentStreak: 0,
    longestStreak: 0,
    freezeAvailable: false,
  };

  const handleToggleCompletion = async (completed: boolean) => {
    await toggleCompletion(todayStr, completed);
  };

  const handleQuantChange = async (val: number) => {
    await toggleCompletion(todayStr, val > 0, val, undefined);
  };

  const handleDurationChange = async (elapsedSeconds: number) => {
    await toggleCompletion(todayStr, elapsedSeconds > 0, undefined, elapsedSeconds);
  };

  const streakClass = streakData.currentStreak > 0
    ? 'text-accent-orange animate-pulse-glow font-bold'
    : 'text-dark-500';

  return (
    <GlassCard
      gradient={habit.gradient}
      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-white/[0.08] bg-dark-900/40 hover:bg-dark-900/60 transition-all duration-300"
    >
      {/* Left Column: Info & Badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div
            onClick={() => router.push(`/habits/${habit.id}`)}
            className="cursor-pointer group flex items-center gap-1.5"
          >
            <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors truncate">
              {habit.name}
            </h3>
            <ChevronRight className="w-4.5 h-4.5 text-dark-500 group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
          </div>

          <button
            onClick={onEdit}
            className="p-1 rounded bg-dark-950 border border-white/[0.03] hover:border-white/[0.08] text-dark-500 hover:text-gray-300 transition-colors"
            title="Edit habit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {habit.description && (
          <p className="text-sm text-dark-500 mb-4 line-clamp-2">
            {habit.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <CategoryBadge categoryId={habit.category} />

          {/* Streak Indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            <Flame className={`w-4 h-4 ${streakData.currentStreak > 0 ? 'fill-current text-accent-orange' : 'text-dark-600'}`} />
            <span className={streakClass}>
              {streakData.currentStreak} day streak
            </span>
            {streakData.freezeAvailable && (
              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded-full font-semibold">
                Freeze Active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Logging Controller */}
      <div className="flex justify-start sm:justify-end items-center sm:min-w-[150px] shrink-0">
        {habit.type === 'boolean' && (
          <BooleanHabit
            completed={isCompletedToday}
            onToggle={handleToggleCompletion}
            gradient={habit.gradient}
          />
        )}

        {habit.type === 'quantitative' && (
          <QuantHabit
            value={todayCompletion?.value || 0}
            target={habit.target || 1}
            unit={habit.unit || ''}
            onChange={handleQuantChange}
            gradient={habit.gradient}
            habitId={habit.id}
          />
        )}

        {habit.type === 'duration' && (
          <DurationHabit
            value={todayCompletion?.duration || 0}
            target={habit.target || 60}
            onChange={handleDurationChange}
            gradient={habit.gradient}
            habitId={habit.id}
          />
        )}
      </div>
    </GlassCard>
  );
}
