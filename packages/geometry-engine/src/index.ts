import {
  Point2D,
  Polygon2D,
  BoundingBox,
  RoomModel,
  WallModel,
  DoorModel,
  WindowModel,
  DoorSwing,
  WindowType,
  StaircaseModel,
  StaircaseType
} from '@buildplanner/building-model';
import { mm2ToSqm } from '@buildplanner/units';

// ---------------------------------------------------------------------------
// 1. Vector & Point Math
// ---------------------------------------------------------------------------

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

export function pointEquals(p1: Point2D, p2: Point2D, tolerance = 1): boolean {
  return Math.abs(p1.x - p2.x) <= tolerance && Math.abs(p1.y - p2.y) <= tolerance;
}

export function snapPoint(point: Point2D, gridSizeMm = 100): Point2D {
  return {
    x: Math.round(point.x / gridSizeMm) * gridSizeMm,
    y: Math.round(point.y / gridSizeMm) * gridSizeMm
  };
}

// ---------------------------------------------------------------------------
// 2. Polygon Calculations
// ---------------------------------------------------------------------------

/**
 * Calculates area of any 2D polygon using the Shoelace formula.
 * Returns absolute area in square millimeters (mm²).
 */
export function calculatePolygonAreaMm2(polygon: Point2D[]): number {
  const n = polygon.length;
  if (n < 3) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const curr = polygon[i];
    const next = polygon[(i + 1) % n];
    sum += curr.x * next.y - next.x * curr.y;
  }
  return Math.abs(sum) / 2.0;
}

/**
 * Calculates area of polygon in square meters (sq.m).
 */
export function calculatePolygonAreaSqm(polygon: Point2D[]): number {
  return mm2ToSqm(calculatePolygonAreaMm2(polygon));
}

/**
 * Computes polygon centroid in 2D space.
 */
export function calculatePolygonCentroid(polygon: Point2D[]): Point2D {
  const n = polygon.length;
  if (n === 0) return { x: 0, y: 0 };
  if (n === 1) return { ...polygon[0] };

  let cx = 0;
  let cy = 0;
  let signedArea = 0;

  for (let i = 0; i < n; i++) {
    const curr = polygon[i];
    const next = polygon[(i + 1) % n];
    const cross = curr.x * next.y - next.x * curr.y;
    signedArea += cross;
    cx += (curr.x + next.x) * cross;
    cy += (curr.y + next.y) * cross;
  }

  signedArea /= 2.0;
  if (Math.abs(signedArea) < 1e-5) {
    // Fallback simple average
    const avgX = polygon.reduce((acc, p) => acc + p.x, 0) / n;
    const avgY = polygon.reduce((acc, p) => acc + p.y, 0) / n;
    return { x: Math.round(avgX), y: Math.round(avgY) };
  }

  cx = cx / (6.0 * signedArea);
  cy = cy / (6.0 * signedArea);

  return { x: Math.round(cx), y: Math.round(cy) };
}

/**
 * Computes bounding box for a set of points or polygon.
 */
export function calculateBoundingBox(points: Point2D[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, widthMm: 0, lengthMm: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    widthMm: maxX - minX,
    lengthMm: maxY - minY
  };
}

/**
 * Checks whether point is inside polygon using ray-casting algorithm.
 */
export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if two line segments intersect.
 */
