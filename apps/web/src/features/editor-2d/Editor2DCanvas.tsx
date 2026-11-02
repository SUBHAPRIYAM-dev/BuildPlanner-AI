import React, { useRef, useState, useEffect, MouseEvent, WheelEvent } from 'react';
import {
  BuildingModel,
  RoomModel,
  WallModel,
  DoorModel,
  WindowModel,
  Point2D,
  LevelModel
} from '@buildplanner/building-model';
import { useEditorStore } from '../../stores/editorStore';
import { formatLength, formatArea, ftToMm } from '@buildplanner/units';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  MousePointer,
  Grid,
  Plus,
  Trash2,
  RotateCcw,
  Copy,
  ChevronDown,
  X
} from 'lucide-react';

import { generateWallsFromRooms } from '@buildplanner/geometry-engine';

interface Editor2DCanvasProps {
  model: BuildingModel;
  selectedRoom?: RoomModel | null;
  onSelectRoom?: (room: RoomModel | null) => void;
  onModelChange?: (updated: BuildingModel) => void;
  onDeleteRoom?: (roomId: string) => void;
}

const ROOM_PRESETS = [
  { name: 'Master Bedroom', type: 'MASTER_BEDROOM' as const, widthFt: 12, lengthFt: 14, zone: 'PRIVATE' as const },
  { name: 'Bedroom', type: 'BEDROOM' as const, widthFt: 11, lengthFt: 12, zone: 'PRIVATE' as const },
  { name: 'Living Room', type: 'LIVING' as const, widthFt: 14, lengthFt: 16, zone: 'PUBLIC' as const },
  { name: 'Kitchen', type: 'KITCHEN' as const, widthFt: 9, lengthFt: 11, zone: 'PRIVATE' as const },
  { name: 'Dining Room', type: 'DINING' as const, widthFt: 10, lengthFt: 12, zone: 'PUBLIC' as const },
  { name: 'Attached Bath', type: 'BATHROOM_ATTACHED' as const, widthFt: 5, lengthFt: 7, zone: 'SERVICE' as const },
  { name: 'Common Toilet', type: 'BATHROOM_COMMON' as const, widthFt: 5, lengthFt: 6, zone: 'SERVICE' as const },
  { name: 'Balcony', type: 'BALCONY' as const, widthFt: 5, lengthFt: 10, zone: 'OUTDOOR' as const },
  { name: 'Puja Room', type: 'PUJA' as const, widthFt: 5, lengthFt: 5, zone: 'PRIVATE' as const },
  { name: 'Study / Office', type: 'STUDY' as const, widthFt: 9, lengthFt: 10, zone: 'PRIVATE' as const }
];

