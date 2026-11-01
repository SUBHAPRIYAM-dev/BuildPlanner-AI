import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Layers, 
  Box, 
  Sliders, 
  FileCheck2, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  FileText,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLaunchDemo = () => {
    navigate('/wizard?demo=true');
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Background Architectural Grid Pattern */}
      <div className="absolute inset-0 blueprint-grid pointer-events-none opacity-40" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800/60 text-sky-400 text-xs font-medium mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Real Parametric Architecture — Not an AI Image Generator</span>
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

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/wizard">
            <Button size="lg" className="w-full sm:w-auto shadow-xl shadow-sky-500/25 px-8 py-3.5 text-base">
              Start Designing
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <Button 
            variant="secondary" 
            size="lg" 
            onClick={handleLaunchDemo}
            className="w-full sm:w-auto px-8 py-3.5 text-base border-slate-700 bg-slate-900/80 hover:bg-slate-800"
          >
            <MapPin className="h-4 w-4 mr-2 text-sky-400" />
            Explore Bhubaneswar 30×40 Demo
          </Button>
        </div>

        {/* Demo Specs pill */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Bhubaneswar BDA & NBC Norms</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Millimeter Accuracy</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Vector PDF Package</span>
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

      {/* Real Estate Developer Mode Teaser */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <Card variant="blueprint" className="p-8 sm:p-10 border-sky-500/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <Badge variant="info" className="mb-3">Enterprise & Developer Ready</Badge>
              <h3 className="text-2xl font-bold text-white">Multi-Block Master Site Planning</h3>
              <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
                Seamlessly scales from single-family residential villas to multi-acre residential township developments with building blocks, apartment unit templates (1/2/3/4 BHK), and community amenities.
              </p>
            </div>
            <Link to="/wizard">
              <Button variant="secondary" className="whitespace-nowrap">
                Create Residential Blueprint
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
};
