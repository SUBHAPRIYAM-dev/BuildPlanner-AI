import { z } from 'zod';
import { DISCLAIMERS } from '@buildplanner/shared';

// ---------------------------------------------------------------------------
// 1. Primitive Geometries (All coordinates in millimeters)
// ---------------------------------------------------------------------------

export const Point2DSchema = z.object({
  x: z.number(),
  y: z.number()
});
export type Point2D = z.infer<typeof Point2DSchema>;

export const BoundingBoxSchema = z.object({
  minX: z.number(),
  minY: z.number(),
  maxX: z.number(),
  maxY: z.number(),
  widthMm: z.number(),
  lengthMm: z.number()
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const Polygon2DSchema = z.array(Point2DSchema);
export type Polygon2D = z.infer<typeof Polygon2DSchema>;

// ---------------------------------------------------------------------------
// 2. Site & Roads
// ---------------------------------------------------------------------------

export const RoadSideSchema = z.enum(['NORTH', 'SOUTH', 'EAST', 'WEST']);
export type RoadSide = z.infer<typeof RoadSideSchema>;

export const RoadInfoSchema = z.object({
  enabled: z.boolean(),
  widthMm: z.number().nonnegative(),
  name: z.string().optional(),
  type: z.enum(['MAIN', 'ACCESS', 'STREET', 'HIGHWAY']).default('ACCESS')
});
export type RoadInfo = z.infer<typeof RoadInfoSchema>;

export const SiteModelSchema = z.object({
  id: z.string(),
  dimensionsMm: z.object({
    width: z.number().positive(),
    length: z.number().positive()
  }),
  boundary: Polygon2DSchema,
  orientationNorthDegrees: z.number().min(0).max(360).default(0),
  roads: z.object({
    NORTH: RoadInfoSchema,
    SOUTH: RoadInfoSchema,
    EAST: RoadInfoSchema,
    WEST: RoadInfoSchema
  }),
  setbacksMm: z.object({
    front: z.number().nonnegative().default(1500),
    rear: z.number().nonnegative().default(1000),
    side1: z.number().nonnegative().default(1000),
    side2: z.number().nonnegative().default(1000)
  }),
  buildableBoundary: Polygon2DSchema
});
export type SiteModel = z.infer<typeof SiteModelSchema>;

// ---------------------------------------------------------------------------
// 3. Rooms & Spatial Zones
// ---------------------------------------------------------------------------

export const RoomTypeSchema = z.enum([
  'LIVING',
  'DINING',
  'KITCHEN',
  'MASTER_BEDROOM',
  'BEDROOM',
  'PUJA',
  'BATHROOM_ATTACHED',
  'BATHROOM_COMMON',
  'BALCONY',
  'STAIRCASE',
  'PARKING',
  'UTILITY',
  'CORRIDOR',
  'STUDY',
  'STORE',
  'TERRACE'
]);
export type RoomType = z.infer<typeof RoomTypeSchema>;

export const SpatialZoneSchema = z.enum(['PUBLIC', 'PRIVATE', 'SERVICE', 'CIRCULATION', 'OUTDOOR']);
export type SpatialZone = z.infer<typeof SpatialZoneSchema>;

export const RoomModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: RoomTypeSchema,
  levelIndex: z.number().int().nonnegative(),
  polygon: Polygon2DSchema,
  bounds: BoundingBoxSchema,
  areaSqm: z.number().positive(),
  zone: SpatialZoneSchema,
  attachedToRoomId: z.string().optional(),
  vastuZone: z.string().optional(),
  vastuScore: z.number().optional()
});
export type RoomModel = z.infer<typeof RoomModelSchema>;

// ---------------------------------------------------------------------------
// 4. Walls & Openings (Doors / Windows)
// ---------------------------------------------------------------------------

export const WallTypeSchema = z.enum(['EXTERIOR', 'INTERIOR', 'PARTITION']);
export type WallType = z.infer<typeof WallTypeSchema>;

export const WallModelSchema = z.object({
  id: z.string(),
  startPoint: Point2DSchema,
  endPoint: Point2DSchema,
  thicknessMm: z.number().positive(),
  heightMm: z.number().positive().default(3000),
  type: WallTypeSchema,
  levelIndex: z.number().int().nonnegative(),
  isExterior: z.boolean().default(false)
});
export type WallModel = z.infer<typeof WallModelSchema>;