export const Editor2DCanvas: React.FC<Editor2DCanvasProps> = ({
  model,
  selectedRoom,
  onSelectRoom,
  onModelChange,
  onDeleteRoom
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasDraggedRef = useRef<boolean>(false);

  const {
    activeLevelIndex,
    activeTool,
    setActiveTool,
    selectedId,
    setSelectedEntity,
    zoom,
    setZoom,
    pan,
    setPan
  } = useEditorStore();

  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Drag-to-Move room state
  const [draggingRoom, setDraggingRoom] = useState<RoomModel | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ clientX: number; clientY: number; originX: number; originY: number } | null>(null);

  const plotW = model.site.dimensionsMm.width;
  const plotL = model.site.dimensionsMm.length;

  const isBasement = activeLevelIndex === -1;
  const basementEnvelopeW = plotW - model.site.setbacksMm.side1 - model.site.setbacksMm.side2;
  const basementEnvelopeL = plotL - model.site.setbacksMm.front - model.site.setbacksMm.rear;

  const basementLevel: LevelModel = {
    id: 'lvl_basement',
    name: 'Basement Parking',
    levelIndex: -1,
    elevationMm: -3000,
    heightMm: 3000,
    rooms: [
      {
        id: 'room_basement_envelope',
        name: 'Basement Parking & Storage Area',
        type: 'CORRIDOR',
        levelIndex: -1,
        polygon: [
          { x: model.site.setbacksMm.side1, y: model.site.setbacksMm.front },
          { x: model.site.setbacksMm.side1 + basementEnvelopeW, y: model.site.setbacksMm.front },
          { x: model.site.setbacksMm.side1 + basementEnvelopeW, y: model.site.setbacksMm.front + basementEnvelopeL },
          { x: model.site.setbacksMm.side1, y: model.site.setbacksMm.front + basementEnvelopeL }
        ],
        bounds: {
          minX: model.site.setbacksMm.side1,
          minY: model.site.setbacksMm.front,
          maxX: model.site.setbacksMm.side1 + basementEnvelopeW,
          maxY: model.site.setbacksMm.front + basementEnvelopeL,
          widthMm: basementEnvelopeW,
          lengthMm: basementEnvelopeL
        },
        areaSqm: Number(((basementEnvelopeW * basementEnvelopeL) / 1_000_000).toFixed(2)),
        zone: 'SERVICE'
      }
    ],
    walls: [],
    doors: [],
    windows: []
  };

  const level = model.levels.find(l => l.levelIndex === activeLevelIndex) || (isBasement ? basementLevel : model.levels[0]);

  const pad = 2000;
  const viewBoxW = plotW + pad * 2;
  const viewBoxL = plotL + pad * 2;

  // Keyboard Shortcuts: Delete, Escape, V, H, G
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedId || selectedRoom)) {
        const idToDelete = selectedRoom?.id || selectedId;
        if (idToDelete) {
          handleDeleteRoomById(idToDelete);
        }
      } else if (e.key === 'Escape') {
        setSelectedEntity(null, null);
        onSelectRoom?.(null);
        setIsAddMenuOpen(false);
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('SELECT');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('PAN');
      } else if (e.key === 'g' || e.key === 'G') {
        setShowGrid(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedRoom, setActiveTool]);

  // Zoom controls
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(Math.max(0.3, Math.min(zoom + delta, 4.0)));
  };

  // Pan & Drag controls
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || activeTool === 'PAN' || e.shiftKey) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    } else if (draggingRoom && dragStartPos && containerRef.current) {
      hasDraggedRef.current = true;
      const containerRect = containerRef.current.getBoundingClientRect();
      const svgScale = (viewBoxW / containerRect.width) / (zoom || 1);

      const dxMm = Math.round((e.clientX - dragStartPos.clientX) * svgScale);
      const dyMm = Math.round((e.clientY - dragStartPos.clientY) * svgScale);

      const newMinX = Math.max(0, dragStartPos.originX + dxMm);
      const newMinY = Math.max(0, dragStartPos.originY + dyMm);
      const w = draggingRoom.bounds.widthMm;
      const l = draggingRoom.bounds.lengthMm;

      const updatedRoom: RoomModel = {
        ...draggingRoom,
        bounds: {
          minX: newMinX,
          minY: newMinY,
          maxX: newMinX + w,
          maxY: newMinY + l,
          widthMm: w,
          lengthMm: l
        },
        polygon: [
          { x: newMinX, y: newMinY },
          { x: newMinX + w, y: newMinY },
          { x: newMinX + w, y: newMinY + l },
          { x: newMinX, y: newMinY + l }
        ]
      };

      onSelectRoom?.(updatedRoom);
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingRoom && dragStartPos && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const svgScale = (viewBoxW / containerRect.width) / (zoom || 1);
      const dxMm = Math.round((e.clientX - dragStartPos.clientX) * svgScale);
      const dyMm = Math.round((e.clientY - dragStartPos.clientY) * svgScale);

      if (Math.abs(dxMm) > 20 || Math.abs(dyMm) > 20) {
        const newMinX = Math.max(0, dragStartPos.originX + dxMm);
        const newMinY = Math.max(0, dragStartPos.originY + dyMm);
        const w = draggingRoom.bounds.widthMm;
        const l = draggingRoom.bounds.lengthMm;

        const updatedRoom: RoomModel = {
          ...draggingRoom,
          bounds: {
            minX: newMinX,
            minY: newMinY,
            maxX: newMinX + w,
            maxY: newMinY + l,
            widthMm: w,
            lengthMm: l
          },
          polygon: [
            { x: newMinX, y: newMinY },
            { x: newMinX + w, y: newMinY },
            { x: newMinX + w, y: newMinY + l },
            { x: newMinX, y: newMinY + l }
          ]
        };

        const nextModel: BuildingModel = JSON.parse(JSON.stringify(model));
        const lvl = nextModel.levels.find(l => l.levelIndex === activeLevelIndex);
        if (lvl) {
          const rIdx = lvl.rooms.findIndex(r => r.id === draggingRoom.id);
          if (rIdx !== -1) {
            lvl.rooms[rIdx] = updatedRoom;
            lvl.walls = generateWallsFromRooms(lvl.rooms, lvl.levelIndex);
          }
        }
        onModelChange?.(nextModel);
        setSelectedEntity(updatedRoom.id, 'ROOM');
        onSelectRoom?.(updatedRoom);
      }
    }
    setIsPanning(false);
    setDraggingRoom(null);
    setDragStartPos(null);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleRoomMouseDown = (e: MouseEvent, room: RoomModel) => {
    e.stopPropagation();
    hasDraggedRef.current = false;
    if (activeTool === 'SELECT') {
      setSelectedEntity(room.id, 'ROOM');
      onSelectRoom?.(room);
      setDraggingRoom(room);
      setDragStartPos({
        clientX: e.clientX,
        clientY: e.clientY,
        originX: room.bounds.minX,
        originY: room.bounds.minY
      });
    }
  };

  const handleRoomClick = (e: MouseEvent, room: RoomModel) => {
    e.stopPropagation();
    setSelectedEntity(room.id, 'ROOM');
    onSelectRoom?.(room);
  };

  const handleCanvasBackgroundClick = () => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    setSelectedEntity(null, null);
    onSelectRoom?.(null);
    setIsAddMenuOpen(false);
  };

  const handleAddPresetRoom = (preset: typeof ROOM_PRESETS[0]) => {
    const nextModel: BuildingModel = JSON.parse(JSON.stringify(model));
    const lvl = nextModel.levels.find(l => l.levelIndex === activeLevelIndex) || nextModel.levels[0];
    if (!lvl) return;

    const widthMm = ftToMm(preset.widthFt);
    const lengthMm = ftToMm(preset.lengthFt);

    // Position room inside setbacks without overlapping parking
    const frontSb = (activeLevelIndex === 0 && (model.parkingSpaces || []).length > 0) ? 5300 : model.site.setbacksMm.front + 200;
    const sideSb = model.site.setbacksMm.side1 + 200;
    const offsetIdx = lvl.rooms.length % 4;
    const originX = sideSb + offsetIdx * 500;
    const originY = frontSb + offsetIdx * 500;

    const newRoom: RoomModel = {
      id: `room_${preset.type.toLowerCase()}_${Date.now()}`,
      name: `${preset.name} ${lvl.rooms.filter(r => r.type === preset.type).length + 1}`,
      type: preset.type,
      levelIndex: activeLevelIndex,
      polygon: [
        { x: originX, y: originY },
        { x: originX + widthMm, y: originY },
        { x: originX + widthMm, y: originY + lengthMm },
        { x: originX, y: originY + lengthMm }
      ],
      bounds: {
        minX: originX,
        minY: originY,
        maxX: originX + widthMm,
        maxY: originY + lengthMm,
        widthMm,
        lengthMm
      },
      areaSqm: Number(((widthMm * lengthMm) / 1_000_000).toFixed(2)),
      zone: preset.zone
    };

    lvl.rooms.push(newRoom);
    lvl.walls = generateWallsFromRooms(lvl.rooms, lvl.levelIndex);

    onModelChange?.(nextModel);
    setSelectedEntity(newRoom.id, 'ROOM');
    onSelectRoom?.(newRoom);
    setIsAddMenuOpen(false);
  };

  const handleDeleteRoomById = (roomId: string) => {
    if (onDeleteRoom) {
      onDeleteRoom(roomId);
    } else {
      const nextModel: BuildingModel = JSON.parse(JSON.stringify(model));
      const lvl = nextModel.levels.find(l => l.levelIndex === activeLevelIndex);
      if (lvl) {
        lvl.rooms = lvl.rooms.filter(r => r.id !== roomId);
        lvl.walls = generateWallsFromRooms(lvl.rooms, lvl.levelIndex);
        onModelChange?.(nextModel);
      }
      setSelectedEntity(null, null);
      onSelectRoom?.(null);
    }
  };

  const handleRotateSelectedRoom = () => {
    const curRoom = selectedRoom || level.rooms.find(r => r.id === selectedId);
    if (!curRoom) return;

    const nextModel: BuildingModel = JSON.parse(JSON.stringify(model));
    const lvl = nextModel.levels.find(l => l.levelIndex === activeLevelIndex);
    if (!lvl) return;

    const rIdx = lvl.rooms.findIndex(r => r.id === curRoom.id);
    if (rIdx === -1) return;

    const oldW = curRoom.bounds.widthMm;
    const oldL = curRoom.bounds.lengthMm;
    const newW = oldL;
    const newL = oldW;
    const minX = curRoom.bounds.minX;
    const minY = curRoom.bounds.minY;

    const updatedRoom: RoomModel = {
      ...curRoom,
      bounds: {
        minX,
        minY,
        maxX: minX + newW,
        maxY: minY + newL,
        widthMm: newW,
        lengthMm: newL
      },
      polygon: [
        { x: minX, y: minY },
        { x: minX + newW, y: minY },
        { x: minX + newW, y: minY + newL },
        { x: minX, y: minY + newL }
      ]
    };

    lvl.rooms[rIdx] = updatedRoom;
    lvl.walls = generateWallsFromRooms(lvl.rooms, lvl.levelIndex);

    onModelChange?.(nextModel);
    setSelectedEntity(updatedRoom.id, 'ROOM');
    onSelectRoom?.(updatedRoom);
  };

  const activeSelected = selectedRoom || level.rooms.find(r => r.id === selectedId);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 select-none overflow-hidden cursor-crosshair"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasBackgroundClick}
    >
      {/* Floating Canvas Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-xl">
        <button
          onClick={() => setActiveTool('SELECT')}
          className={`p-2 rounded-lg transition-colors ${
            activeTool === 'SELECT'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Select / Move Room (V)"
        >
          <MousePointer className="h-4 w-4" />
        </button>

        <button
          onClick={() => setActiveTool('PAN')}
          className={`p-2 rounded-lg transition-colors ${
            activeTool === 'PAN'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Pan Canvas (H)"
        >
          <Move className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-800 mx-1" />

        {/* Add Room Dropdown Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAddMenuOpen(!isAddMenuOpen);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/40 text-xs font-bold transition-all"
            title="Add a New Room to This Floor"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Room</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* Preset Rooms Menu */}
          {isAddMenuOpen && (
            <div
              className="absolute left-0 top-full mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 text-xs font-mono space-y-1 animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Select Room Type:
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {ROOM_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddPresetRoom(preset)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-sky-500/20 hover:text-sky-300 flex items-center justify-between transition-colors"
                  >
                    <span>{preset.name}</span>
                    <span className="text-[10px] text-slate-500">{preset.widthFt}'×{preset.lengthFt}'</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions for Selected Room */}
        {activeSelected && (
          <>
            <div className="w-[1px] h-5 bg-slate-800 mx-1" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRotateSelectedRoom();
              }}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Rotate Room (Swap Width & Length)"
            >
              <RotateCcw className="h-4 w-4 text-sky-400" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteRoomById(activeSelected.id);
              }}
              className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/60 transition-colors"
              title="Delete Selected Room (Del / Backspace)"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}

        <div className="w-[1px] h-5 bg-slate-800 mx-1" />

        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded-lg transition-colors ${
            showGrid ? 'text-sky-400 bg-sky-950/40' : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Grid (G)"
        >
          <Grid className="h-4 w-4" />
        </button>
      </div>

      {/* Floating Zoom Controls (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl text-xs font-mono">
        <button
          onClick={() => setZoom(Math.max(0.3, zoom - 0.2))}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="px-2 font-bold text-slate-300 min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(Math.min(4.0, zoom + 0.2))}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 ml-1"
          title="Fit to Screen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* SVG Canvas Root */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center'
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`${-pad} ${-pad} ${viewBoxW} ${viewBoxL}`}
          className="w-full h-full pointer-events-auto"
          style={{ maxWidth: '1000px', maxHeight: '900px' }}
        >
          <defs>
            {showGrid && (
              <pattern id="canvas-grid" width="1000" height="1000" patternUnits="userSpaceOnUse">
                <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="#1e293b" strokeWidth="15" />
              </pattern>
            )}
          </defs>

          {/* Grid */}
          {showGrid && (
            <rect x={-pad} y={-pad} width={viewBoxW} height={viewBoxL} fill="url(#canvas-grid)" />
          )}

          {/* Site Boundary (30x40 ft Plot) */}
          <rect
            x={0}
            y={0}
            width={plotW}
            height={plotL}
            fill="#090d16"
            stroke="#38bdf8"
            strokeWidth={50}
            strokeDasharray="200,100"
          />

          {/* Setback Envelope */}
          <rect
            x={model.site.setbacksMm.side1}
            y={model.site.setbacksMm.front}
            width={plotW - model.site.setbacksMm.side1 - model.site.setbacksMm.side2}
            height={plotL - model.site.setbacksMm.front - model.site.setbacksMm.rear}
            fill="#0f172a"
            stroke="#64748b"
            strokeWidth={30}
            strokeDasharray="80,50"
            opacity={0.7}
          />

          {/* Abutting Roads */}
          {model.site.roads.NORTH.enabled && (
            <g className="pointer-events-none">
              <rect x={0} y={-1000} width={plotW} height={800} fill="#1e293b" stroke="#475569" strokeWidth={30} />
              <text x={plotW / 2} y={-520} fill="#94a3b8" fontSize={220} textAnchor="middle" fontWeight="bold">
                NORTH ROAD ({formatLength(model.site.roads.NORTH.widthMm)} WIDE)
              </text>
            </g>
          )}
          {model.site.roads.WEST.enabled && (
            <g className="pointer-events-none">
              <rect x={-1000} y={0} width={800} height={plotL} fill="#1e293b" stroke="#475569" strokeWidth={30} />
              <text
                x={-600}
                y={plotL / 2}
                fill="#94a3b8"
                fontSize={220}
                textAnchor="middle"
                fontWeight="bold"
                transform={`rotate(-90 -600 ${plotL / 2})`}
              >
                WEST ROAD ({formatLength(model.site.roads.WEST.widthMm)} WIDE)
              </text>
            </g>
          )}

          {/* Parking Spaces (ONLY Ground Level 0 or Basement -1, NEVER upper floors) */}
          {(model.parkingSpaces || [])
            .filter((park) => {
              if (park.location === 'BASEMENT_UNDERGROUND') {
                return activeLevelIndex === -1;
              }
              return activeLevelIndex === 0;
            })
            .map((park, idx) => {
              const px = park.positionMm.x;
              const py = park.positionMm.y;
              const pw = park.dimensionsMm.width;
              const pl = park.dimensionsMm.length;

              return (
                <g key={park.id} className="parking-bay select-none">
                  {/* Heavy Duty Asphalt / Concrete Parking Pad */}
                  <rect
                    x={px}
                    y={py}
                    width={pw}
                    height={pl}
                    fill="#0a192f"
                    stroke="#0ea5e9"
                    strokeWidth={50}
                    rx={60}
                  />

                  {/* High-visibility yellow safety stall stripes */}
                  <line x1={px + 40} y1={py} x2={px + 40} y2={py + pl} stroke="#facc15" strokeWidth={40} strokeDasharray="120,60" />
                  <line x1={px + pw - 40} y1={py} x2={px + pw - 40} y2={py + pl} stroke="#facc15" strokeWidth={40} strokeDasharray="120,60" />
                  <line x1={px} y1={py + 40} x2={px + pw} y2={py + 40} stroke="#facc15" strokeWidth={40} />

                  {/* Concrete Wheel Stop / Curb Bumper */}
                  <rect
                    x={px + 300}
                    y={py + 300}
                    width={pw - 600}
                    height={180}
                    rx={40}
                    fill="#e2e8f0"
                    stroke="#94a3b8"
                    strokeWidth={20}
                  />
                  <text x={px + pw / 2} y={py + 420} fill="#475569" fontSize={110} fontWeight="bold" textAnchor="middle">
                    WHEEL STOP
                  </text>

                  {/* Stylized Overhead Car Graphic */}
                  <g transform={`translate(${px + pw / 2}, ${py + pl / 2 + 100})`}>
                    {/* Car Body Outer Shell */}
                    <rect
                      x={-900}
                      y={-1700}
                      width={1800}
                      height={3400}
                      rx={380}
                      fill="#0284c7"
                      fillOpacity={0.45}
                      stroke="#38bdf8"
                      strokeWidth={35}
                    />

                    {/* Windshield Front */}
                    <path
                      d="M -650 -700 Q 0 -900 650 -700 L 550 -1200 Q 0 -1300 -550 -1200 Z"
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth={25}
                    />

                    {/* Windshield Rear */}
                    <path
                      d="M -600 800 Q 0 950 600 800 L 520 1200 Q 0 1300 -520 1200 Z"
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth={25}
                    />

                    {/* Side Windows */}
                    <rect x={-750} y={-600} width={100} height={1300} rx={40} fill="#0f172a" stroke="#38bdf8" strokeWidth={15} />
                    <rect x={650} y={-600} width={100} height={1300} rx={40} fill="#0f172a" stroke="#38bdf8" strokeWidth={15} />

                    {/* Roof Panel */}
                    <rect x={-550} y={-600} width={1100} height={1300} rx={120} fill="#0369a1" fillOpacity={0.6} stroke="#38bdf8" strokeWidth={20} />

                    {/* Headlights (Front / Top) */}
                    <circle cx={-620} cy={-1600} r={100} fill="#fef08a" stroke="#eab308" strokeWidth={20} />
                    <circle cx={620} cy={-1600} r={100} fill="#fef08a" stroke="#eab308" strokeWidth={20} />

                    {/* Taillights (Rear / Bottom) */}
                    <rect x={-700} y={1600} width={220} height={70} rx={25} fill="#ef4444" stroke="#b91c1c" strokeWidth={15} />
                    <rect x={480} y={1600} width={220} height={70} rx={25} fill="#ef4444" stroke="#b91c1c" strokeWidth={15} />

                    {/* Side Mirrors */}
                    <rect x={-980} y={-900} width={120} height={200} rx={40} fill="#38bdf8" />
                    <rect x={860} y={-900} width={120} height={200} rx={40} fill="#38bdf8" />
                  </g>

                  {/* Header Badge */}
                  <rect
                    x={px + 200}
                    y={py + pl - 680}
                    width={pw - 400}
                    height={220}
                    rx={60}
                    fill="#0284c7"
                    stroke="#38bdf8"
                    strokeWidth={25}
                  />
                  <text
                    x={px + pw / 2}
                    y={py + pl - 525}
                    fill="#ffffff"
                    fontSize={170}
                    fontWeight="900"
                    textAnchor="middle"
                    letterSpacing="10"
                  >
                    🚗 CAR PARKING BAY {park.slotNumber || idx + 1}
                  </text>

                  {/* Location Tag */}
                  <text
                    x={px + pw / 2}
                    y={py + pl - 340}
                    fill="#38bdf8"
                    fontSize={140}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {park.location === 'BASEMENT_UNDERGROUND' ? 'UNDERGROUND BASEMENT LEVEL (-1)' : (park.location === 'STILT' ? 'GROUND STILT PARKING' : 'GROUND SURFACE PORCH')}
                  </text>

                  {/* Dimensions */}
                  <text
                    x={px + pw / 2}
                    y={py + pl - 180}
                    fill="#94a3b8"
                    fontSize={130}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {formatLength(pw)} × {formatLength(pl)} (Standard Bay)
                  </text>
                </g>
              );
            })}

          {/* If parking is in basement and user is viewing Ground Floor, show helpful Basement Ramp Access notice */}
          {activeLevelIndex === 0 && (model.parkingSpaces || []).some(p => p.location === 'BASEMENT_UNDERGROUND') && (
            <g className="basement-ramp-guide pointer-events-none">
              <rect
                x={300}
                y={0}
                width={Math.min(5200, plotW - 600)}
                height={4800}
                fill="#0f172a"
                stroke="#6366f1"
                strokeWidth={40}
                strokeDasharray="100,50"
                rx={60}
              />
              <text x={300 + Math.min(5200, plotW - 600) / 2} y={2000} fill="#a5b4fc" fontSize={180} fontWeight="bold" textAnchor="middle">
                ⬇️ UNDERGROUND BASEMENT PARKING RAMP
              </text>
              <text x={300 + Math.min(5200, plotW - 600) / 2} y={2350} fill="#818cf8" fontSize={140} textAnchor="middle">
                Allocated below Ground Floor (Elevation -3.00m)
              </text>
              <text x={300 + Math.min(5200, plotW - 600) / 2} y={2700} fill="#cbd5e1" fontSize={130} fontWeight="bold" textAnchor="middle">
                Click "Basement (L-1)" in the bottom bar to view basement plan
              </text>
            </g>
          )}

          {/* Room Polygons & Fills */}
          {level.rooms.map((room) => {
            const isSelected = selectedId === room.id || selectedRoom?.id === room.id;
            const box = room.bounds;

            const zoneFills: Record<string, string> = {
              PUBLIC: 'rgba(14, 165, 233, 0.15)',
              PRIVATE: 'rgba(99, 102, 241, 0.15)',
              SERVICE: 'rgba(234, 179, 8, 0.15)',
              OUTDOOR: 'rgba(16, 185, 129, 0.15)'
            };
            const fill = isSelected ? 'rgba(56, 189, 248, 0.35)' : (zoneFills[room.zone] || 'rgba(14, 165, 233, 0.15)');

            return (
              <g
                key={room.id}
                onMouseDown={(e) => handleRoomMouseDown(e, room)}
                onClick={(e) => handleRoomClick(e, room)}
                className="cursor-pointer group"
              >
                <rect
                  x={box.minX}
                  y={box.minY}
                  width={box.widthMm}
                  height={box.lengthMm}
                  fill={fill}
                  stroke={isSelected ? '#38bdf8' : 'none'}
                  strokeWidth={isSelected ? 60 : 0}
                  className="transition-all"
                />

                {/* Selected Indicator Outline */}
                {isSelected && (
                  <rect
                    x={box.minX - 30}
                    y={box.minY - 30}
                    width={box.widthMm + 60}
                    height={box.lengthMm + 60}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={40}
                    strokeDasharray="120,60"
                    className="animate-pulse"
                  />
                )}

                {/* Room Names and Dimensions Text */}
                <text
                  x={box.minX + box.widthMm / 2}
                  y={box.minY + box.lengthMm / 2 - 80}
                  fill="#ffffff"
                  fontSize={180}
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {room.name.toUpperCase()}
                </text>
                <text
                  x={box.minX + box.widthMm / 2}
                  y={box.minY + box.lengthMm / 2 + 120}
                  fill="#94a3b8"
                  fontSize={140}
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {formatLength(box.widthMm)} × {formatLength(box.lengthMm)}
                </text>
                <text
                  x={box.minX + box.widthMm / 2}
                  y={box.minY + box.lengthMm / 2 + 290}
                  fill="#38bdf8"
                  fontSize={130}
                  fontWeight="600"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {formatArea(room.areaSqm, 'sqft')}
                </text>
              </g>
            );
          })}

          {/* Staircase Core (Supports U-Shape, Straight & L-Shaped) */}
          {model.staircases.map((stair) => {
            const sx = stair.startPoint.x;
            const sy = stair.startPoint.y;
            const sw = stair.dimensionsMm.width;
            const sl = stair.dimensionsMm.length;
            const type = stair.type || 'DOG_LEGGED_U';

            return (
              <g key={stair.id} className="staircase-entity pointer-events-none">
                <rect x={sx} y={sy} width={sw} height={sl} fill="#0f172a" stroke="#38bdf8" strokeWidth={40} />

                {type === 'DOG_LEGGED_U' && (
                  <g>
                    {Array.from({ length: 9 }).map((_, i) => {
                      const stepY = sy + i * ((sl - stair.landingWidthMm) / 9);
                      return (
                        <g key={i}>
                          <line x1={sx} y1={stepY} x2={sx + sw / 2 - 50} y2={stepY} stroke="#94a3b8" strokeWidth={25} />
                          <line x1={sx + sw / 2 + 50} y1={stepY} x2={sx + sw} y2={stepY} stroke="#94a3b8" strokeWidth={25} />
                        </g>
                      );
                    })}
                    <line x1={sx} y1={sy + sl - stair.landingWidthMm} x2={sx + sw} y2={sy + sl - stair.landingWidthMm} stroke="#ffffff" strokeWidth={40} />
                    <text x={sx + sw / 2} y={sy + sl - stair.landingWidthMm / 2 + 40} fill="#cbd5e1" fontSize={140} textAnchor="middle">
                      LANDING (U-SHAPE)
                    </text>
                  </g>
                )}

                {type === 'STRAIGHT' && (
                  <g>
                    {Array.from({ length: 14 }).map((_, i) => {
                      const stepY = sy + i * (sl / 14);
                      return (
                        <line key={i} x1={sx} y1={stepY} x2={sx + sw} y2={stepY} stroke="#94a3b8" strokeWidth={25} />
                      );
                    })}
                    <text x={sx + sw / 2} y={sy + sl / 2} fill="#cbd5e1" fontSize={140} textAnchor="middle">
                      STRAIGHT FLIGHT
                    </text>
                  </g>
                )}

                {type === 'L_SHAPED' && (
                  <g>
                    {Array.from({ length: 8 }).map((_, i) => {
                      const stepY = sy + i * ((sl - stair.landingWidthMm) / 8);
                      return (
                        <line key={i} x1={sx} y1={stepY} x2={sx + sw} y2={stepY} stroke="#94a3b8" strokeWidth={25} />
                      );
                    })}
                    <rect x={sx} y={sy + sl - stair.landingWidthMm} width={stair.landingWidthMm} height={stair.landingWidthMm} fill="#1e293b" stroke="#ffffff" strokeWidth={30} />
                    <text x={sx + sw / 2} y={sy + sl - stair.landingWidthMm / 2} fill="#cbd5e1" fontSize={140} textAnchor="middle">
                      CORNER LANDING (L-SHAPE)
                    </text>
                  </g>
                )}

                <text x={sx + sw / 4} y={sy + 120} fill="#38bdf8" fontSize={130} fontWeight="bold" textAnchor="middle">
                  UP
                </text>
              </g>
            );
          })}

          {/* Walls */}
          {level.walls.map((wall) => (
            <line
              key={wall.id}
              x1={wall.startPoint.x}
              y1={wall.startPoint.y}
              x2={wall.endPoint.x}
              y2={wall.endPoint.y}
              stroke={wall.isExterior ? '#ffffff' : '#94a3b8'}
              strokeWidth={wall.thicknessMm}
              strokeLinecap="square"
              className="pointer-events-none"
            />
          ))}

          {/* Doors */}
          {level.doors.map((door) => (
            <g key={door.id} className="pointer-events-none">
              <circle cx={door.positionMm.x} cy={door.positionMm.y} r={40} fill="#38bdf8" />
              <line
                x1={door.positionMm.x}
                y1={door.positionMm.y}
                x2={door.positionMm.x + door.widthMm}
                y2={door.positionMm.y}
                stroke="#e2e8f0"
                strokeWidth={40}
              />
              <path
                d={`M ${door.positionMm.x + door.widthMm} ${door.positionMm.y} A ${door.widthMm} ${door.widthMm} 0 0 1 ${door.positionMm.x} ${door.positionMm.y + door.widthMm}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={25}
                strokeDasharray="40,20"
              />
            </g>
          ))}

          {/* Windows */}
          {level.windows.map((win) => (
            <g key={win.id} className="pointer-events-none">
              <rect
                x={win.positionMm.x}
                y={win.positionMm.y - 80}
                width={win.widthMm}
                height={160}
                fill="#0284c7"
                opacity={0.4}
                stroke="#38bdf8"
                strokeWidth={30}
              />
              <line
                x1={win.positionMm.x}
                y1={win.positionMm.y}
                x2={win.positionMm.x + win.widthMm}
                y2={win.positionMm.y}
                stroke="#ffffff"
                strokeWidth={30}
              />
            </g>
          ))}

          {/* North Arrow */}
          <g transform={`translate(${plotW + 600}, 200)`} className="pointer-events-none">
            <circle cx={0} cy={0} r={320} fill="#0f172a" stroke="#38bdf8" strokeWidth={30} />
            <polygon points="0,-260 70,0 0,-50 -70,0" fill="#ef4444" />
            <polygon points="0,260 70,0 0,50 -70,0" fill="#94a3b8" />
            <text x={0} y={-310} fill="#ef4444" fontSize={200} fontWeight="bold" textAnchor="middle">N</text>
          </g>
        </svg>
      </div>
    </div>
  );
};
