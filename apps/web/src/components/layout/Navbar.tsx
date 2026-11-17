import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Plus, 
  LayoutDashboard, 
  Layers, 
  Info, 
  User, 
  LogOut, 
  ChevronDown, 
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { AuthModal } from '../../features/auth/AuthModal';
import { GoogleIcon } from '../../features/auth/GoogleIcon';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    setIsUserMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        {/* Top Professional Disclaimer Strip */}
        <div className="bg-sky-950/60 border-b border-sky-800/40 px-4 py-1 text-center text-xs text-sky-300 flex items-center justify-center gap-1.5 font-medium">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Preliminary AI-generated architectural designs. Professional verification and approval are required before construction.</span>
        </div>

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30 group-hover:bg-sky-400 transition-colors">
                <Compass className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  BuildPlanner <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">AI</span>
                </span>
                <p className="text-[10px] text-slate-400 tracking-wider uppercase font-mono">Parametric Architecture</p>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/dashboard"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                to="/wizard"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/wizard'
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Layers className="h-4 w-4" />
                Residential Wizard
              </Link>
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* New Blueprint Action */}
            <Link to="/wizard" className="hidden sm:inline-block">
              <Button size="sm" className="shadow-lg shadow-sky-500/20">
                <Plus className="h-4 w-4 mr-1.5" />
                New Building Plan
              </Button>
            </Link>

            {/* Unauthenticated User Controls */}
            {!user ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openAuth('login')}
                  className="text-slate-300 hover:text-white"
                >
                  Log In
                </Button>
                <Button
                  size="sm"
                  onClick={() => openAuth('signup')}
                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold shadow-md shadow-sky-500/25"
                >
                  Sign Up
                </Button>
              </div>
            ) : (
              /* Authenticated User Profile Menu */
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-full border border-slate-700 bg-slate-900 hover:border-slate-600 transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-slate-950 font-bold text-xs flex items-center justify-center shadow-sm">
                    {user.provider === 'google' ? (
                      <GoogleIcon className="h-4 w-4" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-200 max-w-[120px] truncate hidden sm:inline-block">
                    {user.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl shadow-slate-950/80 text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                    {/* User Info Header */}
                    <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                      <div className="font-semibold text-white truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{user.email}</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {user.provider === 'google' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <GoogleIcon className="h-3 w-3" />
                            Google Account
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Verified Email
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 uppercase font-mono px-1 py-0.5">
                          {user.role}
                        </span>
                      </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="space-y-0.5">
                      <Link
                        to="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                      >
                        <FolderOpen className="h-4 w-4 text-sky-400" />
                        <span>My Saved Plans</span>
                      </Link>
                      <Link
                        to="/wizard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                      >
                        <Plus className="h-4 w-4 text-emerald-400" />
                        <span>Create New Plan</span>
                      </Link>
                    </div>

                    {/* Logout Button */}
                    <div className="pt-1 mt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          navigate('/dashboard');
        }}
      />
    </>
  );
};
