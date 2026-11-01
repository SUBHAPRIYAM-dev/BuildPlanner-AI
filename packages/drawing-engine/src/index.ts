import {
  BuildingModel,
  LevelModel,
  RoomModel,
  WallModel,
  DoorModel,
  WindowModel,
  Point2D,
  RoadSide
} from '@buildplanner/building-model';
import { formatLength, formatArea } from '@buildplanner/units';
import { DISCLAIMERS } from '@buildplanner/shared';

export interface SvgRenderOptions {
  width?: number;
  height?: number;
  showDimensions?: boolean;
  showRoomNames?: boolean;
  showFurniture?: boolean;
  showGrid?: boolean;
  scale?: number; // pixels per mm (e.g. 0.05)
}

/**
 * Generates an architectural 2D Floor Plan SVG string directly from a LevelModel.
 */
export function renderFloorPlanSvg(
  model: BuildingModel,
  levelIndex = 0,
  options: SvgRenderOptions = {}
): string {
  const level = model.levels.find(l => l.levelIndex === levelIndex) || model.levels[0];
  const plotW = model.site.dimensionsMm.width;
  const plotL = model.site.dimensionsMm.length;

  const padding = 1500; // mm
  const totalW = plotW + padding * 2;
  const totalL = plotL + padding * 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-padding} ${-padding} ${totalW} ${totalL}" class="w-full h-full architectural-drawing" style="background-color: #0b1329; font-family: 'JetBrains Mono', monospace;">`;

  // Defs for hatches and markers
  svg += `
    <defs>
      <pattern id="arch-grid" width="1000" height="1000" patternUnits="userSpaceOnUse">
        <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="#1e293b" stroke-width="15" />
      </pattern>
      <pattern id="wall-hatch" width="100" height="100" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="100" stroke="#475569" stroke-width="20" />
      </pattern>
    </defs>
  `;

  // Background Grid
  svg += `<rect x="${-padding}" y="${-padding}" width="${totalW}" height="${totalL}" fill="url(#arch-grid)" />`;

  // Site Boundary
  svg += `<rect x="0" y="0" width="${plotW}" height="${plotL}" fill="none" stroke="#38bdf8" stroke-width="60" stroke-dasharray="200,100" />`;
  svg += `<text x="50" y="-100" fill="#38bdf8" font-size="200" font-weight="bold">SITE BOUNDARY (${formatLength(plotW)} × ${formatLength(plotL)})</text>`;

  // Mandatory Setback Envelope
  const setback = model.site.setbacksMm;
  const envX = setback.side1;
  const envY = setback.front;
  const envW = plotW - setback.side1 - setback.side2;
  const envL = plotL - setback.front - setback.rear;
  svg += `<rect x="${envX}" y="${envY}" width="${envW}" height="${envL}" fill="#0f172a" stroke="#64748b" stroke-width="30" stroke-dasharray="80,50" opacity="0.6" />`;

  // Abutting Roads
  const roads = model.site.roads;
  if (roads.NORTH.enabled) {
    svg += `<rect x="0" y="-1000" width="${plotW}" height="800" fill="#1e293b" stroke="#475569" stroke-width="30" opacity="0.8" />`;
    svg += `<text x="${plotW / 2}" y="-550" fill="#94a3b8" font-size="220" text-anchor="middle" font-weight="bold">NORTH ROAD (${formatLength(roads.NORTH.widthMm)} WIDE)</text>`;
  }
  if (roads.WEST.enabled) {
    svg += `<rect x="-1000" y="0" width="800" height="${plotL}" fill="#1e293b" stroke="#475569" stroke-width="30" opacity="0.8" />`;
    svg += `<text x="-600" y="${plotL / 2}" fill="#94a3b8" font-size="220" text-anchor="middle" font-weight="bold" transform="rotate(-90 -600 ${plotL / 2})">WEST ROAD (${formatLength(roads.WEST.widthMm)} WIDE)</text>`;
  }

  // Parking Spaces (on level 0)
  if (levelIndex === 0) {
    for (const park of model.parkingSpaces) {
      const px = park.positionMm.x;
      const py = park.positionMm.y;
      const pw = park.dimensionsMm.width;
      const pl = park.dimensionsMm.length;

      svg += `<g class="parking-bay">`;
      svg += `<rect x="${px}" y="${py}" width="${pw}" height="${pl}" fill="#1e293b" stroke="#38bdf8" stroke-width="40" stroke-dasharray="100,50" />`;
      // Car symbol silhouette
      svg += `<rect x="${px + 300}" y="${py + 500}" width="${pw - 600}" height="${pl - 1000}" rx="300" fill="#0284c7" opacity="0.3" stroke="#38bdf8" stroke-width="30" />`;
      svg += `<text x="${px + pw / 2}" y="${py + pl / 2}" fill="#e0f2fe" font-size="200" font-weight="bold" text-anchor="middle">CAR PARKING</text>`;
      svg += `<text x="${px + pw / 2}" y="${py + pl / 2 + 250}" fill="#94a3b8" font-size="140" text-anchor="middle">${formatLength(pw)} × ${formatLength(pl)}</text>`;
      svg += `</g>`;
    }
  }

  // Room Fills & Labels
  for (const room of level.rooms) {
    const box = room.bounds;
    const zoneColors: Record<string, string> = {
      PUBLIC: 'rgba(14, 165, 233, 0.12)',
      PRIVATE: 'rgba(99, 102, 241, 0.12)',
      SERVICE: 'rgba(234, 179, 8, 0.12)',
      OUTDOOR: 'rgba(16, 185, 129, 0.12)',
      CIRCULATION: 'rgba(100, 116, 139, 0.12)'
    };
    const fill = zoneColors[room.zone] || 'rgba(14, 165, 233, 0.12)';

    svg += `<g id="${room.id}" class="room-entity">`;
    svg += `<rect x="${box.minX}" y="${box.minY}" width="${box.widthMm}" height="${box.lengthMm}" fill="${fill}" />`;

    // Room Label
    const cx = box.minX + box.widthMm / 2;
    const cy = box.minY + box.lengthMm / 2;
    svg += `<text x="${cx}" y="${cy - 80}" fill="#ffffff" font-size="190" font-weight="bold" text-anchor="middle">${room.name.toUpperCase()}</text>`;
    svg += `<text x="${cx}" y="${cy + 130}" fill="#94a3b8" font-size="140" text-anchor="middle">${formatLength(box.widthMm)} × ${formatLength(box.lengthMm)}</text>`;
    svg += `<text x="${cx}" y="${cy + 300}" fill="#38bdf8" font-size="130" font-weight="600" text-anchor="middle">${formatArea(room.areaSqm, 'both')}</text>`;
    svg += `</g>`;
  }

  // Staircase (Dog-Legged U)
  for (const stair of model.staircases) {
    const sx = stair.startPoint.x;
    const sy = stair.startPoint.y;
    const sw = stair.dimensionsMm.width;
    const sl = stair.dimensionsMm.length;

    svg += `<g class="staircase-entity">`;
    svg += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sl}" fill="#0f172a" stroke="#64748b" stroke-width="40" />`;
    // Flight steps
    const stepCount = 10;
    const stepDist = (sl - stair.landingWidthMm) / stepCount;
    for (let i = 0; i <= stepCount; i++) {
      const stepY = sy + i * stepDist;
      svg += `<line x1="${sx}" y1="${stepY}" x2="${sx + sw / 2 - 50}" y2="${stepY}" stroke="#94a3b8" stroke-width="25" />`;
      svg += `<line x1="${sx + sw / 2 + 50}" y1="${stepY}" x2="${sx + sw}" y2="${stepY}" stroke="#94a3b8" stroke-width="25" />`;
    }
    // Landing
    svg += `<line x1="${sx}" y1="${sy + sl - stair.landingWidthMm}" x2="${sx + sw}" y2="${sy + sl - stair.landingWidthMm}" stroke="#e2e8f0" stroke-width="40" />`;
    svg += `<text x="${sx + sw / 2}" y="${sy + sl - stair.landingWidthMm / 2 + 40}" fill="#cbd5e1" font-size="160" text-anchor="middle">MID LANDING</text>`;
    // Flight direction arrows
    svg += `<path d="M ${sx + sw / 4} ${sy + sl - stair.landingWidthMm - 200} L ${sx + sw / 4} ${sy + 200} M ${sx + sw / 4 - 60} ${sy + 300} L ${sx + sw / 4} ${sy + 200} L ${sx + sw / 4 + 60} ${sy + 300}" stroke="#38bdf8" stroke-width="40" fill="none" />`;
    svg += `<text x="${sx + sw / 4}" y="${sy + 100}" fill="#38bdf8" font-size="130" font-weight="bold" text-anchor="middle">UP</text>`;
    svg += `</g>`;
  }

  // Walls (Solid Architectural Strokes)
  for (const wall of level.walls) {
    const strokeWidth = wall.thicknessMm;
    const strokeColor = wall.isExterior ? '#ffffff' : '#94a3b8';
    svg += `<line x1="${wall.startPoint.x}" y1="${wall.startPoint.y}" x2="${wall.endPoint.x}" y2="${wall.endPoint.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="square" />`;
  }

  // Doors with Swing Arcs
  for (const door of level.doors) {
    const dx = door.positionMm.x;
    const dy = door.positionMm.y;
    const dw = door.widthMm;

    svg += `<g class="door-entity">`;
    // Cutout opening
    svg += `<circle cx="${dx}" cy="${dy}" r="40" fill="#38bdf8" />`;
    // Door panel line
    svg += `<line x1="${dx}" y1="${dy}" x2="${dx + dw}" y2="${dy}" stroke="#e2e8f0" stroke-width="40" />`;
    // Swing arc
    svg += `<path d="M ${dx + dw} ${dy} A ${dw} ${dw} 0 0 1 ${dx} ${dy + dw}" fill="none" stroke="#38bdf8" stroke-width="25" stroke-dasharray="40,20" />`;
    svg += `</g>`;
  }

  // Windows with Architectural Double-Line
  for (const win of level.windows) {
    const wx = win.positionMm.x;
    const wy = win.positionMm.y;
    const ww = win.widthMm;

    svg += `<g class="window-entity">`;
    // Window frame
    svg += `<rect x="${wx}" y="${wy - 80}" width="${ww}" height="160" fill="#0284c7" opacity="0.4" stroke="#38bdf8" stroke-width="30" />`;
    svg += `<line x1="${wx}" y1="${wy}" x2="${wx + ww}" y2="${wy}" stroke="#ffffff" stroke-width="30" />`;
    svg += `<text x="${wx + ww / 2}" y="${wy - 120}" fill="#38bdf8" font-size="120" font-weight="bold" text-anchor="middle">W (${formatLength(ww)})</text>`;
    svg += `</g>`;
  }

  // North Arrow Indicator (Top-Right)
  const naX = plotW + 800;
  const naY = 200;
  svg += `
    <g class="north-arrow" transform="translate(${naX}, ${naY})">
      <circle cx="0" cy="0" r="350" fill="#0f172a" stroke="#38bdf8" stroke-width="30" />
      <polygon points="0,-280 80,0 0,-60 -80,0" fill="#ef4444" />
      <polygon points="0,280 80,0 0,60 -80,0" fill="#94a3b8" />
      <text x="0" y="-340" fill="#ef4444" font-size="220" font-weight="bold" text-anchor="middle">N</text>
    </g>
  `;

  // Drawing Title & Scale Block (Bottom-Left)
  svg += `
    <g class="drawing-info" transform="translate(0, ${plotL + 800})">
      <text x="0" y="0" fill="#ffffff" font-size="260" font-weight="bold">${level.name.toUpperCase()} ARCHITECTURAL PLAN</text>
      <text x="0" y="240" fill="#94a3b8" font-size="170">Scale 1:50 | All Dimensions in Millimeters [Feet-Inches]</text>
      <text x="0" y="440" fill="#f59e0b" font-size="150" font-weight="600">${DISCLAIMERS.PRELIMINARY_DESIGN}</text>
    </g>
  `;

  svg += `</svg>`;
  return svg;
}

