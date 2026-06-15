'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useHabitsContext } from '@/context/HabitContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate } from '@/lib/utils';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import HabitCard from '@/components/habits/HabitCard';
import HabitForm from '@/components/habits/HabitForm';
import Modal from '@/components/ui/Modal';
import { Habit, Category } from '@/types';
import {
  Flame,
  Target,
  TrendingUp,
  Shield,
  Plus,
  Zap,
} from 'lucide-react';
import * as Icons from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { habits, streaks, categories, loading: habitsLoading } = useHabitsContext();
  const router = useRouter();

  const [todayCompletions, setTodayCompletions] = useState<Record<string, boolean>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | undefined>(undefined);
  
  // Category Filter state
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  const todayStr = useMemo(() => formatDate(new Date()), []);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Trigger creation form modal if query param is set (PWA Shortcut helper)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('addHabit=true')) {
      setIsFormOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);


  // Listen to today's completions
  useEffect(() => {
    if (!user || habits.length === 0) {
      setTodayCompletions({});
      return;
    }

    const unsubscribes = habits.map((habit) => {
      const docRef = doc(db, 'users', user.uid, 'habits', habit.id, 'completions', todayStr);
      return onSnapshot(docRef, (docSnap) => {
        setTodayCompletions((prev) => ({
          ...prev,
          [habit.id]: docSnap.exists() && !!docSnap.data()?.completed,
        }));
      }, (err) => {
        console.error(`Error listening to today's completion for habit ${habit.id}:`, err);
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [user, habits, todayStr]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = habits.length;
    const completedToday = Object.keys(todayCompletions).filter(
      (key) => todayCompletions[key] && habits.some((h) => h.id === key)
    ).length;

    let activeStreaks = 0;
    let totalCompletionRate = 0;
    let graceDaysAvailable = 0;

    habits.forEach((habit) => {
      const streak = streaks[habit.id];
      if (streak) {
        if (streak.currentStreak > 0) {
          activeStreaks += 1;
        }
        totalCompletionRate += streak.completionRate || 0;
        if (streak.freezeAvailable) {
          graceDaysAvailable += 1;
        }
      }
    });

    const averageCompletionRate = total > 0 ? totalCompletionRate / total : 0;
    const progressPercent = total > 0 ? Math.round((completedToday / total) * 100) : 0;

    return {
      total,
      completedToday,
      activeStreaks,
      averageCompletionRate: total > 0 ? `${Math.round(averageCompletionRate * 100)}%` : '—',
      graceDaysAvailable,
      progressPercent,
    };
  }, [habits, todayCompletions, streaks]);

  // Filter and group habits by category
  const filteredGroupedHabits = useMemo(() => {
    // 1. Filter habits
    const filtered = habits.filter(
      (h) => activeCategoryFilter === 'all' || h.category === activeCategoryFilter
    );

    // 2. Group habits by category id
    const groups: Record<string, Habit[]> = {};
    filtered.forEach((h) => {
      if (!groups[h.category]) {
        groups[h.category] = [];
      }
      groups[h.category].push(h);
    });

    return groups;
  }, [habits, activeCategoryFilter]);

  if (authLoading || (user && habitsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-primary text-black animate-pulse-glow">
            <Flame className="w-7 h-7 fill-current" />
          </div>
          <p className="text-dark-500 text-sm font-semibold">Loading Hyperify...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleEditHabit = (habit: Habit) => {
    setSelectedHabit(habit);
    setIsFormOpen(true);
  };

  const handleCreateHabit = () => {
    setSelectedHabit(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:ml-64">
        <Header />
        <main className="px-4 md:px-8 py-6 pb-24 md:pb-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
            <StatCard
              icon={<Target className="w-5 h-5" />}
              label="Today's Progress"
              value={`${stats.completedToday} / ${stats.total}`}
              colorClass="text-accent-lime"
            />
            <StatCard
              icon={<Flame className="w-5 h-5" />}
              label="Active Streaks"
              value={String(stats.activeStreaks)}
              colorClass="text-accent-orange"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Avg Completion Rate"
              value={stats.averageCompletionRate}
              colorClass="text-accent-emerald"
            />
            <StatCard
              icon={<Shield className="w-5 h-5" />}
              label="Habits with Freezes"
              value={String(stats.graceDaysAvailable)}
              colorClass="text-accent-purple"
            />
          </div>

          {/* Today's Progress Bar */}
          <GlassCard className="p-6 mb-8 animate-slide-up bg-dark-900/40" style={{ animationDelay: '100ms' } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">
                Today&apos;s Goal Progress
              </h3>
              <span className="text-xs text-dark-500 font-bold">{stats.progressPercent}%</span>
            </div>
            <div className="h-3 bg-dark-950 rounded-full overflow-hidden border border-white/[0.02]">
              <div
                className="h-full bg-gradient-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: `${stats.progressPercent}%` }}
              />
            </div>
          </GlassCard>

          {/* Category Filter Tabs */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin select-none animate-slide-up" style={{ animationDelay: '150ms' } as React.CSSProperties}>
              <button
                onClick={() => setActiveCategoryFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0
                  ${
                    activeCategoryFilter === 'all'
                      ? 'bg-gradient-primary text-black border-transparent shadow-glow-primary scale-[1.02]'
                      : 'bg-dark-900/40 text-dark-500 border-white/[0.03] hover:text-gray-300 hover:border-white/[0.08]'
                  }
                `}
              >
                All Habits
              </button>

              {categories.map((cat) => {
                const isSelected = activeCategoryFilter === cat.id;
                const Icon = (Icons as any)[cat.icon || 'Tag'] || Icons.Tag;
                
                // Color mapping for category filters
                const borderActiveClasses: Record<string, string> = {
                  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10',
                  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/30 shadow-violet-500/10',
                  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-cyan-500/10',
                  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-orange-500/10',
                  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-rose-500/10',
                  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-blue-500/10',
                  gold: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10',
                  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-purple-500/10',
                  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-indigo-500/10',
                  lavender: 'bg-indigo-300/10 text-indigo-300 border-indigo-300/30 shadow-indigo-300/10',
                  mint: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30 shadow-emerald-400/10',
                  pink: 'bg-pink-500/10 text-pink-400 border-pink-500/30 shadow-pink-500/10',
                  teal: 'bg-teal-500/10 text-teal-400 border-teal-500/30 shadow-teal-500/10',
                  fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30 shadow-fuchsia-500/10',
                };

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryFilter(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0
                      ${
                        isSelected
                          ? `${borderActiveClasses[cat.color] || borderActiveClasses.violet} shadow-lg scale-[1.02]`
                          : 'bg-dark-900/40 text-dark-500 border-white/[0.03] hover:text-gray-300 hover:border-white/[0.08]'
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Habits Section */}
          <div className="animate-slide-up animate-delay-200" style={{ animationDelay: '200ms' } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100">
                Today&apos;s Habits
              </h2>
              <button
                onClick={handleCreateHabit}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-primary text-black text-sm font-bold hover:-translate-y-0.5 transition-all duration-200 shadow-glow-primary"
              >
                <Plus className="w-4.5 h-4.5" />
                Add Habit
              </button>
            </div>

            {habits.length === 0 ? (
              /* Empty state */
              <GlassCard className="p-12 text-center bg-dark-900/40">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-dark-800/40 flex items-center justify-center border border-white/[0.03]">
                    <Zap className="w-10 h-10 text-dark-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-300 mb-2">
                      No habits yet
                    </h3>
                    <p className="text-sm text-dark-500 max-w-xs mx-auto">
                      Start building your routine by adding your first habit.
                      Track daily progress and watch your streaks grow.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateHabit}
                    className="mt-2 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-primary text-black font-bold hover:-translate-y-0.5 transition-all duration-200 shadow-glow-primary"
                  >
                    <Plus className="w-5 h-5" />
                    Create Your First Habit
                  </button>
                </div>
              </GlassCard>
            ) : Object.keys(filteredGroupedHabits).length === 0 ? (
              /* Empty state for filtered categories */
              <GlassCard className="p-12 text-center bg-dark-900/40">
                <p className="text-sm text-dark-500">No habits found in this category.</p>
              </GlassCard>
            ) : (
              /* Grouped habits list */
              <div className="flex flex-col gap-8">
                {Object.keys(filteredGroupedHabits).map((catId) => {
                  const cat = categories.find((c) => c.id === catId);
                  const Icon = (Icons as any)[cat?.icon || 'Tag'] || Icons.Tag;
                  
                  const textColors: Record<string, string> = {
                    emerald: 'text-emerald-400',
                    violet: 'text-violet-400',
                    cyan: 'text-cyan-400',
                    orange: 'text-orange-400',
                    rose: 'text-rose-400',
                    blue: 'text-blue-400',
                    gold: 'text-amber-400',
                    purple: 'text-purple-400',
                    indigo: 'text-indigo-400',
                    lavender: 'text-indigo-300',
                    mint: 'text-emerald-400',
                    pink: 'text-pink-400',
                    teal: 'text-teal-400',
                    fuchsia: 'text-fuchsia-400',
                  };

                  const textColor = textColors[cat?.color || 'violet'] || 'text-violet-400';

                  return (
                    <div key={catId} className="space-y-3">
                      {/* Category Header */}
                      <div className="flex items-center gap-2 px-1 select-none">
                        <Icon className={`w-4 h-4 ${textColor}`} />
                        <h3 className={`text-xs font-black uppercase tracking-wider ${textColor}`}>
                          {cat?.name || 'General'}
                        </h3>
                        <div className="flex-1 h-px bg-white/[0.03] ml-2" />
                      </div>

                      {/* Habits belonging to this category */}
                      <div className="flex flex-col gap-4">
                        {filteredGroupedHabits[catId].map((habit) => (
                          <HabitCard
                            key={habit.id}
                            habit={habit}
                            onEdit={() => handleEditHabit(habit)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomNav />

      {/* Habit Create/Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedHabit ? 'Edit Habit' : 'Create New Habit'}
      >
        <HabitForm habit={selectedHabit} onClose={() => setIsFormOpen(false)} />
      </Modal>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <GlassCard className="p-4 bg-dark-900/40">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-xl bg-dark-950 border border-white/[0.03] flex items-center justify-center ${colorClass}`}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-dark-500 mt-1 font-semibold">{label}</p>
    </GlassCard>
  );
}
