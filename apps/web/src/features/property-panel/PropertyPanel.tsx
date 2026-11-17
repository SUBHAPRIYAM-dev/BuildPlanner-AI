import React, { useState, useEffect } from 'react';
import {
  BuildingModel,
  RoomModel,
  StaircaseModel,
  StaircaseType
} from '@buildplanner/building-model';
import { formatLength, formatArea, ftToMm } from '@buildplanner/units';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Maximize2,
  Layers,
  Compass,
  CheckCircle2,
  Sliders,
  Building,
  Home,
  Trash2,
  RotateCcw,
  Move,
  CornerDownRight,
  ArrowUpRight,
  Sparkles,
  Ruler,
  Footprints,
  X
} from 'lucide-react';

interface PropertyPanelProps {
  model: BuildingModel;
  selectedRoom: RoomModel | null;
  selectedStaircase?: StaircaseModel | null;
  onUpdateRoom?: (updatedRoom: RoomModel) => void;
  onDeleteRoom?: (roomId: string) => void;
  onUpdateStaircase?: (updatedStair: StaircaseModel) => void;
  onSelectStaircase?: (stair: StaircaseModel | null) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  model,
  selectedRoom,
  selectedStaircase,
  onUpdateRoom,
  onDeleteRoom,
  onUpdateStaircase,
  onSelectStaircase
}) => {
  // Room Form State
  const [roomName, setRoomName] = useState('');
  const [widthFt, setWidthFt] = useState(0);
  const [lengthFt, setLengthFt] = useState(0);
  const [posXFt, setPosXFt] = useState(0);
  const [posYFt, setPosYFt] = useState(0);

  // Staircase Form State
  const [stairType, setStairType] = useState<StaircaseType>('DOG_LEGGED_U');
  const [stairWidthFt, setStairWidthFt] = useState(6.9);
  const [stairLengthFt, setStairLengthFt] = useState(6.6);
  const [stairPosXFt, setStairPosXFt] = useState(0);
  const [stairPosYFt, setStairPosYFt] = useState(0);
  const [flightWidthFt, setFlightWidthFt] = useState(3.3);
  const [landingWidthFt, setLandingWidthFt] = useState(3.3);
  const [stepCount, setStepCount] = useState(18);
  const [continuesUp, setContinuesUp] = useState(true);

  useEffect(() => {
    if (selectedRoom) {
      setRoomName(selectedRoom.name);
      setWidthFt(Number((selectedRoom.bounds.widthMm / 304.8).toFixed(1)));
      setLengthFt(Number((selectedRoom.bounds.lengthMm / 304.8).toFixed(1)));
      setPosXFt(Number((selectedRoom.bounds.minX / 304.8).toFixed(1)));
      setPosYFt(Number((selectedRoom.bounds.minY / 304.8).toFixed(1)));
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (selectedStaircase) {
      setStairType(selectedStaircase.type || 'DOG_LEGGED_U');
      setStairWidthFt(Number((selectedStaircase.dimensionsMm.width / 304.8).toFixed(1)));
      setStairLengthFt(Number((selectedStaircase.dimensionsMm.length / 304.8).toFixed(1)));
      setStairPosXFt(Number((selectedStaircase.startPoint.x / 304.8).toFixed(1)));
      setStairPosYFt(Number((selectedStaircase.startPoint.y / 304.8).toFixed(1)));
      setFlightWidthFt(Number(((selectedStaircase.flightWidthMm || 1000) / 304.8).toFixed(1)));
      setLandingWidthFt(Number(((selectedStaircase.landingWidthMm || 1000) / 304.8).toFixed(1)));
      setStepCount(selectedStaircase.stepCount || 18);
      setContinuesUp(selectedStaircase.continuesUp ?? true);
    }
  }, [selectedStaircase]);

  // Apply Room Update
  const applyParametricUpdate = (newXFt?: number, newYFt?: number, newWFt?: number, newLFt?: number) => {
    if (!selectedRoom || !onUpdateRoom) return;

    const useX = newXFt !== undefined ? newXFt : posXFt;
    const useY = newYFt !== undefined ? newYFt : posYFt;
    const useW = newWFt !== undefined ? newWFt : widthFt;
    const useL = newLFt !== undefined ? newLFt : lengthFt;

    const originX = ftToMm(useX);
    const originY = ftToMm(useY);
    const newWidthMm = ftToMm(useW);
    const newLengthMm = ftToMm(useL);

    const updated: RoomModel = {
      ...selectedRoom,
      name: roomName,
      bounds: {
        minX: originX,
        minY: originY,
        maxX: originX + newWidthMm,
        maxY: originY + newLengthMm,
        widthMm: newWidthMm,
        lengthMm: newLengthMm
      },
      polygon: [
        { x: originX, y: originY },
        { x: originX + newWidthMm, y: originY },
        { x: originX + newWidthMm, y: originY + newLengthMm },
        { x: originX, y: originY + newLengthMm }
      ],
      areaSqm: Number(((newWidthMm * newLengthMm) / 1_000_000).toFixed(2))
    };

    onUpdateRoom(updated);
  };

  const relocateToZone = (zone: 'NE' | 'SE' | 'SW' | 'NW' | 'CENTER') => {
    if (!selectedRoom) return;
    const plotW = model.site.dimensionsMm.width;
    const plotL = model.site.dimensionsMm.length;
    const roomW = selectedRoom.bounds.widthMm;
    const roomL = selectedRoom.bounds.lengthMm;
    const sb = model.site.setbacksMm || { front: 1500, rear: 1000, side1: 1000, side2: 1000 };

    let targetXmm = selectedRoom.bounds.minX;
    let targetYmm = selectedRoom.bounds.minY;

    if (zone === 'NE') {
      targetXmm = plotW - sb.side2 - roomW;
      targetYmm = plotL - sb.rear - roomL;
    } else if (zone === 'SE') {
      targetXmm = plotW - sb.side2 - roomW;
      targetYmm = sb.front;
    } else if (zone === 'SW') {
      targetXmm = sb.side1;
      targetYmm = sb.front;
    } else if (zone === 'NW') {
      targetXmm = sb.side1;
      targetYmm = plotL - sb.rear - roomL;
    } else if (zone === 'CENTER') {
      targetXmm = Math.round((plotW - roomW) / 2);
      targetYmm = Math.round((plotL - roomL) / 2);
    }

    const newXFt = Number((targetXmm / 304.8).toFixed(1));
    const newYFt = Number((targetYmm / 304.8).toFixed(1));
    setPosXFt(newXFt);
    setPosYFt(newYFt);
    applyParametricUpdate(newXFt, newYFt);
  };

  // Apply Staircase Update
  const applyStaircaseUpdate = (overrides?: Partial<StaircaseModel>) => {
    const active = selectedStaircase || model.staircases[0];
    if (!active || !onUpdateStaircase) return;

    const targetType = overrides?.type !== undefined ? overrides.type : stairType;
    const targetW = overrides?.dimensionsMm?.width !== undefined ? overrides.dimensionsMm.width : ftToMm(stairWidthFt);
    const targetL = overrides?.dimensionsMm?.length !== undefined ? overrides.dimensionsMm.length : ftToMm(stairLengthFt);
    const targetX = overrides?.startPoint?.x !== undefined ? overrides.startPoint.x : ftToMm(stairPosXFt);
    const targetY = overrides?.startPoint?.y !== undefined ? overrides.startPoint.y : ftToMm(stairPosYFt);
    const targetFlightW = overrides?.flightWidthMm !== undefined ? overrides.flightWidthMm : ftToMm(flightWidthFt);
    const targetLandingW = overrides?.landingWidthMm !== undefined ? overrides.landingWidthMm : ftToMm(landingWidthFt);
    const targetSteps = overrides?.stepCount !== undefined ? overrides.stepCount : stepCount;
    const targetContinues = overrides?.continuesUp !== undefined ? overrides.continuesUp : continuesUp;

    // Recalculate Riser & Tread
    const floorHeight = 3000;
    const actualRiser = Math.round(floorHeight / targetSteps);
    const actualTread = targetType === 'STRAIGHT'
      ? Math.round(targetL / targetSteps)
      : Math.round((targetL - targetLandingW) / (targetSteps / 2));

    const updated: StaircaseModel = {
      ...active,
      type: targetType,
      startPoint: { x: targetX, y: targetY },
      dimensionsMm: { width: targetW, length: targetL },
      flightWidthMm: targetFlightW,
      landingWidthMm: targetLandingW,
      stepCount: targetSteps,
      riserMm: actualRiser,
      treadMm: Math.max(200, actualTread),
      continuesUp: targetContinues
    };

    onUpdateStaircase(updated);
  };

  // Quick Relocate Staircase Core
  const relocateStaircaseToZone = (zone: 'WEST' | 'NORTH_WEST' | 'SOUTH_WEST' | 'SOUTH_EAST' | 'CENTER') => {
    const active = selectedStaircase || model.staircases[0];
    if (!active) return;

    const plotW = model.site.dimensionsMm.width;
    const plotL = model.site.dimensionsMm.length;
    const stairW = active.dimensionsMm.width;
    const stairL = active.dimensionsMm.length;
    const sb = model.site.setbacksMm || { front: 1500, rear: 1000, side1: 1000, side2: 1000 };

    let targetXmm = sb.side1;
    let targetYmm = Math.round((plotL - stairL) / 2);

    if (zone === 'WEST') {
      targetXmm = sb.side1;
      targetYmm = Math.round((plotL - stairL) / 2);
    } else if (zone === 'NORTH_WEST') {
      targetXmm = sb.side1;
      targetYmm = plotL - sb.rear - stairL;
    } else if (zone === 'SOUTH_WEST') {
      targetXmm = sb.side1;
      targetYmm = sb.front;
    } else if (zone === 'SOUTH_EAST') {
      targetXmm = plotW - sb.side2 - stairW;
      targetYmm = sb.front;
    } else if (zone === 'CENTER') {
      targetXmm = Math.round((plotW - stairW) / 2);
      targetYmm = Math.round((plotL - stairL) / 2);
    }

    const newXFt = Number((targetXmm / 304.8).toFixed(1));
    const newYFt = Number((targetYmm / 304.8).toFixed(1));
    setStairPosXFt(newXFt);
    setStairPosYFt(newYFt);

    applyStaircaseUpdate({
      startPoint: { x: targetXmm, y: targetYmm }
    });
  };

  // Change Staircase Shape
  const handleStaircaseShapeChange = (newType: StaircaseType) => {
    setStairType(newType);

    // Auto-adjust default comfortable dimensions for new shape
    let newWFt = stairWidthFt;
    let newLFt = stairLengthFt;

    if (newType === 'STRAIGHT') {
      newWFt = 4.6; // ~1400 mm
      newLFt = 11.0; // ~3350 mm
    } else if (newType === 'DOG_LEGGED_U') {
      newWFt = 6.9; // ~2100 mm
      newLFt = 7.0; // ~2130 mm
    } else if (newType === 'L_SHAPED') {
      newWFt = 6.6; // ~2000 mm
      newLFt = 8.5; // ~2600 mm
    }

    setStairWidthFt(newWFt);
    setStairLengthFt(newLFt);

    applyStaircaseUpdate({
      type: newType,
      dimensionsMm: { width: ftToMm(newWFt), length: ftToMm(newLFt) }
    });
  };

  // -------------------------------------------------------------------------
  // RENDER: 1. Staircase Inspector Active
  // -------------------------------------------------------------------------
  if (selectedStaircase) {
    const actualRiser = Math.round(3000 / stepCount);
    const actualTread = stairType === 'STRAIGHT'
      ? Math.round(ftToMm(stairLengthFt) / stepCount)
      : Math.round((ftToMm(stairLengthFt) - ftToMm(landingWidthFt)) / (stepCount / 2));

    return (
      <div className="h-full flex flex-col p-4 bg-slate-900/90 border-l border-slate-800 text-slate-100 overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Staircase Core</h2>
              <span className="text-[10px] text-slate-400 font-mono">Vertical Circulation</span>
            </div>
          </div>
          <button
            onClick={() => onSelectStaircase?.(null)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            title="Deselect Staircase"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Shape / Geometry Selector */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              Staircase Shape / Geometry
            </label>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { id: 'DOG_LEGGED_U', label: 'U-Shape', desc: 'Dog-Legged' },
                { id: 'STRAIGHT', label: 'Straight', desc: 'Linear Flight' },
                { id: 'L_SHAPED', label: 'L-Shaped', desc: 'Quarter Turn' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleStaircaseShapeChange(s.id as StaircaseType)}
                  className={`p-2 rounded-lg text-center border transition-all ${
                    stairType === s.id
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500 font-bold shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs">{s.label}</div>
                  <div className="text-[9px] text-slate-500">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Place & Position Controls */}
          <div className="space-y-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Move className="h-3.5 w-3.5 text-sky-400" />
              Change Staircase Place (Position)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Origin X (ft)</span>
                <input
                  type="number"
                  step="0.5"
                  value={stairPosXFt}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStairPosXFt(val);
                    applyStaircaseUpdate({ startPoint: { x: ftToMm(val), y: ftToMm(stairPosYFt) } });
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Origin Y (ft)</span>
                <input
                  type="number"
                  step="0.5"
                  value={stairPosYFt}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStairPosYFt(val);
                    applyStaircaseUpdate({ startPoint: { x: ftToMm(stairPosXFt), y: ftToMm(val) } });
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Quick Cardinal Relocation Presets */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
                Quick Relocation Presets:
              </span>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => relocateStaircaseToZone('WEST')}
                  className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-center"
                >
                  ⬅️ Mid-West
                </button>
                <button
                  type="button"
                  onClick={() => relocateStaircaseToZone('NORTH_WEST')}
                  className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-center"
                >
                  ↖️ North-West
                </button>
                <button
                  type="button"
                  onClick={() => relocateStaircaseToZone('SOUTH_WEST')}
                  className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-center"
                >
                  ↙️ South-West
                </button>
                <button
                  type="button"
                  onClick={() => relocateStaircaseToZone('SOUTH_EAST')}
                  className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-center"
                >
                  ↘️ South-East
                </button>
                <button
                  type="button"
                  onClick={() => relocateStaircaseToZone('CENTER')}
                  className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-center col-span-2"
                >
                  🎯 Center Core
                </button>
              </div>
            </div>
          </div>

          {/* Size & Dimensions Controls */}
          <div className="space-y-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5 text-sky-400" />
              Editable Size & Flight Dimensions
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Width (ft)</span>
                <input
                  type="number"
                  step="0.1"
                  min="3"
                  max="20"
                  value={stairWidthFt}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStairWidthFt(val);
                    applyStaircaseUpdate({ dimensionsMm: { width: ftToMm(val), length: ftToMm(stairLengthFt) } });
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Length (ft)</span>
                <input
                  type="number"
                  step="0.1"
                  min="4"
                  max="25"
                  value={stairLengthFt}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStairLengthFt(val);
                    applyStaircaseUpdate({ dimensionsMm: { width: ftToMm(stairWidthFt), length: ftToMm(val) } });
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Flight Width (ft)</span>
                <input
                  type="number"
                  step="0.1"
                  min="2.5"
                  max="6"
                  value={flightWidthFt}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFlightWidthFt(val);
                    applyStaircaseUpdate({ flightWidthMm: ftToMm(val) });
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Landing Width (ft)</span>
                <input
                  type="number"
                  step="0.1"
                  min="2.5"
                  max="6"
                  value={landingWidthFt}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLandingWidthFt(val);
                    applyStaircaseUpdate({ landingWidthMm: ftToMm(val) });
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Step Count and NBC Riser/Tread Display */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Steps (Risers):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="14"
                    max="24"
                    step="2"
                    value={stepCount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setStepCount(val);
                      applyStaircaseUpdate({ stepCount: val });
                    }}
                    className="w-24 accent-sky-500"
                  />
                  <span className="font-mono text-white font-bold">{stepCount}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-900/60 text-[10px] font-mono">
                <div>
                  <span className="text-slate-500 block">Riser Height</span>
                  <span className={actualRiser <= 190 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {actualRiser} mm ({actualRiser <= 190 ? 'NBC Pass' : 'Warning'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tread Depth</span>
                  <span className={actualTread >= 250 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {actualTread} mm ({actualTread >= 250 ? 'NBC Pass' : 'Warning'})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Terrace Continuation Toggle */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-white block">Terrace / Future Floors</span>
              <span className="text-[10px] text-slate-400 font-mono">Extend staircase to top roof</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !continuesUp;
                setContinuesUp(nextVal);
                applyStaircaseUpdate({ continuesUp: nextVal });
              }}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                continuesUp
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {continuesUp ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: 2. Room Inspector Active
  // -------------------------------------------------------------------------
  if (selectedRoom) {
    return (
      <div className="h-full flex flex-col p-4 bg-slate-900/90 border-l border-slate-800 text-slate-100 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Room Inspector</h2>
          </div>
          <Badge variant="info">{selectedRoom.type}</Badge>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Room Name</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onBlur={() => applyParametricUpdate()}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Width (ft)</label>
              <input
                type="number"
                step="0.5"
                value={widthFt}
                onChange={(e) => setWidthFt(Number(e.target.value))}
                onBlur={() => applyParametricUpdate(posXFt, posYFt, widthFt, lengthFt)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Length (ft)</label>
              <input
                type="number"
                step="0.5"
                value={lengthFt}
                onChange={(e) => setLengthFt(Number(e.target.value))}
                onBlur={() => applyParametricUpdate(posXFt, posYFt, widthFt, lengthFt)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Position X (ft)</label>
              <input
                type="number"
                step="0.5"
                value={posXFt}
                onChange={(e) => setPosXFt(Number(e.target.value))}
                onBlur={() => applyParametricUpdate(posXFt, posYFt, widthFt, lengthFt)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Position Y (ft)</label>
              <input
                type="number"
                step="0.5"
                value={posYFt}
                onChange={(e) => setPosYFt(Number(e.target.value))}
                onBlur={() => applyParametricUpdate(posXFt, posYFt, widthFt, lengthFt)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
              Quick Vastu & Zone Placement:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => relocateToZone('NE')}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-left font-mono text-[11px]"
              >
                ↗️ North-East (Ishanya)
              </button>
              <button
                type="button"
                onClick={() => relocateToZone('SE')}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-left font-mono text-[11px]"
              >
                ↘️ South-East (Agni)
              </button>
              <button
                type="button"
                onClick={() => relocateToZone('SW')}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-left font-mono text-[11px]"
              >
                ↙️ South-West (Nairutya)
              </button>
              <button
                type="button"
                onClick={() => relocateToZone('NW')}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-left font-mono text-[11px]"
              >
                ↖️ North-West (Vayavya)
              </button>
              <button
                type="button"
                onClick={() => relocateToZone('CENTER')}
                className="col-span-2 p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-center font-mono text-[11px]"
              >
                🎯 Center Room
              </button>
            </div>
          </div>

          {onDeleteRoom && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${selectedRoom.name}?`)) {
                    onDeleteRoom(selectedRoom.id);
                  }
                }}
                className="w-full border-rose-900/50 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete Room
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: 3. Default: Floor & Overall Building Statement
  // -------------------------------------------------------------------------
  const plotW = model.site.dimensionsMm.width;
  const plotL = model.site.dimensionsMm.length;
  const calcs = model.calculations;

  return (
    <div className="h-full flex flex-col p-4 bg-slate-900/90 border-l border-slate-800 text-slate-100 overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
          <Building className="h-3.5 w-3.5" />
          Building Area Statement
        </span>
        <Badge variant={model.validation.overallStatus === 'PASS' ? 'success' : 'warning'}>
          {model.validation.overallStatus}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Staircase Quick Edit Card */}
        {model.staircases && model.staircases.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-sky-800/40 shadow-md space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-sky-400" />
                Staircase Vertical Core
              </span>
              <Badge variant="info">
                {model.staircases[0]?.type || 'DOG_LEGGED_U'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Position: {(model.staircases[0].startPoint.x / 304.8).toFixed(1)}' X, {(model.staircases[0].startPoint.y / 304.8).toFixed(1)}' Y • Size: {(model.staircases[0].dimensionsMm.width / 304.8).toFixed(1)}' × {(model.staircases[0].dimensionsMm.length / 304.8).toFixed(1)}'
            </p>
            <Button
              size="sm"
              onClick={() => onSelectStaircase?.(model.staircases[0])}
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold py-1.5"
            >
              <Sliders className="h-3.5 w-3.5 mr-1.5" />
              Edit Staircase Place, Size & Shape
            </Button>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Plot Size</span>
            <span className="text-slate-200 font-bold">{formatLength(plotW)} × {formatLength(plotL)}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Plot Area</span>
            <span className="text-slate-200 font-bold">{formatArea(calcs.plotAreaSqm, 'sqft')}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Ground Coverage</span>
            <span className="text-sky-400 font-bold">{formatArea(calcs.groundCoverageSqm, 'sqft')}</span>
            <span className="text-slate-500 text-[10px] block font-normal">{(calcs.groundCoverageRatio * 100).toFixed(1)}% (Max 65%)</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Total Built-Up</span>
            <span className="text-emerald-400 font-bold">{formatArea(calcs.totalBuiltUpAreaSqm, 'sqft')}</span>
          </div>
        </div>

        {/* Room Allocations */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono">
          <span className="text-slate-400 uppercase text-[10px] block tracking-wider font-bold">Room Allocation Summary</span>
          <div className="flex justify-between text-slate-300">
            <span>Ground Bedrooms:</span>
            <span className="font-bold text-white">
              {model.levels[0]?.rooms.filter(r => r.type === 'BEDROOM' || r.type === 'MASTER_BEDROOM').length || 2}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>First Floor Bedrooms:</span>
            <span className="font-bold text-white">
              {model.levels[1]?.rooms.filter(r => r.type === 'BEDROOM' || r.type === 'MASTER_BEDROOM').length || 2}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Allocated Car Parking:</span>
            <span className="font-bold text-sky-400">
              {model.parkingSpaces.length} Car Bay
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Future Floor Intent:</span>
            <span className="text-amber-300 font-bold">
              {model.futureFloors.planned ? 'Yes (Staircase Continued)' : 'No'}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 italic">
          Tip: Click any room or staircase on the 2D canvas to inspect and modify its dimensions and location.
        </p>
      </div>
    </div>
  );
};
