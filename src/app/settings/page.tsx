'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useHabitsContext } from '@/context/HabitContext';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import GradientButton from '@/components/ui/GradientButton';
import { ACCENTS, applyAccent } from '@/components/layout/ClientAccentLoader';
import {
  LogOut,
  User,
  Tag,
  Shield,
  Settings,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import * as Icons from 'lucide-react';

const availableIcons = [
  'Heart',
  'Briefcase',
  'Brain',
  'Dumbbell',
  'BookOpen',
  'Gamepad',
  'Sparkles',
  'Trophy',
];

const categoryColors = [
  'emerald',
  'violet',
  'cyan',
  'orange',
  'rose',
  'blue',
  'gold',
  'purple',
  'indigo',
  'lavender',
  'mint',
  'pink',
  'teal',
  'fuchsia',
];

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { categories, addCategory, deleteCategory } = useHabitsContext();
  const router = useRouter();

  // Accent state
  const [currentAccent, setCurrentAccent] = useState('lime');

  // Category Form state
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('blue');
  const [catIcon, setCatIcon] = useState('Sparkles');
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load active accent on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hyperify-accent') || 'lime';
      setCurrentAccent(stored);
    }
  }, []);

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await signOut();
        router.push('/login');
      } catch (err) {
        console.error('Error signing out:', err);
      }
    }
  };

  const handleAccentChange = (key: string) => {
    applyAccent(key);
    setCurrentAccent(key);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCatError('Category name is required');
      return;
    }
    setCatLoading(true);
    setCatError('');
    try {
      await addCategory({
        name: catName.trim(),
        color: catColor,
        icon: catIcon,
      });
      setCatName('');
      setCatColor('blue');
      setCatIcon('Sparkles');
    } catch (err: any) {
      setCatError(err.message || 'Failed to create category');
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    // Prevent deleting if it's the last category
    if (categories.length <= 1) {
      alert('You must have at least one category!');
      return;
    }
    if (
      confirm(
        'Are you sure you want to delete this category? Any habits assigned to it will be automatically reassigned to another category.'
      )
    ) {
      try {
        await deleteCategory(id);
      } catch (err) {
        console.error('Error deleting category:', err);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-primary text-black animate-pulse-glow">
            <Settings className="w-7 h-7 fill-current" />
          </div>
          <p className="text-dark-500 text-sm font-semibold">Loading settings...</p>
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
        <main className="px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-4xl">
          <h1 className="text-2xl font-black text-white mb-8 animate-slide-up">
            Settings
          </h1>

          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '100ms' } as React.CSSProperties}>
            {/* Account Profile Card */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-accent-cyan" />
                Account Profile
              </h2>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User profile'}
                    className="w-20 h-20 rounded-2xl border border-white/[0.06] object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-dark-800 border border-white/[0.04] flex items-center justify-center text-accent-lime text-2xl font-bold">
                    {user.displayName ? user.displayName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                )}

                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-bold text-white">
                    {user.displayName || 'Hyperify User'}
                  </h3>
                  <p className="text-sm text-dark-500 mt-1">{user.email}</p>
                  <p className="text-[10px] text-dark-600 font-bold uppercase tracking-wider mt-3">
                    Local SQLite Database Active
                  </p>
                </div>

                <div className="w-full sm:w-auto">
                  <button
                    onClick={handleSignOut}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-semibold transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </GlassCard>

            {/* Custom App Accent Selector */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-200 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent-lime" />
                Personalized App Accent
              </h2>
              <p className="text-xs text-dark-500 mb-6">
                Select a primary color gradient to customize theme borders, indicators, and buttons across Hyperify.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {Object.keys(ACCENTS).map((key) => {
                  const item = ACCENTS[key];
                  const isSelected = currentAccent === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleAccentChange(key)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all active:scale-95
                        ${
                          isSelected
                            ? 'bg-dark-800 text-white border-white/[0.12] ring-1 ring-white/[0.04]'
                            : 'bg-dark-900/40 text-dark-500 border-white/[0.03] hover:border-white/[0.08] hover:text-gray-300'
                        }
                      `}
                    >
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${item.start}, ${item.end})`,
                        }}
                      />
                      <span className="text-xs font-semibold">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </GlassCard>

            {/* Category Manager CRUD */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
                <Tag className="w-5 h-5 text-accent-cyan" />
                Category Manager
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-dark-500 mb-2">
                    Active Categories ({categories.length})
                  </h3>

                  {categories.map((cat) => {
                    const Icon = (Icons as any)[cat.icon || 'Tag'] || Icons.Tag;
                    
                    const colorPills: Record<string, string> = {
                      emerald: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/[0.02]',
                      violet: 'border-violet-500/20 text-violet-400 bg-violet-500/[0.02]',
                      cyan: 'border-cyan-500/20 text-cyan-400 bg-cyan-500/[0.02]',
                      orange: 'border-orange-500/20 text-orange-400 bg-orange-500/[0.02]',
                      rose: 'border-rose-500/20 text-rose-400 bg-rose-500/[0.02]',
                      blue: 'border-blue-500/20 text-blue-400 bg-blue-500/[0.02]',
                      gold: 'border-amber-500/20 text-amber-400 bg-amber-500/[0.02]',
                      purple: 'border-purple-500/20 text-purple-400 bg-purple-500/[0.02]',
                      indigo: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/[0.02]',
                      lavender: 'border-indigo-300/20 text-indigo-300 bg-indigo-300/[0.02]',
                      mint: 'border-emerald-400/20 text-emerald-400 bg-emerald-400/[0.02]',
                      pink: 'border-pink-500/20 text-pink-400 bg-pink-500/[0.02]',
                      teal: 'border-teal-500/20 text-teal-400 bg-teal-500/[0.02]',
                      fuchsia: 'border-fuchsia-500/20 text-fuchsia-400 bg-fuchsia-500/[0.02]',
                    };

                    return (
                      <div
                        key={cat.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                          colorPills[cat.color] || colorPills.violet
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-dark-950 flex items-center justify-center shrink-0 border border-white/[0.03]">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">{cat.name}</h4>
                            <span className="text-[9px] text-dark-500 uppercase tracking-wider font-semibold">
                              {cat.id.startsWith('mock-cat-') || cat.id.startsWith('cat-') ? 'Custom' : 'System default'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 rounded-lg bg-dark-900/60 hover:bg-red-500/10 text-dark-500 hover:text-red-400 border border-white/[0.03] hover:border-red-500/20 transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add Category Form */}
                <form onSubmit={handleCreateCategory} className="space-y-4 border-t lg:border-t-0 lg:border-l border-white/[0.04] pt-6 lg:pt-0 lg:pl-8">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-dark-500">
                    Create Custom Category
                  </h3>

                  {catError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                      {catError}
                    </div>
                  )}

                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-dark-500 uppercase">Category Name</label>
                    <input
                      type="text"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="e.g. Coding, Reading, Social"
                      className="input-dark py-2 text-sm"
                      required
                    />
                  </div>

                  {/* Icons picker */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-dark-500 uppercase">Select Icon</label>
                    <div className="grid grid-cols-4 gap-2">
                      {availableIcons.map((ic) => {
                        const Icon = (Icons as any)[ic];
                        const isSelected = catIcon === ic;
                        return (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setCatIcon(ic)}
                            className={`py-2 rounded-lg border flex items-center justify-center transition-all
                              ${
                                isSelected
                                  ? 'bg-dark-800 text-white border-white/[0.12]'
                                  : 'bg-dark-900/20 text-dark-500 border-white/[0.03] hover:border-white/[0.08]'
                              }
                            `}
                          >
                            <Icon className="w-4.5 h-4.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Colors picker */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-dark-500 uppercase">Select Color Theme</label>
                    <div className="grid grid-cols-7 gap-1.5 p-1.5 bg-dark-900/40 border border-white/[0.03] rounded-lg">
                      {categoryColors.map((col) => {
                        const isSelected = catColor === col;
                        
                        // BG classes mapping
                        const dotBgs: Record<string, string> = {
                          emerald: 'bg-emerald-500',
                          violet: 'bg-violet-500',
                          cyan: 'bg-cyan-500',
                          orange: 'bg-orange-500',
                          rose: 'bg-rose-500',
                          blue: 'bg-blue-500',
                          gold: 'bg-amber-500',
                          purple: 'bg-purple-500',
                          indigo: 'bg-indigo-500',
                          lavender: 'bg-indigo-300',
                          mint: 'bg-emerald-400',
                          pink: 'bg-pink-500',
                          teal: 'bg-teal-500',
                          fuchsia: 'bg-fuchsia-500',
                        };

                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setCatColor(col)}
                            className={`w-full aspect-square rounded-full transition-all ${
                              dotBgs[col] || 'bg-violet-500'
                            }
                              ${
                                isSelected
                                  ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-950 scale-105'
                                  : 'opacity-70 hover:opacity-100'
                              }
                            `}
                            title={col}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <GradientButton type="submit" loading={catLoading} size="sm" fullWidth>
                    <Plus className="w-4 h-4 inline mr-1" />
                    Create Category
                  </GradientButton>
                </form>
              </div>
            </GlassCard>

            {/* App Preferences */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent-cyan" />
                System Details
              </h2>
              
              <div className="space-y-4 text-sm text-dark-500">
                <div className="flex justify-between py-2 border-b border-white/[0.03]">
                  <span>App Name</span>
                  <span className="text-gray-300 font-bold">Hyperify PWA</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.03]">
                  <span>Theme Mode</span>
                  <span className="text-gray-300 font-bold">True Pitch-Black Dark Mode</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.03]">
                  <span>Offline Sync</span>
                  <span className="text-accent-lime font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent-lime animate-ping" />
                    Firestore Offline Enabled
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span>PWA Target Compatibility</span>
                  <span className="text-gray-300 font-bold">Android / Chrome standard</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
