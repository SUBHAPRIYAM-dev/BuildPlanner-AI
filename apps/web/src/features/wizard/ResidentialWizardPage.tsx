import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Compass,
  Layers,
  MapPin,
  Car,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  Home,
  Plus,
  Minus,
  Globe,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ftToMm } from '@buildplanner/units';
import { generateLocalProject, saveProjectLocally } from '../../services/projectService';
import { useEditorStore } from '../../stores/editorStore';

export interface FloorReqItem {
  levelIndex: number;
  name: string;
  bedrooms: number;
  living: number;
  dining: number;
  kitchen: number;
  puja: number;
  attachedBathrooms: number;
  commonBathrooms: number;
  balcony: number;
  study: number;
}

const LEVEL_NAMES = [
  'Ground Floor',
  'First Floor',
  'Second Floor',
  'Third Floor',
  'Fourth Floor',
  'Fifth Floor',
  'Sixth Floor',
  'Seventh Floor'
];

function createInitialFloorReq(level: number): FloorReqItem {
  if (level === 0) {
    return {
      levelIndex: 0,
      name: 'Ground Floor',
      bedrooms: 2,
      living: 1,
      dining: 1,
      kitchen: 1,
      puja: 1,
      attachedBathrooms: 1,
      commonBathrooms: 1,
      balcony: 0,
      study: 0
    };
  }
  return {
    levelIndex: level,
    name: LEVEL_NAMES[level] || `Level ${level}`,
    bedrooms: 2,
    living: 1,
    dining: 1,
    kitchen: 1,
    puja: 0,
    attachedBathrooms: 1,
    commonBathrooms: 1,
    balcony: 1,
    study: 0
  };
}

const GLOBAL_COUNTRY_PRESETS = [
  { name: 'India', flag: '🇮🇳', city: 'Bhubaneswar', state: 'Odisha', unit: 'ft' as const, w: 30, l: 40 },
  { name: 'United States', flag: '🇺🇸', city: 'Austin', state: 'Texas', unit: 'ft' as const, w: 40, l: 60 },
  { name: 'United Kingdom', flag: '🇬🇧', city: 'London', state: 'Greater London', unit: 'm' as const, w: 10, l: 15 },
  { name: 'United Arab Emirates', flag: '🇦🇪', city: 'Dubai', state: 'Dubai', unit: 'm' as const, w: 15, l: 20 },
  { name: 'Canada', flag: '🇨🇦', city: 'Toronto', state: 'Ontario', unit: 'ft' as const, w: 35, l: 55 },
  { name: 'Australia', flag: '🇦🇺', city: 'Sydney', state: 'New South Wales', unit: 'm' as const, w: 12, l: 18 },
  { name: 'Global', flag: '🌐', city: 'Metropolis', state: 'International', unit: 'ft' as const, w: 35, l: 50 }
];

