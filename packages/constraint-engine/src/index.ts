import {
  BuildingModel,
  RoomModel,
  RoomType,
  Point2D,
  Polygon2D
} from '@buildplanner/building-model';
import {
  isPolygonContained,
  doPolygonsOverlap,
  calculateBoundingBox,
  calculatePolygonCentroid,
  calculatePolygonAreaSqm
} from '@buildplanner/geometry-engine';

export type ConstraintPriority = 'HARD' | 'IMPORTANT' | 'SOFT' | 'PREFERENCE';

export interface ConstraintIssue {
  id: string;
  priority: ConstraintPriority;
  code: string;
  message: string;
  entityId?: string;
  entityName?: string;
  levelIndex?: number;
}

export interface VastuZoneScore {
  roomType: RoomType;
  preferredZones: string[];
  actualZone: string;
  score: number; // 0 to 10
  advice?: string;
}

export interface ConstraintReport {
  isValid: boolean; // True if no HARD constraint violations
  hardFailuresCount: number;
  importantWarningsCount: number;
  softWarningsCount: number;
  issues: ConstraintIssue[];
  vastuScore: number; // 0 - 100
  vastuDetails: VastuZoneScore[];
}

// NBC 2016 Minimum Standards for Residential Buildings
export const MIN_ROOM_REQUIREMENTS: Record<
  string,
  { minAreaSqm: number; minWidthMm: number; label: string }
> = {
  MASTER_BEDROOM: { minAreaSqm: 11.0, minWidthMm: 2700, label: 'Master Bedroom' },
  BEDROOM: { minAreaSqm: 9.5, minWidthMm: 2400, label: 'Bedroom' },
  LIVING: { minAreaSqm: 11.0, minWidthMm: 3000, label: 'Living Room' },
  DINING: { minAreaSqm: 7.5, minWidthMm: 2400, label: 'Dining Area' },
  KITCHEN: { minAreaSqm: 5.0, minWidthMm: 1800, label: 'Kitchen' },
  PUJA: { minAreaSqm: 2.0, minWidthMm: 1200, label: 'Puja Room' },
  BATHROOM_ATTACHED: { minAreaSqm: 2.2, minWidthMm: 1200, label: 'Attached Bathroom' },
  BATHROOM_COMMON: { minAreaSqm: 1.8, minWidthMm: 1100, label: 'Common Bathroom' },
  BALCONY: { minAreaSqm: 2.0, minWidthMm: 900, label: 'Balcony' },
  STAIRCASE: { minAreaSqm: 4.5, minWidthMm: 2000, label: 'Staircase Core' }
};

/**
 * Maps a coordinate (x, y) into one of the 9 Vastu cardinal quadrants
 * relative to the site/envelope bounding box.
 */
export function determineVastuZone(point: Point2D, envelopePoly: Point2D[]): string {
  const box = calculateBoundingBox(envelopePoly);
  const w = box.widthMm || 1;
  const l = box.lengthMm || 1;

  const relX = (point.x - box.minX) / w;
  const relY = (point.y - box.minY) / l;

  const col = relX < 0.33 ? 'WEST' : relX < 0.66 ? 'CENTER' : 'EAST';
  // y=0 is front (North if orientation is 0)
  const row = relY < 0.33 ? 'NORTH' : relY < 0.66 ? 'MIDDLE' : 'SOUTH';

  if (row === 'NORTH' && col === 'WEST') return 'NORTH_WEST';
  if (row === 'NORTH' && col === 'CENTER') return 'NORTH';
  if (row === 'NORTH' && col === 'EAST') return 'NORTH_EAST';

  if (row === 'MIDDLE' && col === 'WEST') return 'WEST';
  if (row === 'MIDDLE' && col === 'CENTER') return 'BRAHMASTHAN';
  if (row === 'MIDDLE' && col === 'EAST') return 'EAST';

  if (row === 'SOUTH' && col === 'WEST') return 'SOUTH_WEST';
  if (row === 'SOUTH' && col === 'CENTER') return 'SOUTH';
  return 'SOUTH_EAST';
}

/**
 * Validates all geometric, space-planning, and Vastu constraints of a BuildingModel.
 */
