'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  gradient?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

const gradientMap: Record<string, string> = {
  'primary': 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
  'volt-blue': 'linear-gradient(135deg, #a3e635, #2563eb)',
  'lime-emerald': 'linear-gradient(135deg, #a3e635, #059669)',
  'gold-rose': 'linear-gradient(135deg, #f59e0b, #ec4899)',
  'cyan-blue': 'linear-gradient(135deg, #00f2fe, #2563eb)',
  'sunset-orange': 'linear-gradient(135deg, #f97316, #e11d48)',
  'electric-purple': 'linear-gradient(135deg, #7c3aed, #db2777)',
  'aurora-teal': 'linear-gradient(135deg, #0d9488, #34d399)',
  'cyberpunk': 'linear-gradient(135deg, #f43f5e, #06b6d4)',
  'lavender-indigo': 'linear-gradient(135deg, #a5b4fc, #4f46e5)',
  'monochrome': 'linear-gradient(135deg, #334155, #f8fafc)',
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export default function GradientButton({
  children,
  variant = 'primary',
  gradient = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className = '',
  disabled,
  ...props
}: GradientButtonProps) {
  if (variant === 'secondary') {
    return (
      <button
        className={`btn-secondary ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}
          ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }

  const cleanGradKey = gradient.replace('gradient-', '');
  const backgroundStyle = gradientMap[cleanGradKey] || gradientMap['primary'];

  return (
    <button
      className={`relative overflow-hidden rounded-xl font-bold text-black transition-all duration-300
        ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
      style={{
        background: backgroundStyle,
        boxShadow: disabled || loading ? 'none' : undefined,
      }}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 6px 20px rgba(var(--accent-glow-rgb, 163, 230, 53), 0.35)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
      }}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
