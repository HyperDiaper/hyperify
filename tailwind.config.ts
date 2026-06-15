import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/context/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#030303', // Pitch Black background
          900: '#0b0b0d', // Ultra-dark Charcoal cards
          800: '#15151a', // Dark Gray inputs / buttons
          700: '#26262f', // Borders and active dark selections
          600: '#3e3e4d',
          500: '#717185',
        },
        accent: {
          lime: '#a3e635',
          emerald: '#059669',
          gold: '#f59e0b',
          rose: '#f43f5e',
          cyan: '#00f2fe',
          blue: '#2563eb',
          orange: '#f97316',
          purple: '#7c3aed',
          pink: '#db2777',
          teal: '#0d9488',
          indigo: '#4f46e5',
          lavender: '#a5b4fc',
          mint: '#34d399',
        },
      },
      backgroundImage: {
        // App Custom Accent Gradients (10 options)
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'check-bounce': 'checkBounce 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        checkBounce: {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(var(--accent-glow-rgb, 163, 230, 53), 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