export const DoorSwingSchema = z.enum(['LEFT', 'RIGHT', 'SLIDING', 'DOUBLE']);
export type DoorSwing = z.infer<typeof DoorSwingSchema>;

export const DoorModelSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  positionMm: Point2DSchema,
  widthMm: z.number().positive().default(900),
  heightMm: z.number().positive().default(2100),
  swing: DoorSwingSchema.default('RIGHT')
});
export type DoorModel = z.infer<typeof DoorModelSchema>;

export const WindowTypeSchema = z.enum(['SLIDING', 'CASEMENT', 'FIXED', 'VENTILATOR']);
export type WindowType = z.infer<typeof WindowTypeSchema>;

export const WindowModelSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  positionMm: Point2DSchema,
  widthMm: z.number().positive().default(1200),
  heightMm: z.number().positive().default(1200),
  sillHeightMm: z.number().nonnegative().default(900),
  type: WindowTypeSchema.default('SLIDING')
});
export type WindowModel = z.infer<typeof WindowModelSchema>;

// ---------------------------------------------------------------------------
// 5. Stairs & Parking
// ---------------------------------------------------------------------------

export const StaircaseTypeSchema = z.enum(['DOG_LEGGED_U', 'STRAIGHT', 'L_SHAPED']);
export type StaircaseType = z.infer<typeof StaircaseTypeSchema>;

export const StaircaseModelSchema = z.object({
  id: z.string(),
  type: StaircaseTypeSchema.default('DOG_LEGGED_U'),
  startPoint: Point2DSchema,
  dimensionsMm: z.object({
    width: z.number().positive(),
    length: z.number().positive()
  }),
  flightWidthMm: z.number().positive().default(1000),
  riserMm: z.number().positive().default(150),
  treadMm: z.number().positive().default(250),
  stepCount: z.number().int().positive().default(20),
  landingWidthMm: z.number().positive().default(1000),
  startLevelIndex: z.number().int().nonnegative().default(0),
  endLevelIndex: z.number().int().nonnegative().default(1),
  continuesUp: z.boolean().default(false)
});
export type StaircaseModel = z.infer<typeof StaircaseModelSchema>;

export const ParkingSpaceSchema = z.object({
  id: z.string(),
  type: z.enum(['CAR', 'MOTORCYCLE', 'BICYCLE']).default('CAR'),
  location: z.enum(['SURFACE_PORCH', 'BASEMENT_UNDERGROUND', 'STILT']).default('SURFACE_PORCH'),
  slotNumber: z.number().default(1),
  positionMm: Point2DSchema,
  dimensionsMm: z.object({
    width: z.number().positive(),  // standard car 2700 mm
    length: z.number().positive()  // standard car 5000 mm
  }),
  allocatedLevelIndex: z.number().int().default(0)
});
export type ParkingSpaceModel = z.infer<typeof ParkingSpaceSchema>;

// ---------------------------------------------------------------------------
// 6. Level (Floor) Model
// ---------------------------------------------------------------------------

export const LevelModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  levelIndex: z.number().int().nonnegative(),
  elevationMm: z.number().nonnegative().default(0),
  heightMm: z.number().positive().default(3000),
  rooms: z.array(RoomModelSchema).default([]),
  walls: z.array(WallModelSchema).default([]),
  doors: z.array(DoorModelSchema).default([]),
  windows: z.array(WindowModelSchema).default([])
});
export type LevelModel = z.infer<typeof LevelModelSchema>;

// ---------------------------------------------------------------------------
// 7. Canonical BuildingModel
// ---------------------------------------------------------------------------

