import React, { useState, useEffect } from 'react';
import {
  BuildingModel,
  RoomModel
} from '@buildplanner/building-model';
import { formatLength, formatArea, ftToMm, inToMm } from '@buildplanner/units';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Maximize2,
  Layers,
  Compass,
  CheckCircle2,
  Sliders,
  Building,
  Home
} from 'lucide-react';

interface PropertyPanelProps {
  model: BuildingModel;
  selectedRoom: RoomModel | null;
  onUpdateRoom?: (updatedRoom: RoomModel) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  model,
  selectedRoom,
  onUpdateRoom
}) => {
  const [roomName, setRoomName] = useState('');
  const [widthFt, setWidthFt] = useState(0);
  const [lengthFt, setLengthFt] = useState(0);
  const [posXFt, setPosXFt] = useState(0);
  const [posYFt, setPosYFt] = useState(0);

  useEffect(() => {
    if (selectedRoom) {
      setRoomName(selectedRoom.name);
      setWidthFt(Number((selectedRoom.bounds.widthMm / 304.8).toFixed(1)));
      setLengthFt(Number((selectedRoom.bounds.lengthMm / 304.8).toFixed(1)));
      setPosXFt(Number((selectedRoom.bounds.minX / 304.8).toFixed(1)));
      setPosYFt(Number((selectedRoom.bounds.minY / 304.8).toFixed(1)));
    }
  }, [selectedRoom]);

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

    if (zone === 'NE') { // North-East (Ishanya: Top-Right)
      targetXmm = plotW - sb.side2 - roomW;
      targetYmm = sb.front;
    } else if (zone === 'SE') { // South-East (Agni: Bottom-Right)
      targetXmm = plotW - sb.side2 - roomW;
      targetYmm = plotL - sb.rear - roomL;
    } else if (zone === 'SW') { // South-West (Nairutya: Bottom-Left)
      targetXmm = sb.side1;
      targetYmm = plotL - sb.rear - roomL;
    } else if (zone === 'NW') { // North-West (Vayavya: Top-Left)
      targetXmm = sb.side1;
      targetYmm = sb.front;
    } else if (zone === 'CENTER') { // Center
      targetXmm = Math.round((plotW - roomW) / 2);
      targetYmm = Math.round((plotL - roomL) / 2);
    }

    const newXFt = Number((targetXmm / 304.8).toFixed(1));
    const newYFt = Number((targetYmm / 304.8).toFixed(1));
    setPosXFt(newXFt);
    setPosYFt(newYFt);
    applyParametricUpdate(newXFt, newYFt);
  };

  if (selectedRoom) {
    return (
      <div className="h-full flex flex-col p-4 bg-slate-900/90 border-l border-slate-800 text-slate-100 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
            Room Inspector & Vastu Adjuster
          </span>
          <Badge variant="info">{selectedRoom.type}</Badge>
        </div>

        <div className="space-y-4">
          <Input
            label="Room Label"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Room Dimensions</span>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Width"
                type="number"
                step="0.5"
                value={widthFt}
                onChange={(e) => setWidthFt(Number(e.target.value))}
                unitSuffix="ft"
              />
              <Input
                label="Length"
                type="number"
                step="0.5"
                value={lengthFt}
                onChange={(e) => setLengthFt(Number(e.target.value))}
                unitSuffix="ft"
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Position Coordinates</span>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Pos X (West -> East)"
                type="number"
                step="0.5"
                value={posXFt}
                onChange={(e) => setPosXFt(Number(e.target.value))}
                unitSuffix="ft"
              />
              <Input
                label="Pos Y (North -> South)"
                type="number"
                step="0.5"
                value={posYFt}
                onChange={(e) => setPosYFt(Number(e.target.value))}
                unitSuffix="ft"
              />
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => applyParametricUpdate()}
            className="w-full mt-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 font-bold"
          >
            Apply Position & Size Update
          </Button>

          {/* Quick Vastu Relocation Presets */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 mt-4">
            <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block tracking-wider">
              Quick Vastu / Cardinal Relocation
            </span>
            <p className="text-[11px] text-slate-400 font-mono">
              Click to instantly move room to desired Vastu zone:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                onClick={() => relocateToZone('NE')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 font-bold text-left flex items-center justify-between transition-colors"
                title="Move to North-East (Ishanya) - Ideal for Puja Room"
              >
                <span>↗️ North-East</span>
                <span className="text-[9px] opacity-70">Ishanya</span>
              </button>
              <button
                onClick={() => relocateToZone('SE')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-300 hover:bg-amber-900/60 font-bold text-left flex items-center justify-between transition-colors"
                title="Move to South-East (Agni) - Ideal for Kitchen"
              >
                <span>↘️ South-East</span>
                <span className="text-[9px] opacity-70">Agni</span>
              </button>
              <button
                onClick={() => relocateToZone('SW')}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/80 text-indigo-300 hover:bg-indigo-900/60 font-bold text-left flex items-center justify-between transition-colors"
                title="Move to South-West (Nairutya) - Ideal for Master Bedroom"
              >
                <span>↙️ South-West</span>
                <span className="text-[9px] opacity-70">Nairutya</span>
              </button>
              <button
                onClick={() => relocateToZone('NW')}
                className="px-2.5 py-1.5 rounded-lg bg-sky-950/60 border border-sky-800/80 text-sky-300 hover:bg-sky-900/60 font-bold text-left flex items-center justify-between transition-colors"
                title="Move to North-West (Vayavya) - Guest Room / Toilet"
              >
                <span>↖️ North-West</span>
                <span className="text-[9px] opacity-70">Vayavya</span>
              </button>
            </div>
            <button
              onClick={() => relocateToZone('CENTER')}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-center text-xs font-mono transition-colors"
            >
              🎯 Center of Floor Plan
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono mt-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Net Area:</span>
              <span className="text-sky-300 font-bold">{formatArea(selectedRoom.areaSqm, 'both')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Spatial Zone:</span>
              <span className="text-slate-200">{selectedRoom.zone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Level:</span>
              <span className="text-slate-200">Level {selectedRoom.levelIndex}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: Overall Building Specs Summary
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
          Tip: Click any room polygon on the 2D canvas to inspect and modify its dimensions.
        </p>
      </div>
    </div>
  );
};
