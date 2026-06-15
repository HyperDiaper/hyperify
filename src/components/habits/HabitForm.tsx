'use client';

import { useState, useEffect } from 'react';
import { useHabitsContext } from '@/context/HabitContext';
import { Habit, HabitType, GradientKey } from '@/types';
import GradientButton from '../ui/GradientButton';
import * as Icons from 'lucide-react';

interface HabitFormProps {
  habit?: Habit;
  onClose: () => void;
}

const gradients: { key: GradientKey; style: string }[] = [
  { key: 'gradient-volt-blue', style: 'bg-gradient-volt-blue' },
  { key: 'gradient-lime-emerald', style: 'bg-gradient-lime-emerald' },
  { key: 'gradient-gold-rose', style: 'bg-gradient-gold-rose' },
  { key: 'gradient-cyan-blue', style: 'bg-gradient-cyan-blue' },
  { key: 'gradient-sunset-orange', style: 'bg-gradient-sunset-orange' },
  { key: 'gradient-electric-purple', style: 'bg-gradient-electric-purple' },
  { key: 'gradient-aurora-teal', style: 'bg-gradient-aurora-teal' },
  { key: 'gradient-cyberpunk', style: 'bg-gradient-cyberpunk' },
  { key: 'gradient-lavender-indigo', style: 'bg-gradient-lavender-indigo' },
  { key: 'gradient-monochrome', style: 'bg-gradient-monochrome' },
];