export function validateBuildingConstraints(model: BuildingModel): ConstraintReport {
  const issues: ConstraintIssue[] = [];
  const vastuDetails: VastuZoneScore[] = [];

  const buildableEnvelope = model.site.buildableBoundary;
  const plotBoundary = model.site.boundary;

  // 1. Validate Parking constraints
  for (const parking of model.parkingSpaces) {
    const parkingBox = [
      parking.positionMm,
      { x: parking.positionMm.x + parking.dimensionsMm.width, y: parking.positionMm.y },
      { x: parking.positionMm.x + parking.dimensionsMm.width, y: parking.positionMm.y + parking.dimensionsMm.length },
      { x: parking.positionMm.x, y: parking.positionMm.y + parking.dimensionsMm.length }
    ];

    if (!isPolygonContained(parkingBox, plotBoundary)) {
      issues.push({
        id: `issue_parking_${parking.id}`,
        priority: 'HARD',
        code: 'PARKING_OUTSIDE_PLOT',
        message: 'Allocated car parking bay exceeds site plot boundaries.',
        entityId: parking.id
      });
    }

    // Check if parking space overlaps with any room on its allocated level
    const targetLevel = model.levels.find(l => l.levelIndex === parking.allocatedLevelIndex);
    if (targetLevel) {
      for (const room of targetLevel.rooms) {
        if (doPolygonsOverlap(parkingBox, room.polygon)) {
          issues.push({
            id: `issue_parking_overlap_${parking.id}_${room.id}`,
            priority: 'HARD',
            code: 'PARKING_ROOM_OVERLAP',
            message: `Spatial collision: Parking space "${parking.id}" overlaps with room "${room.name}" on ${targetLevel.name}.`,
            entityId: parking.id,
            levelIndex: targetLevel.levelIndex
          });
        }
      }
    }
  }

  // 2. Floor-by-floor Room Validation
  for (const level of model.levels) {
    const rooms = level.rooms;

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const bounds = room.bounds;

      // Hard: Room cannot have zero or negative dimensions
      if (bounds.widthMm <= 0 || bounds.lengthMm <= 0) {
        issues.push({
          id: `issue_neg_dim_${room.id}`,
          priority: 'HARD',
          code: 'INVALID_DIMENSIONS',
          message: `Room "${room.name}" has invalid dimensions: ${bounds.widthMm}x${bounds.lengthMm}mm.`,
          entityId: room.id,
          levelIndex: level.levelIndex
        });
      }

      // Hard: Room must be inside buildable boundary
      // Allow minor 50mm tolerance
      if (!isPolygonContained(room.polygon, buildableEnvelope)) {
        issues.push({
          id: `issue_outside_env_${room.id}`,
          priority: 'HARD',
          code: 'OUTSIDE_BUILDABLE_ENVELOPE',
          message: `Room "${room.name}" encroaches beyond the mandatory setback boundary.`,
          entityId: room.id,
          entityName: room.name,
          levelIndex: level.levelIndex
        });
      }

      // Hard: Room-to-room overlap check on the same floor
      for (let j = i + 1; j < rooms.length; j++) {
        const otherRoom = rooms[j];
        if (doPolygonsOverlap(room.polygon, otherRoom.polygon)) {
          issues.push({
            id: `issue_overlap_${room.id}_${otherRoom.id}`,
            priority: 'HARD',
            code: 'ROOM_OVERLAP',
            message: `Spatial collision: "${room.name}" and "${otherRoom.name}" overlap on ${level.name}.`,
            entityId: room.id,
            levelIndex: level.levelIndex
          });
        }
      }

      // Important: Minimum area & width requirements
      const req = MIN_ROOM_REQUIREMENTS[room.type];
      if (req) {
        const actualArea = calculatePolygonAreaSqm(room.polygon);
        if (actualArea < req.minAreaSqm * 0.85) { // 15% tolerance
          issues.push({
            id: `issue_min_area_${room.id}`,
            priority: 'IMPORTANT',
            code: 'SUBSTANDARD_AREA',
            message: `"${room.name}" area (${actualArea.toFixed(1)} sqm) is below NBC minimum standard (${req.minAreaSqm} sqm).`,
            entityId: room.id,
            levelIndex: level.levelIndex
          });
        }

        const minDim = Math.min(bounds.widthMm, bounds.lengthMm);
        if (minDim < req.minWidthMm * 0.85) {
          issues.push({
            id: `issue_min_width_${room.id}`,
            priority: 'IMPORTANT',
            code: 'SUBSTANDARD_WIDTH',
            message: `"${room.name}" clear width (${minDim}mm) is narrower than recommended minimum (${req.minWidthMm}mm).`,
            entityId: room.id,
            levelIndex: level.levelIndex
          });
        }
      }

      // Soft: Vastu zone evaluation
      const centroid = calculatePolygonCentroid(room.polygon);
      const actualZone = determineVastuZone(centroid, buildableEnvelope);
      let vScore = 5; // neutral baseline

      if (room.type === 'PUJA') {
        if (actualZone === 'NORTH_EAST') vScore = 10;
        else if (actualZone === 'EAST' || actualZone === 'NORTH') vScore = 8;
        else vScore = 2;
        vastuDetails.push({
          roomType: room.type,
          preferredZones: ['NORTH_EAST', 'EAST'],
          actualZone,
          score: vScore,
          advice: vScore < 5 ? 'Puja room is ideally placed in North-East (Ishanya).' : undefined
        });
      } else if (room.type === 'KITCHEN') {
        if (actualZone === 'SOUTH_EAST') vScore = 10;
        else if (actualZone === 'NORTH_WEST') vScore = 8;
        else vScore = 3;
        vastuDetails.push({
          roomType: room.type,
          preferredZones: ['SOUTH_EAST', 'NORTH_WEST'],
          actualZone,
          score: vScore,
          advice: vScore < 5 ? 'Kitchen is recommended in South-East (Agni).' : undefined
        });
      } else if (room.type === 'MASTER_BEDROOM') {
        if (actualZone === 'SOUTH_WEST') vScore = 10;
        else if (actualZone === 'SOUTH' || actualZone === 'WEST') vScore = 8;
        else vScore = 3;
        vastuDetails.push({
          roomType: room.type,
          preferredZones: ['SOUTH_WEST'],
          actualZone,
          score: vScore,
          advice: vScore < 5 ? 'Master Bedroom is traditionally oriented in South-West (Nairutya).' : undefined
        });
      }
    }
  }

  // Calculate overall Vastu score
  let totalVastuScore = 80; // default healthy baseline
  if (vastuDetails.length > 0) {
    const sum = vastuDetails.reduce((acc, v) => acc + v.score * 10, 0);
    totalVastuScore = Math.round(sum / vastuDetails.length);
  }

  const hardFailuresCount = issues.filter(i => i.priority === 'HARD').length;
  const importantWarningsCount = issues.filter(i => i.priority === 'IMPORTANT').length;
  const softWarningsCount = issues.filter(i => i.priority === 'SOFT').length;

  return {
    isValid: hardFailuresCount === 0,
    hardFailuresCount,
    importantWarningsCount,
    softWarningsCount,
    issues,
    vastuScore: totalVastuScore,
    vastuDetails
  };
}
