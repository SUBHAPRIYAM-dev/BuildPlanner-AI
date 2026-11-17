import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Compass,
  Sparkles
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/authStore';
import { GoogleIcon } from './GoogleIcon';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
  title,
  subtitle
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [isGoogleCustomOpen, setIsGoogleCustomOpen] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleCustomName, setGoogleCustomName] = useState('');

  // Sync mode when modal opens or initialMode changes
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLocalError(null);
      setIsGoogleCustomOpen(false);
    }
  }, [isOpen, initialMode]);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const { loginWithEmail, signupWithEmail, loginWithGoogle, isLoading, error, clearError } = useAuthStore();

  if (!isOpen) return null;

  const handleTabChange = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setLocalError(null);
    clearError();
    setIsGoogleCustomOpen(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }

      try {
        await signupWithEmail(name, email, password);
        onSuccess?.();
        onClose();
      } catch (err: any) {
        setLocalError(err.message || 'Registration failed.');
      }
    } else {
      try {
        await loginWithEmail(email, password);
        onSuccess?.();
        onClose();
      } catch (err: any) {
        setLocalError(err.message || 'Sign in failed.');
      }
    }
  };

  const handleQuickGoogleSignIn = async (gEmail: string, gName: string) => {
    setLocalError(null);
    clearError();
    try {
      await loginWithGoogle(gEmail, gName);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Google sign-in failed.');
    }
  };

  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleCustomEmail) {
      setLocalError('Please enter your Google or Gmail address.');
      return;
    }
    await handleQuickGoogleSignIn(googleCustomEmail, googleCustomName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-sky-950/40 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-3 shadow-inner">
            <Compass className="h-6 w-6 stroke-[2.2]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {title ? title : (mode === 'login' ? 'Welcome Back' : 'Create an Account')}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {subtitle ? subtitle : (
              mode === 'login'
                ? 'Log in to access and manage your architectural blueprints'
                : 'Sign up to generate and save parametric building designs'
            )}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-950 p-1 mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => handleTabChange('login')}
            className={`py-2 text-xs font-semibold rounded-md transition-all ${
              mode === 'login'
                ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('signup')}
            className={`py-2 text-xs font-semibold rounded-md transition-all ${
              mode === 'signup'
                ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Google Authentication Section */}
        <div className="space-y-3 mb-5">
          <button
            type="button"
            onClick={() => setIsGoogleCustomOpen(!isGoogleCustomOpen)}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800/80 hover:border-slate-600 transition-all text-sm font-medium text-slate-200 shadow-sm group"
          >
            <GoogleIcon className="h-5 w-5 flex-shrink-0" />
            <span>
              {mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
            </span>
          </button>

          {/* Expanded Google Account Options */}
          {isGoogleCustomOpen && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-sky-500/30 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Google Account Sign-In</span>
              </div>

              {/* Quick Pick: Demo Google Account */}
              <button
                type="button"
                onClick={() => handleQuickGoogleSignIn('subhapriyam.dev@gmail.com', 'Subhapriyam Dev')}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800 transition-all text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
                    S
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">Subhapriyam Dev</div>
                    <div className="text-[10px] text-slate-400 font-mono">subhapriyam.dev@gmail.com</div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Select
                </span>
              </button>

              {/* Or enter custom Google/Gmail */}
              <form onSubmit={handleCustomGoogleSubmit} className="space-y-2 pt-1 border-t border-slate-800/80">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Or enter your Gmail / Google Account:
                </label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <input
                  type="text"
                  placeholder="Your Full Name (optional)"
                  value={googleCustomName}
                  onChange={(e) => setGoogleCustomName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="w-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold py-1.5"
                  isLoading={isLoading}
                >
                  Continue as Google User
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-mono">
            <span className="bg-slate-900 px-3 text-slate-500">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {(localError || error) && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-950/40 border border-rose-800/60 p-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{localError || error}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="architect@buildplanner.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder={mode === 'signup' ? '•••••••• (min 6 chars)' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold shadow-lg shadow-sky-500/25 mt-2"
            isLoading={isLoading}
          >
            <span>{mode === 'login' ? 'Sign In to Account' : 'Create Free Account'}</span>
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </form>

        {/* Footer switch prompt */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => handleTabChange('signup')}
                className="text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2 ml-1"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className="text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2 ml-1"
              >
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
