import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Layers, 
  MapPin, 
  Calendar, 
  Trash2, 
  ExternalLink, 
  Building2, 
  ShieldCheck, 
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { apiFetch } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatLength, formatArea } from '@buildplanner/units';
import { listProjectsLocally, deleteProjectLocally } from '../../services/projectService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'RESIDENTIAL' | 'DEVELOPER'>('ALL');

  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const remote = await apiFetch<any[]>('/projects');
        return remote;
      } catch (err) {
        console.warn('API unavailable on Vercel, loading local projects:', err);
        return listProjectsLocally();
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiFetch(`/projects/${id}`, { method: 'DELETE' });
      } catch (err) {
        deleteProjectLocally(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const filteredProjects = projects.filter(p => {
    if (filter === 'ALL') return true;
    return p.propertyType === filter;
  });

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Page Header */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <FolderOpen className="h-6 w-6 text-sky-400" />
              Architectural Projects
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage parametric floor plans, site models, and municipal drawing packages.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/wizard')} className="shadow-lg shadow-sky-500/25">
              <Plus className="h-4 w-4 mr-1.5" />
              New Project Plan
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Filter Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            {(['ALL', 'RESIDENTIAL', 'DEVELOPER'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  filter === tab
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        {/* Project Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
            <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-200">No architectural plans found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by launching the residential planning wizard with your property dimensions.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button onClick={() => navigate('/wizard')}>
                <Plus className="h-4 w-4 mr-1.5" />
                Start Residential Wizard
              </Button>
              <Button variant="secondary" onClick={() => navigate('/wizard?demo=true')}>
                Load Bhubaneswar Demo
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p) => {
              const plotWidth = formatLength(p.plot?.widthMm || 9144, 'imperial');
              const plotLength = formatLength(p.plot?.lengthMm || 12192, 'imperial');
              const plotArea = (p.plot?.widthMm * p.plot?.lengthMm) / 1_000_000;

              return (
                <Card 
                  key={p._id}
                  className="group relative flex flex-col justify-between bg-slate-900/70 border-slate-800 hover:border-sky-500/40 hover:shadow-xl hover:shadow-sky-950/20 transition-all"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="info">
                        G+{p.floorsCount ? p.floorsCount - 1 : 1} Residential
                      </Badge>
                      <Badge variant={p.currentModel?.validation?.overallStatus === 'PASS' ? 'success' : 'warning'}>
                        {p.currentModel?.validation?.overallStatus || 'DRAFT'}
                      </Badge>
                    </div>

                    {/* Project Title */}
                    <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors line-clamp-1">
                      {p.name}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                      <MapPin className="h-3.5 w-3.5 text-sky-400" />
                      <span>{p.location?.city}, {p.location?.state}</span>
                    </div>

                    {/* Blueprint Quick Specs */}
                    <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Plot Bounds</span>
                        <span className="text-slate-200">{plotWidth} × {plotLength}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Plot Area</span>
                        <span className="text-slate-200">{formatArea(plotArea, 'sqft')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${p.name}"?`)) {
                          deleteMutation.mutate(p._id);
                        }
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <Button
                      size="sm"
                      onClick={() => navigate(`/workspace/${p._id}`)}
                      className="shadow-sm"
                    >
                      Open Blueprint
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
