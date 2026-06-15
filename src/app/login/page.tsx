'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import GradientButton from '@/components/ui/GradientButton';
import { Flame, Mail, Lock, User, Eye, EyeOff, Globe } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        await auth.signUpWithEmail(email, password, displayName);
      } else {
        await auth.signInWithEmail(email, password);
      }
      router.push('/');
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          setError('No account found with this email');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        case 'auth/email-already-in-use':
          setError('An account already exists with this email');
          break;
        case 'auth/weak-password':
          setError('Password must be at least 6 characters');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address');
          break;
        default:
          setError(firebaseError.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      await auth.signInWithGoogle();
      router.push('/');
    } catch (err: unknown) {
      const firebaseError = err as { message?: string };
      setError(firebaseError.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradient orbs reflecting Volt lime theme */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-lime/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-teal/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 shadow-glow-primary text-black">
            <Flame className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-wide gradient-text-primary">
            Hyperify
          </h1>
          <p className="text-dark-500 mt-2 text-sm font-semibold uppercase tracking-wider">
            Optimize your life. Group habits. Conquer streaks.
          </p>
        </div>

        {/* Auth card */}
        <div className="glass-card p-8 bg-dark-900/40">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-dark-950 p-1 mb-6 border border-white/[0.03]">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                ${mode === 'login'
                  ? 'bg-dark-800 text-white border border-white/[0.04]'
                  : 'text-dark-500 hover:text-gray-300'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                ${mode === 'signup'
                  ? 'bg-dark-800 text-white border border-white/[0.04]'
                  : 'text-dark-500 hover:text-gray-300'
                }`}
            >
              Sign Up
            </button>
          </div>

          {/* Google sign-in */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-dark-800/80 border border-white/[0.04] text-gray-200 font-bold hover:border-white/[0.1] hover:bg-dark-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            <Globe className="w-5 h-5 text-accent-lime" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/[0.04]" />
            <span className="text-xs text-dark-500 uppercase font-bold tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="relative animate-slide-down">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-dark-500" />
                <input
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-dark pl-11 text-sm font-medium"
                  id="signup-name"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-dark-500" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark pl-11 text-sm font-medium"
                required
                id="auth-email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-dark-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark pl-11 pr-11 text-sm font-medium"
                required
                minLength={6}
                id="auth-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold animate-slide-down">
                {error}
              </div>
            )}

            <GradientButton
              type="submit"
              fullWidth
              loading={loading}
              size="md"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </GradientButton>
          </form>
        </div>

        <p className="text-center text-[10px] text-dark-600 font-bold uppercase tracking-wider mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