/**
 * Generates procedural 2D orthographic elevation SVG for any side (North, South, East, West).
 */
export function renderElevationSvg(
  model: BuildingModel,
  side: RoadSide = 'NORTH'
): string {
  const plotW = model.site.dimensionsMm.width;
  const floorHeightMm = 3000;
  const plinthHeightMm = 600;
  const parapetHeightMm = 1000;
  const levelsCount = model.levels.length;
  const totalBuildingHeightMm = plinthHeightMm + levelsCount * floorHeightMm + parapetHeightMm;

  const padX = 1500;
  const padY = 1200;
  const viewW = plotW + padX * 2;
  const viewH = totalBuildingHeightMm + padY * 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-padX} ${-padY} ${viewW} ${viewH}" class="w-full h-full architectural-elevation" style="background-color: #0b1329; font-family: 'JetBrains Mono', monospace;">`;

  // Ground Line
  const groundY = totalBuildingHeightMm - parapetHeightMm;
  svg += `<line x1="${-padX}" y1="${groundY}" x2="${plotW + padX}" y2="${groundY}" stroke="#ef4444" stroke-width="50" />`;
  svg += `<text x="${-padX + 200}" y="${groundY - 60}" fill="#ef4444" font-size="160" font-weight="bold">NATURAL GROUND LEVEL (NGL ±0.00)</text>`;

  // Building Facade Extrusion
  const facadeX = model.site.setbacksMm.side1;
  const facadeW = plotW - model.site.setbacksMm.side1 - model.site.setbacksMm.side2;

  // Plinth
  const plinthY = groundY - plinthHeightMm;
  svg += `<rect x="${facadeX}" y="${plinthY}" width="${facadeW}" height="${plinthHeightMm}" fill="#334155" stroke="#ffffff" stroke-width="40" />`;
  svg += `<text x="${facadeX + 200}" y="${plinthY + 380}" fill="#94a3b8" font-size="140">PLINTH LEVEL (+0.60m)</text>`;

  // Floors
  for (let i = 0; i < levelsCount; i++) {
    const floorY = plinthY - (i + 1) * floorHeightMm;
    svg += `<rect x="${facadeX}" y="${floorY}" width="${facadeW}" height="${floorHeightMm}" fill="#1e293b" stroke="#ffffff" stroke-width="50" />`;

    // Floor Slab Accent
    svg += `<rect x="${facadeX - 100}" y="${floorY + floorHeightMm - 150}" width="${facadeW + 200}" height="150" fill="#64748b" stroke="#ffffff" stroke-width="30" />`;

    // Windows / Balconies on facade
    const winW = 1500;
    const winH = 1200;
    const winY = floorY + floorHeightMm - 900 - winH; // sill 900mm

    svg += `<rect x="${facadeX + 600}" y="${winY}" width="${winW}" height="${winH}" fill="#0284c7" opacity="0.6" stroke="#38bdf8" stroke-width="35" />`;
    svg += `<line x1="${facadeX + 600 + winW / 2}" y1="${winY}" x2="${facadeX + 600 + winW / 2}" y2="${winY + winH}" stroke="#ffffff" stroke-width="25" />`;

    svg += `<rect x="${facadeX + facadeW - 2100}" y="${winY}" width="${winW}" height="${winH}" fill="#0284c7" opacity="0.6" stroke="#38bdf8" stroke-width="35" />`;
    svg += `<line x1="${facadeX + facadeW - 2100 + winW / 2}" y1="${winY}" x2="${facadeX + facadeW - 2100 + winW / 2}" y2="${winY + winH}" stroke="#ffffff" stroke-width="25" />`;

    // Level Callout
    const levelLabelY = floorY + floorHeightMm;
    svg += `<line x1="${facadeX + facadeW}" y1="${levelLabelY}" x2="${plotW + 600}" y2="${levelLabelY}" stroke="#38bdf8" stroke-width="25" stroke-dasharray="50,30" />`;
    svg += `<text x="${plotW + 700}" y="${levelLabelY + 50}" fill="#38bdf8" font-size="160" font-weight="bold">LEVEL ${i} (${model.levels[i]?.name.toUpperCase()}) [+${((plinthHeightMm + i * floorHeightMm) / 1000).toFixed(2)}m]</text>`;
  }

  // Parapet Wall & Overhead Water Tank
  const roofY = plinthY - levelsCount * floorHeightMm;
  const parapetY = roofY - parapetHeightMm;
  svg += `<rect x="${facadeX}" y="${parapetY}" width="${facadeW}" height="${parapetHeightMm}" fill="#334155" stroke="#ffffff" stroke-width="40" />`;
  svg += `<text x="${facadeX + facadeW / 2}" y="${parapetY + 600}" fill="#cbd5e1" font-size="160" text-anchor="middle">PARAPET (+1.00m)</text>`;

  // Title
  svg += `
    <g transform="translate(0, ${viewH - padY - 200})">
      <text x="0" y="0" fill="#ffffff" font-size="240" font-weight="bold">${side} ELEVATION</text>
      <text x="0" y="200" fill="#94a3b8" font-size="160">Scale 1:50 | All Levels Relative to NGL</text>
    </g>
  `;

  svg += `</svg>`;
  return svg;
}
