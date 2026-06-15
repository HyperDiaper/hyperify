'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useHabitsContext } from '@/context/HabitContext';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import HabitCard from '@/components/habits/HabitCard';
import HabitForm from '@/components/habits/HabitForm';
import Modal from '@/components/ui/Modal';
import { Habit } from '@/types';
import { ListChecks, Plus, Flame } from 'lucide-react';

export default function HabitsListPage() {
  const { user, loading: authLoading } = useAuth();
  const { habits, loading: habitsLoading } = useHabitsContext();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | undefined>(undefined);

  // Redirect if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || (user && habitsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-primary text-black animate-pulse-glow">
            <ListChecks className="w-7 h-7 fill-current" />
          </div>
          <p className="text-dark-500 text-sm font-semibold">Loading habits list...</p>
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
          <div className="flex items-center justify-between mb-8 animate-slide-up">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2 select-none">
                <ListChecks className="w-6 h-6 text-accent-cyan" />
                Manage Habits
              </h1>
              <p className="text-sm text-dark-500 mt-1 font-medium">
                View detail heatmaps, edit daily target goals, or log progress.
              </p>
            </div>

            <button
              onClick={handleCreateHabit}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-primary text-black text-sm font-bold hover:-translate-y-0.5 transition-all duration-200 shadow-glow-primary shrink-0"
            >
              <Plus className="w-4.5 h-4.5" />
              Add Habit
            </button>
          </div>

          <div className="space-y-4 animate-slide-up" style={{ animationDelay: '100ms' } as React.CSSProperties}>
            {habits.length === 0 ? (
              <GlassCard className="p-12 text-center bg-dark-900/40">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-dark-800/40 flex items-center justify-center border border-white/[0.03]">
                    <ListChecks className="w-10 h-10 text-dark-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-300 mb-2">
                      No habits found
                    </h3>
                    <p className="text-sm text-dark-500 max-w-xs mx-auto">
                      Create your first habit to begin tracking your journey!
                    </p>
                  </div>
                  <button
                    onClick={handleCreateHabit}
                    className="mt-2 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-primary text-black font-bold hover:-translate-y-0.5 transition-all duration-200 shadow-glow-primary"
                  >
                    <Plus className="w-5 h-5" />
                    Create Habit
                  </button>
                </div>
              </GlassCard>
            ) : (
              <div className="flex flex-col gap-4">
                {habits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onEdit={() => handleEditHabit(habit)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomNav />

      {/* Habit Form Modal */}
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