export const BuildingModelSchema = z.object({
  id: z.string(),
  schemaVersion: z.literal('1.0.0').default('1.0.0'),
  projectId: z.string(),
  versionNumber: z.number().int().positive().default(1),
  metadata: z.object({
    title: z.string().default('Residential Villa Plan'),
    createdAt: z.string(),
    updatedAt: z.string(),
    generatorVersion: z.string().default('1.0.0'),
    source: z.enum(['GENERATOR', 'USER_EDIT', 'AI_COMMAND']).default('GENERATOR'),
    changeDescription: z.string().optional()
  }),
  site: SiteModelSchema,
  levels: z.array(LevelModelSchema),
  staircases: z.array(StaircaseModelSchema).default([]),
  parkingSpaces: z.array(ParkingSpaceSchema).default([]),
  futureFloors: z.object({
    planned: z.boolean().default(false),
    count: z.number().int().nonnegative().default(0),
    note: z.string().default('Structural concept only. Structural verification required.')
  }),
  calculations: z.object({
    plotAreaSqm: z.number().nonnegative(),
    groundCoverageSqm: z.number().nonnegative(),
    groundCoverageRatio: z.number().min(0).max(1),
    totalBuiltUpAreaSqm: z.number().nonnegative(),
    carpetAreaSqm: z.number().nonnegative()
  }),
  validation: z.object({
    overallStatus: z.enum(['PASS', 'WARNING', 'FAIL', 'UNKNOWN']).default('PASS'),
    messages: z.array(z.object({
      severity: z.enum(['INFO', 'WARNING', 'ERROR']),
      code: z.string(),
      message: z.string()
    })).default([]),
    disclaimer: z.string().default(DISCLAIMERS.PRELIMINARY_DESIGN)
  })
});
export type BuildingModel = z.infer<typeof BuildingModelSchema>;

/**
 * Creates an initial empty or starter BuildingModel template
 */
export function createDefaultBuildingModel(params: {
  id: string;
  projectId: string;
  plotWidthMm: number;
  plotLengthMm: number;
  levelsCount?: number;
}): BuildingModel {
  const { id, projectId, plotWidthMm, plotLengthMm, levelsCount = 2 } = params;
  const now = new Date().toISOString();

  const siteBoundary: Polygon2D = [
    { x: 0, y: 0 },
    { x: plotWidthMm, y: 0 },
    { x: plotWidthMm, y: plotLengthMm },
    { x: 0, y: plotLengthMm }
  ];

  // Default setbacks: Front 1500mm (1.5m), Rear 1000mm, Sides 1000mm
  const setbacks = { front: 1500, rear: 1000, side1: 1000, side2: 1000 };
  const buildableBoundary: Polygon2D = [
    { x: setbacks.side1, y: setbacks.front },
    { x: plotWidthMm - setbacks.side2, y: setbacks.front },
    { x: plotWidthMm - setbacks.side2, y: plotLengthMm - setbacks.rear },
    { x: setbacks.side1, y: plotLengthMm - setbacks.rear }
  ];

  const plotAreaSqm = (plotWidthMm * plotLengthMm) / 1_000_000;

  const levels: LevelModel[] = [];
  const levelNames = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'];
  for (let i = 0; i < levelsCount; i++) {
    levels.push({
      id: `level_${i}`,
      name: levelNames[i] || `Level ${i}`,
      levelIndex: i,
      elevationMm: i * 3000,
      heightMm: 3000,
      rooms: [],
      walls: [],
      doors: [],
      windows: []
    });
  }

  return {
    id,
    schemaVersion: '1.0.0',
    projectId,
    versionNumber: 1,
    metadata: {
      title: 'Residential Plan',
      createdAt: now,
      updatedAt: now,
      generatorVersion: '1.0.0',
      source: 'GENERATOR'
    },
    site: {
      id: `site_${id}`,
      dimensionsMm: { width: plotWidthMm, length: plotLengthMm },
      boundary: siteBoundary,
      orientationNorthDegrees: 0,
      roads: {
        NORTH: { enabled: true, widthMm: 9144, type: 'ACCESS' },
        WEST: { enabled: true, widthMm: 12192, type: 'MAIN' },
        SOUTH: { enabled: false, widthMm: 0, type: 'ACCESS' },
        EAST: { enabled: false, widthMm: 0, type: 'ACCESS' }
      },
      setbacksMm: setbacks,
      buildableBoundary
    },
    levels,
    staircases: [],
    parkingSpaces: [],
    futureFloors: {
      planned: true,
      count: 1,
      note: 'Staircase continued for future vertical extension. Structural verification required.'
    },
    calculations: {
      plotAreaSqm,
      groundCoverageSqm: 0,
      groundCoverageRatio: 0,
      totalBuiltUpAreaSqm: 0,
      carpetAreaSqm: 0
    },
    validation: {
      overallStatus: 'PASS',
      messages: [],
      disclaimer: DISCLAIMERS.PRELIMINARY_DESIGN
    }
  };
}