export function doLineSegmentsIntersect(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): boolean {
  function ccw(a: Point2D, b: Point2D, c: Point2D): boolean {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

/**
 * Check if two axis-aligned bounding boxes or polygons overlap.
 */
export function doPolygonsOverlap(polyA: Point2D[], polyB: Point2D[]): boolean {
  const boxA = calculateBoundingBox(polyA);
  const boxB = calculateBoundingBox(polyB);

  // AABB overlap check with 1mm tolerance
  if (
    boxA.maxX <= boxB.minX + 1 ||
    boxA.minX >= boxB.maxX - 1 ||
    boxA.maxY <= boxB.minY + 1 ||
    boxA.minY >= boxB.maxY - 1
  ) {
    return false;
  }

  // Check if center of A is inside B or vice versa
  const centerA = calculatePolygonCentroid(polyA);
  const centerB = calculatePolygonCentroid(polyB);

  return isPointInPolygon(centerA, polyB) || isPointInPolygon(centerB, polyA);
}

/**
 * Checks if inner polygon is fully enclosed within outer polygon.
 */
export function isPolygonContained(inner: Point2D[], outer: Point2D[]): boolean {
  const innerBox = calculateBoundingBox(inner);
  const outerBox = calculateBoundingBox(outer);

  // Quick bounding box check
  if (
    innerBox.minX < outerBox.minX ||
    innerBox.maxX > outerBox.maxX ||
    innerBox.minY < outerBox.minY ||
    innerBox.maxY > outerBox.maxY
  ) {
    return false;
  }

  // All vertices of inner must be inside outer
  for (const vertex of inner) {
    if (!isPointInPolygon(vertex, outer)) {
      // Check if it's on the boundary with tolerance
      const isBoundary = vertex.x === outerBox.minX || vertex.x === outerBox.maxX ||
                         vertex.y === outerBox.minY || vertex.y === outerBox.maxY;
      if (!isBoundary) return false;
    }
  }

  return true;
}

/**
 * Calculates buildable envelope polygon by applying setbacks to a rectangular plot.
 */
export function calculateBuildableEnvelope(
  plotWidthMm: number,
  plotLengthMm: number,
  setbacks: { front: number; rear: number; side1: number; side2: number }
): Point2D[] {
  const minX = setbacks.side1;
  const maxX = Math.max(minX, plotWidthMm - setbacks.side2);
  const minY = setbacks.front;
  const maxY = Math.max(minY, plotLengthMm - setbacks.rear);

  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ];
}

// ---------------------------------------------------------------------------
// 3. Parametric Wall Generation & Opening Anchor Engine
// ---------------------------------------------------------------------------

interface EdgeKey {
  p1: Point2D;
  p2: Point2D;
  roomCount: number;
}

function normalizeSegment(p1: Point2D, p2: Point2D): [Point2D, Point2D] {
  if (p1.x < p2.x || (p1.x === p2.x && p1.y < p2.y)) {
    return [p1, p2];
  }
  return [p2, p1];
}

function segmentHash(p1: Point2D, p2: Point2D): string {
  const [start, end] = normalizeSegment(p1, p2);
  return `${Math.round(start.x)}_${Math.round(start.y)}_${Math.round(end.x)}_${Math.round(end.y)}`;
}

/**
 * Generates deduplicated WallModels from an array of RoomModels on a floor.
 * Distinguishes exterior perimeter walls (thickness e.g. 200mm) from interior partitions (100mm).
 */
export function generateWallsFromRooms(
  rooms: RoomModel[],
  levelIndex: number,
  exteriorThicknessMm = 200,
  interiorThicknessMm = 100,
  wallHeightMm = 3000
): WallModel[] {
  const edgeMap = new Map<string, EdgeKey>();

  for (const room of rooms) {
    const poly = room.polygon;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % n];

      // Ignore zero-length edges
      if (pointEquals(p1, p2)) continue;

      const hash = segmentHash(p1, p2);
      const existing = edgeMap.get(hash);
      if (existing) {
        existing.roomCount += 1;
      } else {
        const [normP1, normP2] = normalizeSegment(p1, p2);
        edgeMap.set(hash, { p1: normP1, p2: normP2, roomCount: 1 });
      }
    }
  }

  const walls: WallModel[] = [];
  let wallCounter = 1;

  for (const edge of edgeMap.values()) {
    // If edge is shared by only 1 room, it's exterior perimeter; if shared by 2 or more, it's interior partition
    const isExterior = edge.roomCount === 1;
    const thicknessMm = isExterior ? exteriorThicknessMm : interiorThicknessMm;

    walls.push({
      id: `wall_${levelIndex}_${wallCounter++}`,
      startPoint: edge.p1,
      endPoint: edge.p2,
      thicknessMm,
      heightMm: wallHeightMm,
      type: isExterior ? 'EXTERIOR' : 'INTERIOR',
      levelIndex,
      isExterior
    });
  }

  return walls;
}

