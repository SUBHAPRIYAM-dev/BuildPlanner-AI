import React, { useRef, useState, useEffect, MouseEvent, WheelEvent } from 'react';
import {
  BuildingModel,
  RoomModel,
  WallModel,
  DoorModel,
  WindowModel,
  Point2D
} from '@buildplanner/building-model';
import { useEditorStore } from '../../stores/editorStore';
import { formatLength, formatArea } from '@buildplanner/units';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  MousePointer,
  Square,
  Grid,
  Sparkles
} from 'lucide-react';

import { generateWallsFromRooms } from '@buildplanner/geometry-engine';

interface Editor2DCanvasProps {
  model: BuildingModel;
  onSelectRoom?: (room: RoomModel | null) => void;
  onModelChange?: (updated: BuildingModel) => void;
}

export const Editor2DCanvas: React.FC<Editor2DCanvasProps> = ({
  model,
  onSelectRoom,
  onModelChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Drag-to-Move room state
  const [draggingRoom, setDraggingRoom] = useState<RoomModel | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ clientX: number; clientY: number; originX: number; originY: number } | null>(null);

  const level = model.levels.find(l => l.levelIndex === activeLevelIndex) || model.levels[0];
  const plotW = model.site.dimensionsMm.width;
  const plotL = model.site.dimensionsMm.length;

  const pad = 2000;
  const viewBoxW = plotW + pad * 2;
  const viewBoxL = plotL + pad * 2;

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

      if (Math.abs(dxMm) > 30 || Math.abs(dyMm) > 30) {
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

  const handleCanvasBackgroundClick = () => {
    setSelectedEntity(null, null);
    onSelectRoom?.(null);
  };

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
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl">
        <button
          onClick={() => setActiveTool('SELECT')}
          className={`p-2 rounded-lg transition-colors ${
            activeTool === 'SELECT'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Select (V)"
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
            <g>
              <rect x={0} y={-1000} width={plotW} height={800} fill="#1e293b" stroke="#475569" strokeWidth={30} />
              <text x={plotW / 2} y={-520} fill="#94a3b8" fontSize={220} textAnchor="middle" fontWeight="bold">
                NORTH ROAD ({formatLength(model.site.roads.NORTH.widthMm)} WIDE)
              </text>
            </g>
          )}
          {model.site.roads.WEST.enabled && (
            <g>
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
          {model.parkingSpaces
            .filter((park) => {
              if (park.location === 'BASEMENT_UNDERGROUND') {
                return activeLevelIndex === -1;
              }
              return activeLevelIndex === 0;
            })
            .map((park, idx) => (
            <g key={park.id} className="parking-bay">
              <rect
                x={park.positionMm.x}
                y={park.positionMm.y}
                width={park.dimensionsMm.width}
                height={park.dimensionsMm.length}
                fill="#1e293b"
                stroke="#38bdf8"
                strokeWidth={40}
                strokeDasharray="100,50"
              />
              <rect
                x={park.positionMm.x + 300}
                y={park.positionMm.y + 400}
                width={park.dimensionsMm.width - 600}
                height={park.dimensionsMm.length - 800}
                rx={300}
                fill="#0284c7"
                opacity={0.3}
                stroke="#38bdf8"
                strokeWidth={30}
              />
              <text
                x={park.positionMm.x + park.dimensionsMm.width / 2}
                y={park.positionMm.y + park.dimensionsMm.length / 2 - 120}
                fill="#e0f2fe"
                fontSize={170}
                fontWeight="bold"
                textAnchor="middle"
              >
                CAR PARKING {park.slotNumber || idx + 1}
              </text>
              <text
                x={park.positionMm.x + park.dimensionsMm.width / 2}
                y={park.positionMm.y + park.dimensionsMm.length / 2 + 80}
                fill="#38bdf8"
                fontSize={130}
                fontWeight="600"
                textAnchor="middle"
              >
                {park.location === 'BASEMENT_UNDERGROUND' ? '(BASEMENT -1)' : '(SURFACE PORCH)'}
              </text>
              <text
                x={park.positionMm.x + park.dimensionsMm.width / 2}
                y={park.positionMm.y + park.dimensionsMm.length / 2 + 260}
                fill="#94a3b8"
                fontSize={120}
                textAnchor="middle"
              >
                {formatLength(park.dimensionsMm.width)} × {formatLength(park.dimensionsMm.length)}
              </text>
            </g>
          ))}

          {/* Room Polygons & Fills */}
          {level.rooms.map((room) => {
            const isSelected = selectedId === room.id;
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
                className="cursor-move group"
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
            />
          ))}

          {/* Doors */}
          {level.doors.map((door) => (
            <g key={door.id}>
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
            <g key={win.id}>
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
          <g transform={`translate(${plotW + 600}, 200)`}>
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
