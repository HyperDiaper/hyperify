'use client';

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const gradientMap: Record<string, string> = {
  'gradient-volt-blue': 'linear-gradient(135deg, #a3e635, #2563eb)',
  'gradient-lime-emerald': 'linear-gradient(135deg, #a3e635, #059669)',
  'gradient-gold-rose': 'linear-gradient(135deg, #f59e0b, #ec4899)',
  'gradient-cyan-blue': 'linear-gradient(135deg, #00f2fe, #2563eb)',
  'gradient-sunset-orange': 'linear-gradient(135deg, #f97316, #e11d48)',
  'gradient-electric-purple': 'linear-gradient(135deg, #7c3aed, #db2777)',
  'gradient-aurora-teal': 'linear-gradient(135deg, #0d9488, #34d399)',
  'gradient-cyberpunk': 'linear-gradient(135deg, #f43f5e, #06b6d4)',
  'gradient-lavender-indigo': 'linear-gradient(135deg, #a5b4fc, #4f46e5)',
  'gradient-monochrome': 'linear-gradient(135deg, #334155, #f8fafc)',
};

export default function GlassCard({
  children,
  className = '',
  hover = false,
  gradient,
  onClick,
  style,
}: GlassCardProps) {
  const borderGradient = gradient ? gradientMap[gradient] || gradient : undefined;

  return (
    <div
      onClick={onClick}
      className={`
        ${hover ? 'glass-card-hover cursor-pointer' : 'glass-card'}
        ${gradient ? 'gradient-border' : ''}
        ${className}
      `}
      style={{
        ...style,
        ...(borderGradient ? { '--gradient-border': borderGradient } as React.CSSProperties : {}),
      }}
    >
      {children}
    </div>
  );
}