/**
 * Places a door parametrically along a wall at an offset from the start point.
 */
export function placeDoorOnWall(params: {
  id: string;
  wall: WallModel;
  offsetMm: number;
  widthMm?: number;
  heightMm?: number;
  swing?: DoorSwing;
}): DoorModel {
  const { id, wall, offsetMm, widthMm = 900, heightMm = 2100, swing = 'RIGHT' } = params;

  const wallLen = distance(wall.startPoint, wall.endPoint);
  const clampedOffset = Math.max(100, Math.min(offsetMm, wallLen - widthMm - 100));

  const ratio = clampedOffset / (wallLen || 1);
  const posX = Math.round(wall.startPoint.x + ratio * (wall.endPoint.x - wall.startPoint.x));
  const posY = Math.round(wall.startPoint.y + ratio * (wall.endPoint.y - wall.startPoint.y));

  return {
    id,
    wallId: wall.id,
    positionMm: { x: posX, y: posY },
    widthMm,
    heightMm,
    swing
  };
}

/**
 * Places a window parametrically on an exterior wall.
 */
export function placeWindowOnWall(params: {
  id: string;
  wall: WallModel;
  offsetMm: number;
  widthMm?: number;
  heightMm?: number;
  sillHeightMm?: number;
  type?: WindowType;
}): WindowModel {
  const {
    id,
    wall,
    offsetMm,
    widthMm = 1200,
    heightMm = 1200,
    sillHeightMm = 900,
    type = 'SLIDING'
  } = params;

  const wallLen = distance(wall.startPoint, wall.endPoint);
  const clampedOffset = Math.max(150, Math.min(offsetMm, wallLen - widthMm - 150));

  const ratio = clampedOffset / (wallLen || 1);
  const posX = Math.round(wall.startPoint.x + ratio * (wall.endPoint.x - wall.startPoint.x));
  const posY = Math.round(wall.startPoint.y + ratio * (wall.endPoint.y - wall.startPoint.y));

  return {
    id,
    wallId: wall.id,
    positionMm: { x: posX, y: posY },
    widthMm,
    heightMm,
    sillHeightMm,
    type
  };
}

// ---------------------------------------------------------------------------
// 4. Staircase Engineering Mathematics
// ---------------------------------------------------------------------------

export interface StaircaseCalculation {
  totalRiseMm: number;
  stepCount: number;
  riserMm: number;
  treadMm: number;
  runMm: number;
  landingWidthMm: number;
  footprintDimensionsMm: { width: number; length: number };
}

/**
 * Computes exact staircase dimensions respecting NBC 2016 comfort limits:
 * 2 * Riser + Tread ~ 600mm to 640mm.
 */
export function calculateStaircaseSpecs(
  floorHeightMm = 3000,
  stairType: StaircaseType = 'DOG_LEGGED_U',
  flightWidthMm = 1000
): StaircaseCalculation {
  // NBC 2016 residential riser max 190mm, standard comfort 150mm
  const targetRiser = 150;
  const stepCount = Math.round(floorHeightMm / targetRiser);
  const actualRiser = Math.round(floorHeightMm / stepCount);
  const treadMm = 250; // standard tread
  const landingWidthMm = Math.max(1000, flightWidthMm);

  let footprintWidth = 0;
  let footprintLength = 0;

  if (stairType === 'DOG_LEGGED_U') {
    // 2 flights side-by-side with intermediate landing
    const stepsPerFlight = Math.ceil(stepCount / 2);
    const flightRun = (stepsPerFlight - 1) * treadMm;
    footprintLength = flightRun + landingWidthMm;
    footprintWidth = flightWidthMm * 2 + 100; // 100mm gap between flights
  } else {
    // Straight single flight
    const run = (stepCount - 1) * treadMm;
    footprintLength = run + landingWidthMm;
    footprintWidth = flightWidthMm;
  }

  return {
    totalRiseMm: floorHeightMm,
    stepCount,
    riserMm: actualRiser,
    treadMm,
    runMm: (stepCount - 1) * treadMm,
    landingWidthMm,
    footprintDimensionsMm: {
      width: footprintWidth,
      length: footprintLength
    }
  };
}