export const ResidentialWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get('demo') === 'true';

  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [projectName, setProjectName] = useState(isDemoMode ? 'Bhubaneswar Modern Villa' : 'My Residential Villa');
  const [country, setCountry] = useState('India');
  const [city, setCity] = useState('Bhubaneswar');
  const [state, setState] = useState('Odisha');

  // Plot details
  const [unit, setUnit] = useState<'ft' | 'm'>('ft');
  const [plotWidth, setPlotWidth] = useState(30);
  const [plotLength, setPlotLength] = useState(40);

  // Roads: North = 30 ft, West = 40 ft, South = No, East = No
  const [roads, setRoads] = useState({
    NORTH: { enabled: true, width: 30 },
    SOUTH: { enabled: false, width: 0 },
    EAST: { enabled: false, width: 0 },
    WEST: { enabled: true, width: 40 }
  });

  // Orientation degrees
  const [northAngle, setNorthAngle] = useState(0);

  // Floors: G+1 default (2 floors)
  const [floorsCount, setFloorsCount] = useState(2);
  const [futureFloor, setFutureFloor] = useState(true);

  // Dynamic Floor-by-Floor requirements
  const [floorReqs, setFloorReqs] = useState<FloorReqItem[]>([
    createInitialFloorReq(0),
    createInitialFloorReq(1)
  ]);

  // Parking
  const [parkingCars, setParkingCars] = useState(1);
  const [parkingLocation, setParkingLocation] = useState<'SURFACE_PORCH' | 'BASEMENT_UNDERGROUND' | 'STILT'>('SURFACE_PORCH');

  // Staircase Customization
  const [staircaseType, setStaircaseType] = useState<'DOG_LEGGED_U' | 'STRAIGHT' | 'L_SHAPED'>('DOG_LEGGED_U');
  const [staircaseZone, setStaircaseZone] = useState<'WEST' | 'NORTH_WEST' | 'SOUTH_WEST' | 'SOUTH_EAST'>('WEST');

  // Preferences
  const [vastuEnabled, setVastuEnabled] = useState(true);
  const [vastuPreference, setVastuPreference] = useState<'STRICT' | 'BALANCED' | 'FLEXIBLE'>('BALANCED');

  // Floor count changer that synchronizes requirements array
  const updateFloorCount = (count: number) => {
    const validCount = Math.max(1, Math.min(8, count));
    setFloorsCount(validCount);
    setFloorReqs((prev) => {
      const next: FloorReqItem[] = [];
      for (let i = 0; i < validCount; i++) {
        if (prev[i]) {
          next.push({ ...prev[i], levelIndex: i, name: LEVEL_NAMES[i] || `Level ${i}` });
        } else {
          next.push(createInitialFloorReq(i));
        }
      }
      return next;
    });
  };

  const updateFloorReq = (idx: number, field: keyof FloorReqItem, val: any) => {
    setFloorReqs((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = { ...next[idx], [field]: val };
      }
      return next;
    });
  };

  // Generation Mutation
  const createAndGenerateMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const widthMm = unit === 'ft' ? ftToMm(plotWidth) : Math.round(plotWidth * 1000);
      const lengthMm = unit === 'ft' ? ftToMm(plotLength) : Math.round(plotLength * 1000);

      const payload = {
        name: projectName,
        description: `Residential ${floorsCount > 1 ? `G+${floorsCount - 1}` : 'Single Story'} Villa in ${city}, ${country}`,
        propertyType: 'RESIDENTIAL' as const,
        location: { city, state, country },
        plot: { widthMm, lengthMm, shape: 'RECTANGLE' as const },
        roads: {
          NORTH: {
            enabled: roads.NORTH.enabled,
            widthMm: unit === 'ft' ? ftToMm(roads.NORTH.width || 30) : (roads.NORTH.width || 9) * 1000,
            type: 'ACCESS'
          },
          SOUTH: {
            enabled: roads.SOUTH.enabled,
            widthMm: unit === 'ft' ? ftToMm(roads.SOUTH.width || 0) : (roads.SOUTH.width || 0) * 1000,
            type: 'ACCESS'
          },
          EAST: {
            enabled: roads.EAST.enabled,
            widthMm: unit === 'ft' ? ftToMm(roads.EAST.width || 0) : (roads.EAST.width || 0) * 1000,
            type: 'ACCESS'
          },
          WEST: {
            enabled: roads.WEST.enabled,
            widthMm: unit === 'ft' ? ftToMm(roads.WEST.width || 40) : (roads.WEST.width || 12) * 1000,
            type: 'MAIN'
          }
        },
        orientationNorthDegrees: northAngle,
        floorsCount,
        floorRequirements: floorReqs.map((f) => ({
          levelIndex: f.levelIndex,
          name: f.name,
          bedrooms: Number(f.bedrooms) || 0,
          bathrooms: (Number(f.attachedBathrooms) || 0) + (Number(f.commonBathrooms) || 0),
          attachedBathrooms: Number(f.attachedBathrooms) || 0,
          commonBathrooms: Number(f.commonBathrooms) || 0,
          living: Number(f.living) || 0,
          dining: Number(f.dining) || 0,
          kitchen: Number(f.kitchen) || 0,
          puja: Number(f.puja) || 0,
          balcony: Number(f.balcony) || 0,
          study: Number(f.study) || 0
        })),
        parking: {
          cars: parkingCars,
          motorcycles: 0,
          location: parkingLocation
        },
        staircase: {
          type: staircaseType,
          positionZone: staircaseZone
        },
        vastu: { enabled: vastuEnabled, preference: vastuPreference },
        futureFloors: { planned: futureFloor, count: 1 }
      };

      try {
        // 1. Try remote API first
        const projectData: any = await apiFetch('/projects', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        // 2. Trigger Planning Engine Generation
        const generationData: any = await apiFetch(`/projects/${projectData._id}/generate`, {
          method: 'POST'
        });

        if (generationData?.selectedModel) {
          useEditorStore.getState().setModel(generationData.selectedModel);
          saveProjectLocally({
            ...projectData,
            currentModel: generationData.selectedModel
          });
        }

        return { project: projectData, generation: generationData };
      } catch (apiErr) {
        console.warn('Backend API unavailable. Generating plan in browser via Parametric Planning Engine...', apiErr);

        // Fallback to bundled client-side planning engine
        const local = generateLocalProject(payload);
        useEditorStore.getState().setModel(local.buildingModel);

        return { project: local.project, generation: { selectedModel: local.buildingModel } };
      }
    },
    onSuccess: (data) => {
      navigate(`/workspace/${data.project._id}`);
    },
    onError: (error: any) => {
      console.error('Plan generation failed:', error);
      setErrorMessage(error.message || 'Generation failed. Please verify your plot dimensions and floor requirements.');
    }
  });

  const isBhubaneswar = city.toLowerCase().trim() === 'bhubaneswar';
  const totalPlotAreaSqft = unit === 'ft' ? plotWidth * plotLength : Math.round(plotWidth * plotLength * 10.7639);
  const totalPlotAreaSqm = unit === 'm' ? plotWidth * plotLength : Number((plotWidth * plotLength * 0.092903).toFixed(1));

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Top Progress Header */}
      <div className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-16 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-mono font-bold text-sm">
              {step}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Step {step} of 6: {
                  step === 1 ? 'Location & Global Jurisdiction' :
                  step === 2 ? 'Plot Dimensions' :
                  step === 3 ? 'Road Access & Orientation' :
                  step === 4 ? 'Building Floors & Expansion' :
                  step === 5 ? 'Floor-by-Floor Exact Requirements' :
                  'Parking, Vastu & Generate'
                }
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {isBhubaneswar
                  ? 'Bhubaneswar Development Authority (BDA / OBRPS 2020) Active'
                  : 'International Building Code (IBC) Universal Standards Active'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDemoMode && <Badge variant="info">Demo Preset</Badge>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProjectName('Bhubaneswar Modern Villa');
                setCountry('India');
                setCity('Bhubaneswar');
                setState('Odisha');
                setUnit('ft');
                setPlotWidth(30);
                setPlotLength(40);
                setRoads({
                  NORTH: { enabled: true, width: 30 },
                  SOUTH: { enabled: false, width: 0 },
                  EAST: { enabled: false, width: 0 },
                  WEST: { enabled: true, width: 40 }
                });
                updateFloorCount(2);
                setParkingCars(1);
                setFutureFloor(true);
                setVastuEnabled(true);
              }}
            >
              Reset to 30×40 Demo
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-8">
        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/70 border border-red-800 text-red-200 flex items-start gap-3 shadow-lg">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <strong>Generation Notice:</strong> {errorMessage}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-red-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step 1: Global Location */}
        {step === 1 && (
          <Card className="p-8 space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-sky-400" />
                Where is your property located in the world?
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                BuildPlanner AI works globally. Select your country or pick a preset to configure municipal bye-laws.
              </p>
            </div>

            {/* Quick Country Presets */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Quick Country & City Presets:
              </label>
              <div className="flex flex-wrap gap-2">
                {GLOBAL_COUNTRY_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setCountry(p.name);
                      setCity(p.city);
                      setState(p.state);
                      setUnit(p.unit);
                      setPlotWidth(p.w);
                      setPlotLength(p.l);
                      setRoads({
                        NORTH: { enabled: true, width: p.unit === 'ft' ? 30 : 9 },
                        SOUTH: { enabled: false, width: 0 },
                        EAST: { enabled: false, width: 0 },
                        WEST: { enabled: true, width: p.unit === 'ft' ? 40 : 12 }
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                      country === p.name
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{p.flag}</span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Project Title"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Modern Family Villa"
              />
              <Input
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. India, United States, United Kingdom"
              />
              <Input
                label="City / Municipality"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bhubaneswar, Austin, London"
              />
              <Input
                label="State / Province"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Odisha, Texas, Greater London"
              />
            </div>

            <div className="p-4 rounded-lg bg-sky-950/40 border border-sky-800/40 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-sky-200 leading-relaxed">
                {isBhubaneswar ? (
                  <span>
                    <strong>BDA / OBRPS 2020 Rules Active:</strong> Verifies ground coverage (&le;65%), front street setback (1.5m), and NBC residential standards.
                  </span>
                ) : (
                  <span>
                    <strong>International Building Code (IBC) Standards Active:</strong> Universal residential standards, street clearances, NBC/IRC room minimums, and parking ratios are applied.
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Plot Details & Presets */}
        {step === 2 && (
          <Card className="p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-sky-400" />
                  Plot Dimensions & Scale
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Enter boundary dimensions. All geometry is calculated with millimeter precision.
                </p>
              </div>

              {/* Unit Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setUnit('ft')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                    unit === 'ft' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Feet (ft)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('m')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                    unit === 'm' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Meters (m)
                </button>
              </div>
            </div>

            {/* Common Plot Presets */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Common Plot Sizes:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '30 × 40 ft (1,200 sqft)', u: 'ft' as const, w: 30, l: 40 },
                  { label: '40 × 60 ft (2,400 sqft)', u: 'ft' as const, w: 40, l: 60 },
                  { label: '50 × 80 ft (4,000 sqft)', u: 'ft' as const, w: 50, l: 80 },
                  { label: '10 × 15 m (150 sqm)', u: 'm' as const, w: 10, l: 15 },
                  { label: '12 × 20 m (240 sqm)', u: 'm' as const, w: 12, l: 20 }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setUnit(preset.u);
                      setPlotWidth(preset.w);
                      setPlotLength(preset.l);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                      plotWidth === preset.w && plotLength === preset.l && unit === preset.u
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <Input
                  label={`Plot Width (Facing Front/North) [${unit}]`}
                  type="number"
                  value={plotWidth}
                  onChange={(e) => setPlotWidth(Math.max(10, Number(e.target.value)))}
                  unitSuffix={unit}
                  hint={unit === 'ft' ? `${(plotWidth * 0.3048).toFixed(2)} meters` : `${(plotWidth * 3.28084).toFixed(1)} feet`}
                />
                <Input
                  label={`Plot Length (Depth) [${unit}]`}
                  type="number"
                  value={plotLength}
                  onChange={(e) => setPlotLength(Math.max(10, Number(e.target.value)))}
                  unitSuffix={unit}
                  hint={unit === 'ft' ? `${(plotLength * 0.3048).toFixed(2)} meters` : `${(plotLength * 3.28084).toFixed(1)} feet`}
                />

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Total Site Area:</span>
                    <span className="text-white font-bold">
                      {totalPlotAreaSqft.toLocaleString()} sq.ft ({totalPlotAreaSqm} m²)
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Interactive SVG Plot Preview */}
              <div className="h-64 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-4 relative blueprint-grid">
                <div
                  className="border-2 border-dashed border-sky-400 bg-sky-500/10 rounded flex flex-col items-center justify-center text-center p-2 transition-all shadow-inner"
                  style={{
                    width: `${Math.min(240, Math.max(80, (plotWidth / (plotLength || 1)) * 160))}px`,
                    height: `${Math.min(200, Math.max(80, (plotLength / (plotWidth || 1)) * 140))}px`
                  }}
                >
                  <span className="text-xs font-bold font-mono text-sky-300">{plotWidth} {unit}</span>
                  <span className="text-[10px] text-slate-400 my-auto">{totalPlotAreaSqm} m²</span>
                  <span className="text-xs font-bold font-mono text-sky-300">{plotLength} {unit}</span>
                </div>
                <span className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-500">
                  Live Proportional Boundary
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Road Access & Orientation */}
        {step === 3 && (
          <Card className="p-8 space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Compass className="h-5 w-5 text-sky-400" />
                Road Access & Orientation
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Toggle abutting road boundaries and specify their widths.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                {(['NORTH', 'WEST', 'SOUTH', 'EAST'] as const).map((side) => {
                  const isEnabled = roads[side].enabled;
                  return (
                    <div
                      key={side}
                      className={`p-3 rounded-lg border transition-all ${
                        isEnabled ? 'bg-sky-950/40 border-sky-500/40' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => {
                              setRoads({
                                ...roads,
                                [side]: { ...roads[side], enabled: e.target.checked }
                              });
                            }}
                            className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                          />
                          <span>{side} Side Road</span>
                        </label>
                        {isEnabled && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">Width:</span>
                            <input
                              type="number"
                              value={roads[side].width}
                              onChange={(e) => {
                                setRoads({
                                  ...roads,
                                  [side]: { ...roads[side], width: Number(e.target.value) }
                                });
                              }}
                              className="w-16 rounded bg-slate-950 border border-slate-700 px-2 py-0.5 text-xs text-white font-mono text-center"
                            />
                            <span className="text-xs font-mono text-slate-400">{unit}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Orientation Visualizer */}
              <div className="h-64 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4 relative">
                <div className="h-32 w-32 rounded-full border-2 border-slate-700 flex items-center justify-center relative">
                  <div
                    className="w-1 h-14 bg-gradient-to-t from-transparent to-red-500 absolute top-2 rounded-full origin-bottom"
                    style={{ transform: `rotate(${northAngle}deg)` }}
                  />
                  <span className="text-xs font-bold text-red-400 absolute top-1 font-mono">N</span>
                  <span className="text-xs font-mono text-slate-400">{northAngle}°</span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono">North Rotation:</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={northAngle}
                    onChange={(e) => setNorthAngle(Number(e.target.value))}
                    className="w-32 accent-sky-500"
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Building Floors & Expansion (Flexible G+0 up to G+4 or Custom) */}
        {step === 4 && (
          <Card className="p-8 space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-sky-400" />
                Building Floors & Vertical Expansion
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Select your building height. Works for any story count from single-story up to G+4 or higher.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Select Story Count
                </label>

                {/* Preset Floor Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { count: 1, label: 'G+0', title: 'Ground Only' },
                    { count: 2, label: 'G+1', title: 'Ground + 1st' },
                    { count: 3, label: 'G+2', title: 'Ground + 2' },
                    { count: 4, label: 'G+3', title: 'Ground + 3' },
                    { count: 5, label: 'G+4', title: 'Ground + 4' }
                  ].map((f) => (
                    <button
                      key={f.count}
                      type="button"
                      onClick={() => updateFloorCount(f.count)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        floorsCount === f.count
                          ? 'bg-sky-950/60 border-sky-500 text-white shadow-lg shadow-sky-950/40'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-sm text-sky-400 font-mono">{f.label}</div>
                      <div className="text-xs text-slate-300 mt-0.5">{f.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{f.count} {f.count === 1 ? 'Level' : 'Levels'}</div>
                    </button>
                  ))}
                </div>

                {/* Custom Floor Counter Stepper */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Custom Floor Count</div>
                    <div className="text-xs text-slate-400">Specify any total story count (1 to 8 floors)</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateFloorCount(floorsCount - 1)}
                      disabled={floorsCount <= 1}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-sky-400 font-mono text-base">
                      {floorsCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateFloorCount(floorsCount + 1)}
                      disabled={floorsCount >= 8}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={futureFloor}
                      onChange={(e) => setFutureFloor(e.target.checked)}
                      className="mt-1 rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-white">Continuous Vertical Staircase Core</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Extends the vertical staircase to terrace level for future vertical additions.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Height & Classification Summary */}
              <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-center text-xs text-slate-300 space-y-3 font-mono">
                <div className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">
                  Vertical Elevation Engineering
                </div>
                <div>• Total Levels: <strong className="text-white">{floorsCount} Floors</strong> ({floorsCount === 1 ? 'Single Story' : `G+${floorsCount - 1}`})</div>
                <div>• Floor-to-Ceiling Height: 3000 mm (10'-0")</div>
                <div>• Concrete Slab Thickness: 150 mm (6")</div>
                <div>• Total Building Height: <strong className="text-emerald-400">{floorsCount * 3.0 + 1.0} meters</strong></div>
                <div>
                  • Height Category:{' '}
                  <span className={floorsCount <= 3 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {floorsCount <= 3 ? 'Low-Rise Compliant (≤ 10.0m)' : 'Mid-Rise Residential Category'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 5: Floor-by-Floor Exact Requirements (Dynamic for ALL Selected Floors) */}
        {step === 5 && (
          <Card className="p-8 space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Home className="h-5 w-5 text-sky-400" />
                Floor-by-Floor Exact Requirements
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Customize room allocations for each level individually. Ground floor includes parking and upper floors feature balconies.
              </p>
            </div>

            <div className="space-y-6">
              {floorReqs.map((req, idx) => (
                <div
                  key={req.levelIndex}
                  className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 transition-all"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-sm text-sky-400 uppercase font-mono flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-sky-400" />
                      {req.name} Requirements
                    </span>
                    <Badge variant="info">Level {req.levelIndex}</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Input
                      label="Bedrooms"
                      type="number"
                      value={req.bedrooms}
                      onChange={(e) => updateFloorReq(idx, 'bedrooms', Number(e.target.value))}
                      hint={`Level ${idx} Beds`}
                    />
                    <Input
                      label={idx === 0 ? 'Living Room' : 'Family Lounge'}
                      type="number"
                      value={req.living}
                      onChange={(e) => updateFloorReq(idx, 'living', Number(e.target.value))}
                    />
                    <Input
                      label="Dining Area"
                      type="number"
                      value={req.dining}
                      onChange={(e) => updateFloorReq(idx, 'dining', Number(e.target.value))}
                    />
                    <Input
                      label={idx === 0 ? 'Main Kitchen' : 'Kitchen / Pantry'}
                      type="number"
                      value={req.kitchen}
                      onChange={(e) => updateFloorReq(idx, 'kitchen', Number(e.target.value))}
                    />
                    <Input
                      label="Attached Baths"
                      type="number"
                      value={req.attachedBathrooms}
                      onChange={(e) => updateFloorReq(idx, 'attachedBathrooms', Number(e.target.value))}
                    />
                    <Input
                      label="Common Baths"
                      type="number"
                      value={req.commonBathrooms}
                      onChange={(e) => updateFloorReq(idx, 'commonBathrooms', Number(e.target.value))}
                    />

                    {/* Puja on Ground Floor or any Floor */}
                    <Input
                      label="Puja Room"
                      type="number"
                      value={req.puja}
                      onChange={(e) => updateFloorReq(idx, 'puja', Number(e.target.value))}
                      hint={idx === 0 ? 'Vastu North-East' : 'Optional'}
                    />

                    {/* Balcony for upper floors or Ground */}
                    <Input
                      label="Balcony / Terrace"
                      type="number"
                      value={req.balcony}
                      onChange={(e) => updateFloorReq(idx, 'balcony', Number(e.target.value))}
                      hint={idx > 0 ? 'Road Facing' : 'Optional Verandah'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Step 6: Parking, Vastu & Generate */}
        {step === 6 && (
          <Card className="p-8 space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Car className="h-5 w-5 text-sky-400" />
                Parking & Vastu Preferences
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Configure site-level vehicular parking and orientation guidelines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Parking */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <Car className="h-4 w-4 text-sky-400" />
                  Site Car Parking Bays & Placement
                </span>
                <p className="text-xs text-slate-400">
                  Allocated without overlapping rooms. Multi-car bays expand side-by-side cleanly.
                </p>
                {/* Car Count Buttons */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Car Bays Count:</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setParkingCars(num)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          parkingCars === num
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500 shadow'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {num} {num === 1 ? 'Car Bay' : 'Car Bays'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parking Location Option */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Parking Location:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'SURFACE_PORCH', label: 'Ground Porch', desc: 'Front Driveway' },
                      { id: 'BASEMENT_UNDERGROUND', label: 'Basement (-1)', desc: 'Underground' },
                      { id: 'STILT', label: 'Ground Stilt', desc: 'Open Ground' }
                    ].map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setParkingLocation(loc.id as any)}
                        className={`p-2 rounded-lg text-left border transition-all ${
                          parkingLocation === loc.id
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">{loc.label}</div>
                        <div className="text-[10px] text-slate-500">{loc.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Staircase Customization */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-sky-400" />
                  Staircase Core Options & Position
                </span>
                <p className="text-xs text-slate-400">
                  Select flight geometry and location zone for vertical access.
                </p>

                {/* Staircase Shape */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Staircase Geometry:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'DOG_LEGGED_U', label: 'U-Shape (Dog-Legged)' },
                      { id: 'STRAIGHT', label: 'Straight Flight' },
                      { id: 'L_SHAPED', label: 'L-Shaped' }
                    ].map((shape) => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => setStaircaseType(shape.id as any)}
                        className={`p-2 rounded-lg text-center border transition-all ${
                          staircaseType === shape.id
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">{shape.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Staircase Position Zone */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Core Location Zone:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'WEST', label: 'West (Mid)' },
                      { id: 'NORTH_WEST', label: 'North-West' },
                      { id: 'SOUTH_WEST', label: 'South-West' },
                      { id: 'SOUTH_EAST', label: 'South-East' }
                    ].map((zone) => (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => setStaircaseZone(zone.id as any)}
                        className={`p-1.5 rounded-lg text-center border transition-all ${
                          staircaseZone === zone.id
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{zone.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Comprehensive Plan Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-2">
              <div className="text-sky-400 font-bold uppercase tracking-wider mb-2">
                Plan Configuration Summary
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Structure: {floorsCount} Floors ({floorsCount === 1 ? 'Single Story' : `G+${floorsCount - 1}`}) • Location: {city}, {country}
                </span>
              </div>
              {floorReqs.map((f) => (
                <div key={f.levelIndex} className="flex items-center gap-2 text-slate-300 ml-6">
                  <span>• {f.name}: {f.bedrooms} Bed, {f.living} Living/Lounge, {f.kitchen} Kitchen, {f.attachedBathrooms + f.commonBathrooms} Baths{f.balcony > 0 ? `, ${f.balcony} Balcony` : ''}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Parking: {parkingCars} Car Bay(s) on Site</span>
              </div>
            </div>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between">
          {step > 1 ? (
            <Button
              variant="secondary"
              onClick={() => setStep(step - 1)}
              disabled={createAndGenerateMutation.isPending}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              disabled={createAndGenerateMutation.isPending}
            >
              Cancel
            </Button>
          )}

          {step < 6 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="shadow-lg shadow-sky-500/25"
            >
              Continue to Step {step + 1}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => createAndGenerateMutation.mutate()}
              isLoading={createAndGenerateMutation.isPending}
              size="lg"
              className="shadow-xl shadow-sky-500/30 px-8 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 font-bold"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              {createAndGenerateMutation.isPending ? 'Synthesizing Architecture...' : 'Generate Parametric Blueprint'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
