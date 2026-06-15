'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useHabitsContext } from '@/context/HabitContext';
import { useCompletions } from '@/hooks/useCompletions';
import { formatDate } from '@/lib/utils';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import Heatmap from '@/components/streaks/Heatmap';
import Modal from '@/components/ui/Modal';
import HabitForm from '@/components/habits/HabitForm';
import CategoryBadge from '@/components/habits/CategoryBadge';
import {
  ArrowLeft,
  Flame,
  TrendingUp,
  ShieldAlert,
  Calendar,
  Settings,
  History,
  CheckCircle,
} from 'lucide-react';

const gradientMapColors: Record<string, string> = {
  'gradient-volt-blue': 'text-accent-lime bg-gradient-volt-blue',
  'gradient-lime-emerald': 'text-accent-lime bg-gradient-lime-emerald',
  'gradient-gold-rose': 'text-accent-gold bg-gradient-gold-rose',
  'gradient-cyan-blue': 'text-accent-cyan bg-gradient-cyan-blue',
  'gradient-sunset-orange': 'text-accent-orange bg-gradient-sunset-orange',
  'gradient-electric-purple': 'text-accent-purple bg-gradient-electric-purple',
  'gradient-aurora-teal': 'text-accent-teal bg-gradient-aurora-teal',
  'gradient-cyberpunk': 'text-accent-rose bg-gradient-cyberpunk',
  'gradient-lavender-indigo': 'text-accent-lavender bg-gradient-lavender-indigo',
  'gradient-monochrome': 'text-gray-300 bg-gradient-monochrome',
};

export default function HabitDetailPage() {
  const { id } = useParams() as { id: string };
  const { user, loading: authLoading } = useAuth();
  const { habits, streaks, loading: habitsLoading } = useHabitsContext();
  const router = useRouter();

  const [isEditOpen, setIsEditOpen] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Find habit details from context
  const habit = useMemo(() => {
    return habits.find((h) => h.id === id);
  }, [habits, id]);

  // Fetch completions for this habit
  const { completions, loading: completionsLoading } = useCompletions(
    user?.uid,
    id,
    habit?.type,
    habit?.target
  );

  const streakData = useMemo(() => {
    return streaks[id] || {
      currentStreak: 0,
      longestStreak: 0,
      graceDaysEarned: 0,
      graceDaysUsed: 0,
      freezeAvailable: false,
      completionRate: 0,
    };
  }, [streaks, id]);

  const recentCompletionsList = useMemo(() => {
    return [...completions]
      .filter((c) => c.completed)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [completions]);

  if (authLoading || habitsLoading || completionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-primary text-black animate-pulse-glow">
            <Flame className="w-7 h-7 fill-current" />
          </div>
          <p className="text-dark-500 text-sm font-semibold">Loading details...</p>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if habit is deleted or not found
  if (!habit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 bg-dark-900 rounded-2xl max-w-sm border border-white/[0.04]">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-200 mb-2">Habit not found</h3>
          <p className="text-sm text-dark-500 mb-6 font-semibold">
            The habit you are looking for does not exist or has been deleted.
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn-gradient px-6 py-2.5 rounded-xl font-bold"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const gradClass = gradientMapColors[habit.gradient] || 'bg-gradient-volt-blue';

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:ml-64">
        <Header />
        <main className="px-4 md:px-8 py-6 pb-24 md:pb-8">
          {/* Back Navigation & Edit Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-sm font-bold text-dark-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>

            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-white/[0.04] hover:border-white/[0.1] transition-colors text-xs font-bold"
            >
              <Settings className="w-3.5 h-3.5" />
              Manage Habit
            </button>
          </div>

          {/* Habit Details Hero */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
                  {habit.name}
                </h1>
                {habit.description && (
                  <p className="text-dark-500 text-sm mt-1 max-w-2xl font-medium">
                    {habit.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2 self-start sm:self-center">
                <CategoryBadge categoryId={habit.category} />
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border border-white/[0.04] bg-dark-800/50 text-gray-300">
                  {habit.type === 'boolean' && 'Yes/No'}
                  {habit.type === 'quantitative' && 'Counter'}
                  {habit.type === 'duration' && 'Timer'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Current Streak */}
            <GlassCard className="p-4 bg-dark-900/40">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center">
                  <Flame className="w-4.5 h-4.5 fill-current" />
                </div>
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">
                  Current Streak
                </span>
              </div>
              <p className="text-3xl font-black text-white">{streakData.currentStreak} days</p>
            </GlassCard>

            {/* Longest Streak */}
            <GlassCard className="p-4 bg-dark-900/40">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">
                  Longest Streak
                </span>
              </div>
              <p className="text-3xl font-black text-white">{streakData.longestStreak} days</p>
            </GlassCard>

            {/* Completion Rate */}
            <GlassCard className="p-4 bg-dark-900/40">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">
                  Completion Rate
                </span>
              </div>
              <p className="text-3xl font-black text-white">
                {Math.round((streakData.completionRate || 0) * 100)}%
              </p>
            </GlassCard>

            {/* Grace Days */}
            <GlassCard className="p-4 bg-dark-900/40">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">
                  Streak Freezes
                </span>
              </div>
              <p className="text-3xl font-black text-white">
                {streakData.graceDaysEarned - streakData.graceDaysUsed}
              </p>
              <p className="text-[10px] text-dark-500 mt-1 font-semibold">
                Earned: {streakData.graceDaysEarned} | Used: {streakData.graceDaysUsed}
              </p>
            </GlassCard>
          </div>

          {/* Grid Layout for Heatmap and Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Heatmap */}
            <div className="lg:col-span-2 space-y-6">
              <GlassCard className="p-6 bg-dark-900/40">
                <h2 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2 select-none">
                  <Calendar className="w-5 h-5 text-accent-cyan" />
                  Streak Heatmap Calendar
                </h2>
                <Heatmap
                  completions={completions}
                  habitType={habit.type}
                  targetValue={habit.target}
                  gradient={habit.gradient}
                />
              </GlassCard>
            </div>

            {/* History Log */}
            <div className="space-y-6">
              <GlassCard className="p-6 bg-dark-900/40">
                <h2 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2 select-none">
                  <History className="w-5 h-5 text-accent-cyan" />
                  Completion History
                </h2>

                {recentCompletionsList.length === 0 ? (
                  <div className="text-center py-8 text-dark-500">
                    <CheckCircle className="w-8 h-8 text-dark-600 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No completions logged yet.</p>
                  </div>
                ) : (
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {recentCompletionsList.map((comp, compIdx) => (
                        <li key={comp.date}>
                          <div className="relative pb-8 animate-fade-in">
                            {compIdx !== recentCompletionsList.length - 1 ? (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-dark-800"
                                aria-hidden="true"
                              />
                            ) : null}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className={`h-8 w-8 rounded-lg flex items-center justify-center ring-4 ring-dark-950 ${gradClass} text-black font-bold`}>
                                  <CheckCircle className="w-4 h-4 fill-current" />
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-200 font-bold">{comp.date}</p>
                                  <p className="text-xs text-dark-500 font-semibold">
                                    {habit.type === 'quantitative' && `Count: ${comp.value} ${habit.unit}`}
                                    {habit.type === 'duration' && `Time: ${Math.round((comp.duration || 0) / 60)} mins`}
                                    {habit.type === 'boolean' && 'Completed'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Habit">
        <HabitForm habit={habit} onClose={() => setIsEditOpen(false)} />
      </Modal>
    </div>
  );
}
