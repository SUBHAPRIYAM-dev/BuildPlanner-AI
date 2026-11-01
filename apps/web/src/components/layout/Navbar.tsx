import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Plus, LayoutDashboard, Layers, FileText, Info } from 'lucide-react';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const location = useLocation();

  return (
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

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <Link to="/wizard">
            <Button size="sm" className="shadow-lg shadow-sky-500/20">
              <Plus className="h-4 w-4 mr-1.5" />
              New Building Plan
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
