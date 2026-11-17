import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Layers, 
  Box, 
  Sliders, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2,
  LayoutDashboard,
  Lock,
  UserCheck
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { AuthModal } from '../auth/AuthModal';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const handleStartDesigning = () => {
    if (!user) {
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
    } else {
      navigate('/wizard');
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Background Architectural Grid Pattern */}
      <div className="absolute inset-0 blueprint-grid pointer-events-none opacity-40" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Top Feature Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-950/80 border border-sky-800/60 text-sky-400 text-xs font-medium mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Real Parametric Architecture — Millimeter Accurate Blueprint Synthesizer</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Describe your property. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
            Build your plan.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          From exact plot dimensions and setback rules to a deterministic, editable 2D architectural blueprint, interactive 3D model, and municipal drawing package.
        </p>

        {/* Unified Primary Action: Click "Start Designing" -> Asks for Login if not signed in */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={handleStartDesigning}
            className="w-full sm:w-auto shadow-2xl shadow-sky-500/30 px-9 py-4 text-base font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center justify-center gap-2.5 group cursor-pointer"
          >
            <span>Start Designing</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          {user && (
            <Link to="/dashboard">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-sky-500/40 bg-slate-900/80 hover:bg-slate-800 text-sky-300 px-6 py-4 text-sm font-semibold flex items-center gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>My Saved Plans</span>
              </Button>
            </Link>
          )}
        </div>

        {/* User Account Status Indicator */}
        <div className="mt-4 flex items-center justify-center text-xs">
          {user ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-800/40 px-3 py-1 rounded-full">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Signed in as <strong>{user.name}</strong> ({user.email})</span>
            </span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-sky-400" />
              <span>Click "Start Designing" to sign in with Google or Email and save your blueprints</span>
            </span>
          )}
        </div>

        {/* Specs pill */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Building Code & NBC Norms</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Google & Email Account Sync</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Millimeter Accuracy</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Vector PDF Package</span>
        </div>
      </section>

      {/* Account Cloud Storage Feature Highlight */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-2xl border border-sky-900/40 bg-gradient-to-r from-slate-900 via-sky-950/20 to-slate-900 p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center flex-shrink-0">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <span>User Accounts & Cloud Blueprint Storage</span>
                  <Badge variant="info">Parametric Security</Badge>
                </h3>
                <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Sign in with your Google account or email address. Every floor plan, 3D model, and municipal drawing package you generate is automatically saved and isolated to your personal account.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0">
              <Button
                onClick={handleStartDesigning}
                className="w-full md:w-auto bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-6 py-2.5"
              >
                <span>{user ? 'Open Blueprint Wizard' : 'Start Designing'}</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-xs font-mono font-semibold tracking-wider text-sky-400 uppercase">Core Architectural Pipeline</h2>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">How BuildPlanner AI Generates Real Buildings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-slate-900/60 border-slate-800 hover:border-sky-500/40 transition-all p-6">
            <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-5">
              <Sliders className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Deterministic Space Planning</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Calculates topological room adjacency graphs, circulation halls, privacy zones, and Vastu directional orientations without LLM hallucinations.
            </p>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 hover:border-sky-500/40 transition-all p-6">
            <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-5">
              <Box className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Synchronized 2D & 3D Model</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              The single canonical BuildingModel drives both the vector SVG floor plans and interactive Three.js 3D extrusion with door/window punch-outs.
            </p>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 hover:border-sky-500/40 transition-all p-6">
            <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-5">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Regulation & Code Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Validates setbacks, coverage percentages, ventilation ratios, and stair dimensions with explicit PASS, WARNING, or UNKNOWN statuses.
            </p>
          </Card>
        </div>
      </section>

      {/* Auth Modal: Pops up upon clicking "Start Designing" when unauthenticated */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        title="Sign In to Start Designing"
        subtitle="Log in or create a free account with Google or Email so your architectural blueprint is saved to your account."
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          navigate('/wizard');
        }}
      />
    </div>
  );
};
