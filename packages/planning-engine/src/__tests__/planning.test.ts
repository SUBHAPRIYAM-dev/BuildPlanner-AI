import { describe, it, expect } from 'vitest';
import { generatePlanningCandidates, PlanningInput } from '../index';
import { ftToMm } from '@buildplanner/units';
import { validateBuildingConstraints } from '@buildplanner/constraint-engine';

describe('Planning Engine - Bhubaneswar G+1 Villa Acceptance', () => {
  const input: PlanningInput = {
    projectId: 'bhubaneswar_demo_project',
    title: 'Bhubaneswar G+1 Villa',
    location: {
      city: 'Bhubaneswar',
      state: 'Odisha',
      country: 'India'
    },
    plot: {
      widthMm: ftToMm(30), // 9144 mm
      lengthMm: ftToMm(40), // 12192 mm
      shape: 'RECTANGLE'
    },
    roads: {
      NORTH: { enabled: true, widthMm: ftToMm(30), type: 'ACCESS' },
      WEST: { enabled: true, widthMm: ftToMm(40), type: 'MAIN' },
      SOUTH: { enabled: false, widthMm: 0, type: 'ACCESS' },
      EAST: { enabled: false, widthMm: 0, type: 'ACCESS' }
    },
    floorsCount: 2,
    floorRequirements: [
      {
        levelIndex: 0,
        name: 'Ground Floor',
        bedrooms: 2,
        bathrooms: 2,
        attachedBathrooms: 1,
        commonBathrooms: 1,
        living: 1,
        dining: 1,
        kitchen: 1,
        puja: 1,
        balcony: 0
      },
      {
        levelIndex: 1,
        name: 'First Floor',
        bedrooms: 2,
        bathrooms: 2,
        attachedBathrooms: 1,
        commonBathrooms: 1,
        living: 1,
        dining: 1,
        kitchen: 1,
        puja: 0,
        balcony: 1
      }
    ],
    parking: {
      cars: 1,
      motorcycles: 0
    },
    vastu: {
      enabled: true,
      preference: 'BALANCED'
    },
    futureFloors: {
      planned: true,
      count: 1
    }
  };

  it('generates 3 viable architectural candidates', () => {
    const candidates = generatePlanningCandidates(input);
    expect(candidates.length).toBe(3);
  });

  it('strictly enforces Ground Floor = 2 bedrooms and First Floor = 2 bedrooms', () => {
    const candidates = generatePlanningCandidates(input);

    for (const candidate of candidates) {
      const model = candidate.buildingModel;
      const groundFloor = model.levels.find(l => l.levelIndex === 0);
      const firstFloor = model.levels.find(l => l.levelIndex === 1);

      expect(groundFloor).toBeDefined();
      expect(firstFloor).toBeDefined();

      const groundBedrooms = groundFloor!.rooms.filter(
        r => r.type === 'BEDROOM' || r.type === 'MASTER_BEDROOM'
      );
      const firstBedrooms = firstFloor!.rooms.filter(
        r => r.type === 'BEDROOM' || r.type === 'MASTER_BEDROOM'
      );

      // Acceptance Criteria 5 & 6
      expect(groundBedrooms.length).toBe(2);
      expect(firstBedrooms.length).toBe(2);
      expect(candidate.metrics.bedroomCountGround).toBe(2);
      expect(candidate.metrics.bedroomCountFirst).toBe(2);
    }
  });

  it('strictly creates exactly 1 property-level car parking space', () => {
    const candidates = generatePlanningCandidates(input);

    for (const candidate of candidates) {
      const model = candidate.buildingModel;
      const carSpaces = model.parkingSpaces.filter(p => p.type === 'CAR');

      // Acceptance Criteria 7
      expect(carSpaces.length).toBe(1);
      expect(candidate.metrics.parkingCarsCount).toBe(1);
    }
  });

  it('generates aligned staircase with future floor vertical continuation', () => {
    const candidates = generatePlanningCandidates(input);
    const candidateA = candidates[0];
    const stair = candidateA.buildingModel.staircases[0];

    expect(stair).toBeDefined();
    expect(stair.type).toBe('DOG_LEGGED_U');
    expect(stair.continuesUp).toBe(true);
    expect(candidateA.buildingModel.futureFloors.planned).toBe(true);
  });

  it('generates real walls, doors, windows, and positive areas', () => {
    const candidates = generatePlanningCandidates(input);
    const model = candidates[0].buildingModel;

    for (const level of model.levels) {
      expect(level.walls.length).toBeGreaterThan(0);
      expect(level.doors.length).toBeGreaterThan(0);
      expect(level.windows.length).toBeGreaterThan(0);
      expect(level.rooms.every(r => r.areaSqm > 0)).toBe(true);
    }

    expect(model.calculations.groundCoverageSqm).toBeGreaterThan(40);
    expect(model.calculations.totalBuiltUpAreaSqm).toBeGreaterThan(90);
  });

  it('adapts room layout dynamically across all 4 staircase zones with zero empty gaps or collisions', () => {
    const zones: Array<'WEST' | 'NORTH_WEST' | 'SOUTH_WEST' | 'SOUTH_EAST'> = [
      'WEST',
      'NORTH_WEST',
      'SOUTH_WEST',
      'SOUTH_EAST'
    ];

    for (const zone of zones) {
      const candidates = generatePlanningCandidates({
        ...input,
        staircase: {
          type: 'DOG_LEGGED_U',
          positionZone: zone
        }
      });

      const model = candidates[0].buildingModel;

      // Validate constraints - zero hard failures
      const report = validateBuildingConstraints(model);
      expect(report.isValid).toBe(true);
      expect(report.hardFailuresCount).toBe(0);

      // Verify Ground Floor parking does NOT overlap with any room
      for (const park of model.parkingSpaces) {
        if (park.allocatedLevelIndex === 0) {
          const parkMaxY = park.positionMm.y + park.dimensionsMm.length;
          for (const room of model.levels[0].rooms) {
            // Rooms must start behind parking space
            expect(room.bounds.minY).toBeGreaterThanOrEqual(parkMaxY);
          }
        }
      }

      // Verify West bay has both Bedroom 2 and Master Bedroom without empty holes
      for (const lvl of model.levels) {
        const westRooms = lvl.rooms.filter(r => r.bounds.minX === model.site.setbacksMm.side1);
        expect(westRooms.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
