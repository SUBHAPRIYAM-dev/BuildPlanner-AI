import { describe, it, expect } from 'vitest';
import {
  calculatePolygonAreaMm2,
  calculatePolygonAreaSqm,
  calculatePolygonCentroid,
  calculateBoundingBox,
  isPointInPolygon,
  doPolygonsOverlap,
  isPolygonContained,
  calculateBuildableEnvelope,
  generateWallsFromRooms,
  calculateStaircaseSpecs
} from '../index';
import { RoomModel } from '@buildplanner/building-model';

describe('Geometry Engine', () => {
  it('calculates polygon area accurately using Shoelace theorem', () => {
    // 3000 x 4000 mm rectangle = 12,000,000 mm2 = 12 sqm
    const rect = [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 3000, y: 4000 },
      { x: 0, y: 4000 }
    ];

    expect(calculatePolygonAreaMm2(rect)).toBe(12000000);
    expect(calculatePolygonAreaSqm(rect)).toBe(12);
  });

  it('calculates polygon centroid', () => {
    const rect = [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 6000 },
      { x: 0, y: 6000 }
    ];

    const centroid = calculatePolygonCentroid(rect);
    expect(centroid.x).toBe(2000);
    expect(centroid.y).toBe(3000);
  });

  it('evaluates point-in-polygon containment', () => {
    const rect = [
      { x: 1000, y: 1000 },
      { x: 5000, y: 1000 },
      { x: 5000, y: 5000 },
      { x: 1000, y: 5000 }
    ];

    expect(isPointInPolygon({ x: 3000, y: 3000 }, rect)).toBe(true);
    expect(isPointInPolygon({ x: 6000, y: 3000 }, rect)).toBe(false);
    expect(isPointInPolygon({ x: 0, y: 0 }, rect)).toBe(false);
  });

  it('detects polygon overlaps and containment', () => {
    const outer = [
      { x: 0, y: 0 },
      { x: 10000, y: 0 },
      { x: 10000, y: 10000 },
      { x: 0, y: 10000 }
    ];

    const inner = [
      { x: 2000, y: 2000 },
      { x: 4000, y: 2000 },
      { x: 4000, y: 4000 },
      { x: 2000, y: 4000 }
    ];

    const outside = [
      { x: 12000, y: 2000 },
      { x: 14000, y: 2000 },
      { x: 14000, y: 4000 },
      { x: 12000, y: 4000 }
    ];

    expect(isPolygonContained(inner, outer)).toBe(true);
    expect(isPolygonContained(outside, outer)).toBe(false);
    expect(doPolygonsOverlap(inner, outer)).toBe(true);
    expect(doPolygonsOverlap(inner, outside)).toBe(false);
  });

  it('calculates buildable envelope respecting setbacks', () => {
    // 30x40 ft plot = 9144 x 12192 mm
    // setbacks: front 1500, rear 1000, side1 1000, side2 1000
    const envelope = calculateBuildableEnvelope(9144, 12192, {
      front: 1500,
      rear: 1000,
      side1: 1000,
      side2: 1000
    });

    expect(envelope[0]).toEqual({ x: 1000, y: 1500 });
    expect(envelope[1]).toEqual({ x: 8144, y: 1500 });
    expect(envelope[2]).toEqual({ x: 8144, y: 11192 });
    expect(envelope[3]).toEqual({ x: 1000, y: 11192 });
  });

  it('generates walls with shared edge deduplication', () => {
    // Two adjacent rooms sharing a wall at x=3000 from y=0 to y=4000
    const room1: RoomModel = {
      id: 'r1',
      name: 'Living Room',
      type: 'LIVING',
      levelIndex: 0,
      polygon: [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
        { x: 3000, y: 4000 },
        { x: 0, y: 4000 }
      ],
      bounds: { minX: 0, minY: 0, maxX: 3000, maxY: 4000, widthMm: 3000, lengthMm: 4000 },
      areaSqm: 12,
      zone: 'PUBLIC'
    };

    const room2: RoomModel = {
      id: 'r2',
      name: 'Kitchen',
      type: 'KITCHEN',
      levelIndex: 0,
      polygon: [
        { x: 3000, y: 0 },
        { x: 6000, y: 0 },
        { x: 6000, y: 4000 },
        { x: 3000, y: 4000 }
      ],
      bounds: { minX: 3000, minY: 0, maxX: 6000, maxY: 4000, widthMm: 3000, lengthMm: 4000 },
      areaSqm: 12,
      zone: 'SERVICE'
    };

    const walls = generateWallsFromRooms([room1, room2], 0, 200, 100);

    // Total unique walls should be 7 (4 for room1 + 4 for room2 - 1 shared = 7)
    expect(walls.length).toBe(7);

    // Find the interior shared wall
    const interiorWalls = walls.filter(w => w.type === 'INTERIOR');
    expect(interiorWalls.length).toBe(1);
    expect(interiorWalls[0].thicknessMm).toBe(100);

    // Exterior walls
    const exteriorWalls = walls.filter(w => w.type === 'EXTERIOR');
    expect(exteriorWalls.length).toBe(6);
    expect(exteriorWalls[0].thicknessMm).toBe(200);
  });

  it('calculates staircase specifications correctly', () => {
    const specs = calculateStaircaseSpecs(3000, 'DOG_LEGGED_U', 1000);

    expect(specs.totalRiseMm).toBe(3000);
    expect(specs.stepCount).toBe(20);
    expect(specs.riserMm).toBe(150);
    expect(specs.treadMm).toBe(250);
    expect(specs.landingWidthMm).toBe(1000);
    expect(specs.footprintDimensionsMm.width).toBe(2100); // 1000*2 + 100
  });
});
