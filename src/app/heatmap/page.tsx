'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useHabitsContext } from '@/context/HabitContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Completion } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import Heatmap from '@/components/streaks/Heatmap';
import { CalendarDays, Flame, CheckCircle, Info } from 'lucide-react';

export default function GlobalHeatmapPage() {
  const { user, loading: authLoading } = useAuth();
  const { habits, loading: habitsLoading } = useHabitsContext();
  const router = useRouter();

  const [completionsByHabit, setCompletionsByHabit] = useState<Record<string, Completion[]>>({});
  const [loadingCompletions, setLoadingCompletions] = useState(true);

  // Redirect if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Subscribe to completions for all habits
  useEffect(() => {
    if (!user || habits.length === 0) {
      setCompletionsByHabit({});
      setLoadingCompletions(false);
      return;
    }

    setLoadingCompletions(true);
    const unsubscribes = habits.map((habit) => {
      const ref = collection(db, 'users', user.uid, 'habits', habit.id, 'completions');
      return onSnapshot(
        ref,
        (snap) => {
          const list: Completion[] = [];
          snap.forEach((doc) => {
            list.push(doc.data() as Completion);
          });
          setCompletionsByHabit((prev) => ({
            ...prev,
            [habit.id]: list,
          }));
          setLoadingCompletions(false);
        },
        (err) => {
          console.error(`Error loading completions for habit ${habit.id}:`, err);
        }
      );
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user, habits]);

  // Merge completions across all habits
  const globalCompletions = useMemo(() => {
    const dailyCounts: Record<string, number> = {};
    const dailyTimestamps: Record<string, any> = {};

    Object.keys(completionsByHabit).forEach((habitId) => {
      const list = completionsByHabit[habitId];
      const habitObj = habits.find((h) => h.id === habitId);
      
      list.forEach((c) => {
        let isCompleted = c.completed;
        if (habitObj) {
          if (habitObj.type === 'quantitative' && habitObj.target !== undefined) {
            isCompleted = (c.value || 0) >= habitObj.target;
          } else if (habitObj.type === 'duration' && habitObj.target !== undefined) {
            isCompleted = (c.duration || 0) >= habitObj.target;
          }
        }

        if (isCompleted) {
          dailyCounts[c.date] = (dailyCounts[c.date] || 0) + 1;
          dailyTimestamps[c.date] = c.timestamp;
        }
      });
    });

    return Object.keys(dailyCounts).map((date) => ({
      date,
      completed: true,
      value: dailyCounts[date],
      timestamp: dailyTimestamps[date],
    })) as Completion[];
  }, [completionsByHabit, habits]);

  if (authLoading || habitsLoading || (user && loadingCompletions)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-primary text-black animate-pulse-glow">
            <CalendarDays className="w-7 h-7 fill-current" />
          </div>
          <p className="text-dark-500 text-sm font-semibold">Aggregating heatmap data...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:ml-64">
        <Header />
        <main className="px-4 md:px-8 py-6 pb-24 md:pb-8">
          <h1 className="text-2xl font-black text-white mb-8 animate-slide-up">
            Global Activity Heatmap
          </h1>

          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '100ms' } as React.CSSProperties}>
            {/* Global Calendar Heatmap Card */}
            <GlassCard className="p-6 bg-dark-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2 select-none">
                  <CalendarDays className="w-5 h-5 text-accent-cyan" />
                  All Habits Activity
                </h2>
                <div className="flex items-center gap-2 text-xs bg-dark-800 border border-white/[0.04] p-2.5 rounded-xl text-dark-500 max-w-sm">
                  <Info className="w-4 h-4 text-accent-cyan shrink-0" />
                  <span>
                    This heatmap aggregates completions across all habits. Opacity scales based on the number of habits completed.
                  </span>
                </div>
              </div>

              {habits.length === 0 ? (
                <div className="text-center py-12 text-dark-500">
                  <CheckCircle className="w-8 h-8 text-dark-600 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">Create habits to start tracking activity.</p>
                </div>
              ) : (
                <Heatmap
                  completions={globalCompletions}
                  habitType="quantitative"
                  targetValue={1}
                  gradient="gradient-volt-blue" // Use Volt-Blue for global heatmap
                />
              )}
            </GlassCard>

            {/* Quick Summary of Streaks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard className="p-5 flex items-center gap-4 bg-dark-900/40">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <Flame className="w-6 h-6 fill-current animate-pulse-glow" />
                </div>
                <div>
                  <h3 className="text-sm text-dark-500 font-bold uppercase tracking-wider">
                    Total Active Habits
                  </h3>
                  <p className="text-2xl font-black text-white mt-1">
                    {habits.length} habits
                  </p>
                </div>
              </GlassCard>

              <GlassCard className="p-5 flex items-center gap-4 bg-dark-900/40">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm text-dark-500 font-bold uppercase tracking-wider">
                    Total Completions Logged
                  </h3>
                  <p className="text-2xl font-black text-white mt-1">
                    {globalCompletions.reduce((acc, curr) => acc + (curr.value || 0), 0)} completions
                  </p>
                </div>
              </GlassCard>
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
