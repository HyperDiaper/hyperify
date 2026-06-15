'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import GlassCard from './GlassCard';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg animate-scale-in z-10">
        <GlassCard className="p-6 border border-white/[0.08] shadow-2xl bg-dark-900/90 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
            <h2 className="text-xl font-bold bg-gradient-violet-cyan bg-clip-text text-transparent">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-dark-800 text-gray-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Children */}
          {children}
        </GlassCard>
      </div>
    </div>
  );
}