export default function HabitForm({ habit, onClose }: HabitFormProps) {
  const { addHabit, updateHabit, deleteHabit, categories, addCategory } = useHabitsContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<HabitType>('boolean');
  
  const [quantTarget, setQuantTarget] = useState('1');
  const [quantUnit, setQuantUnit] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('15');

  const [selectedGradient, setSelectedGradient] = useState<GradientKey>('gradient-volt-blue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Inline Category Creator state
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('violet');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatLoading, setNewCatLoading] = useState(false);

  // Pre-fill form if editing
  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setDescription(habit.description || '');
      setCategory(habit.category || '');
      setType(habit.type);
      setSelectedGradient(habit.gradient);
      
      if (habit.type === 'quantitative') {
        setQuantTarget(String(habit.target || 1));
        setQuantUnit(habit.unit || '');
      } else if (habit.type === 'duration') {
        setDurationMinutes(String(Math.round((habit.target || 0) / 60)));
      }
    }
  }, [habit]);

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setNewCatLoading(true);
    try {
      const newId = await addCategory({
        name: newCatName.trim(),
        color: newCatColor,
        icon: newCatIcon,
      });
      setCategory(newId);
      setNewCatName('');
      setShowNewCat(false);
    } catch (err: any) {
      console.error('Failed to create category:', err);
      setError(err.message || 'Failed to create category');
    } finally {
      setNewCatLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Habit name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let target: number | undefined;
      let unit: string | undefined;

      if (type === 'quantitative') {
        target = parseFloat(quantTarget) || 1;
        unit = quantUnit.trim() || 'count';
      } else if (type === 'duration') {
        target = (parseFloat(durationMinutes) || 1) * 60;
        unit = 'mins';
      }

      const habitData = {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || '', // Empty string represents Uncategorized (saved as null in DB)
        type,
        target,
        unit,
        gradient: selectedGradient,
      };

      if (habit) {
        await updateHabit(habit.id, habitData);
      } else {
        await addHabit(habitData);
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving habit:', err);
      setError(err.message || 'Failed to save habit');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!habit) return;
    if (confirm('Are you sure you want to delete this habit and all its progress? This action cannot be undone.')) {
      setLoading(true);
      try {
        await deleteHabit(habit.id);
        onClose();
      } catch (err: any) {
        console.error('Error deleting habit:', err);
        setError(err.message || 'Failed to delete habit');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-dark-500">
          Habit Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Read Books, Drink Water, Meditation"
          className="input-dark text-base"
          required
          disabled={loading}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-dark-500">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Why are you building this habit? What's your trigger?"
          className="input-dark min-h-[80px] resize-none py-2 text-sm"
          disabled={loading}
        />
      </div>

      {/* Category selector */}
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold uppercase tracking-wider text-dark-500">
            Category (Optional)
          </label>
          <button
            type="button"
            onClick={() => setShowNewCat(!showNewCat)}
            className="text-[10px] font-bold text-accent-lime hover:text-accent-lime/80 transition-colors uppercase tracking-wider flex items-center gap-1"
          >
            <Icons.Plus className="w-3 h-3" />
            New Category
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Uncategorized button */}
          <button
            type="button"
            onClick={() => setCategory('')}
            disabled={loading}
            className={`py-2 px-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold
              ${
                category === ''
                  ? 'bg-dark-800 text-white border-white/[0.12] ring-1 ring-white/[0.04]'
                  : 'bg-dark-900/40 text-dark-500 border-white/[0.03] hover:border-white/[0.08] hover:text-gray-300'
              }
            `}
          >
            <Icons.Tag className="w-4.5 h-4.5 shrink-0 text-dark-500" />
            <span className="truncate w-full text-center">None</span>
          </button>

          {/* User Categories */}
          {categories.map((cat) => {
            const isSelected = category === cat.id;
            const Icon = (Icons as any)[cat.icon || 'Tag'] || Icons.Tag;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                disabled={loading}
                className={`py-2 px-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold
                  ${
                    isSelected
                      ? 'bg-dark-800 text-white border-white/[0.12] ring-1 ring-white/[0.04]'
                      : 'bg-dark-900/40 text-dark-500 border-white/[0.03] hover:border-white/[0.08] hover:text-gray-300'
                  }
                `}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="truncate w-full text-center">{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Inline Category Creator Sub-Form */}
        {showNewCat && (
          <div className="p-4 rounded-2xl bg-dark-950 border border-white/[0.04] space-y-4 animate-slide-down mt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-dark-500">Category Name</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Study, Work, Cooking"
                className="input-dark text-xs py-2 px-3"
                disabled={newCatLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-dark-500">Color</label>
                <select
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="input-dark text-xs py-2 px-3 h-[38px]"
                  disabled={newCatLoading}
                >
                  <option value="violet">Violet</option>
                  <option value="cyan">Cyan</option>
                  <option value="emerald">Emerald</option>
                  <option value="orange">Orange</option>
                  <option value="rose">Rose</option>
                  <option value="pink">Pink</option>
                  <option value="blue">Blue</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-dark-500">Icon</label>
                <select
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="input-dark text-xs py-2 px-3 h-[38px]"
                  disabled={newCatLoading}
                >
                  <option value="Tag">Tag</option>
                  <option value="Briefcase">Briefcase</option>
                  <option value="Heart">Heart</option>
                  <option value="Brain">Brain</option>
                  <option value="Dumbbell">Dumbbell</option>
                  <option value="BookOpen">BookOpen</option>
                  <option value="Coffee">Coffee</option>
                  <option value="Smile">Smile</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowNewCat(false)}
                disabled={newCatLoading}
                className="px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs font-semibold text-dark-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={newCatLoading || !newCatName.trim()}
                className="px-3 py-1.5 rounded-lg bg-accent-lime hover:bg-accent-lime/80 text-black text-xs font-semibold"
              >
                {newCatLoading ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Habit Type */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-dark-500">
          Tracking Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setType('boolean')}
            disabled={loading || !!habit}
            className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold
              ${
                type === 'boolean'
                  ? 'bg-dark-800 text-white border-white/[0.12] ring-1 ring-white/[0.04]'
                  : 'bg-dark-900/40 text-dark-500 border-white/[0.03] hover:border-white/[0.08] hover:text-gray-300'
              }
              ${!!habit ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Icons.CheckSquare className="w-4.5 h-4.5" />
            Yes / No
          </button>

          <button
            type="button"
            onClick={() => setType('quantitative')}
            disabled={loading || !!habit}
            className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold
              ${
                type === 'quantitative'
                  ? 'bg-dark-800 text-white border-white/[0.12] ring-1 ring-white/[0.04]'
                  : 'bg-dark-900/40 text-dark-500 border-white/[0.03] hover:border-white/[0.08] hover:text-gray-300'
              }
              ${!!habit ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Icons.Hash className="w-4.5 h-4.5" />
            Counter
          </button>

          <button
            type="button"
            onClick={() => setType('duration')}
            disabled={loading || !!habit}
            className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold
              ${
                type === 'duration'
                  ? 'bg-dark-800 text-white border-white/[0.12] ring-1 ring-white/[0.04]'
                  : 'bg-dark-900/40 text-dark-500 border-white/[0.03] hover:border-white/[0.08] hover:text-gray-300'
              }
              ${!!habit ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Icons.Clock className="w-4.5 h-4.5" />
            Timer
          </button>
        </div>
      </div>

      {/* Target Config */}
      {type === 'quantitative' && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-dark-500">
              Daily Goal Target
            </label>
            <input
              type="number"
              value={quantTarget}
              onChange={(e) => setQuantTarget(e.target.value)}
              placeholder="e.g. 8, 10000"
              className="input-dark"
              required
              min="0.01"
              step="any"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-dark-500">
              Unit of Measure
            </label>
            <input
              type="text"
              value={quantUnit}
              onChange={(e) => setQuantUnit(e.target.value)}
              placeholder="e.g. glasses, steps, pages"
              className="input-dark"
              required
              disabled={loading}
            />
          </div>
        </div>
      )}

      {type === 'duration' && (
        <div className="space-y-2 animate-fade-in">
          <label className="text-xs font-bold uppercase tracking-wider text-dark-500">
            Daily Goal Target (Minutes)
          </label>
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="e.g. 15, 30, 60"
            className="input-dark"
            required
            min="1"
            disabled={loading}
          />
        </div>
      )}

      {/* Gradient Color Picker */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-dark-500">
          Accent Gradient
        </label>
        <div className="grid grid-cols-5 gap-2 p-2 bg-dark-900/40 border border-white/[0.03] rounded-xl">
          {gradients.map((grad) => {
            const isSelected = selectedGradient === grad.key;
            return (
              <button
                key={grad.key}
                type="button"
                onClick={() => setSelectedGradient(grad.key)}
                disabled={loading}
                className={`w-full aspect-square rounded-lg transition-transform active:scale-95 ${grad.style}
                  ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-950 scale-105 z-10' : 'opacity-80 hover:opacity-100'}`}
                title={grad.key.replace('gradient-', '').replace('-', ' ')}
              />
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-white/[0.04]">
        {habit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold transition-colors flex items-center justify-center"
            title="Delete habit"
          >
            <Icons.Trash2 className="w-5 h-5" />
          </button>
        )}
        <GradientButton
          type="submit"
          loading={loading}
          gradient={selectedGradient.replace('gradient-', '')}
          fullWidth
        >
          {habit ? 'Save Changes' : 'Create Habit'}
        </GradientButton>
      </div>
    </form>
  );
}
