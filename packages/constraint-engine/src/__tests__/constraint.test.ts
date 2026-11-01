import { describe, it, expect } from 'vitest';
import { validateBuildingConstraints, determineVastuZone } from '../index';
import { createDefaultBuildingModel } from '@buildplanner/building-model';

describe('Constraint Engine', () => {
  it('determines 9-zone Vastu cardinal quadrants accurately', () => {
    const envelope = [
      { x: 0, y: 0 },
      { x: 9000, y: 0 },
      { x: 9000, y: 12000 },
      { x: 0, y: 12000 }
    ];

    // North-East quadrant (x > 6000, y < 4000)
    expect(determineVastuZone({ x: 8000, y: 2000 }, envelope)).toBe('NORTH_EAST');
    // South-West quadrant (x < 3000, y > 8000)
    expect(determineVastuZone({ x: 1000, y: 10000 }, envelope)).toBe('SOUTH_WEST');
    // South-East quadrant (x > 6000, y > 8000)
    expect(determineVastuZone({ x: 8000, y: 10000 }, envelope)).toBe('SOUTH_EAST');
  });

  it('validates a default building model without hard failures', () => {
    const model = createDefaultBuildingModel({
      id: 'test_model',
      projectId: 'proj_1',
      plotWidthMm: 9144,
      plotLengthMm: 12192
    });

    const report = validateBuildingConstraints(model);
    expect(report.isValid).toBe(true);
    expect(report.hardFailuresCount).toBe(0);
  });

  it('flags a hard error if a room extends outside the setback boundary', () => {
    const model = createDefaultBuildingModel({
      id: 'test_model',
      projectId: 'proj_1',
      plotWidthMm: 9144,
      plotLengthMm: 12192
    });

    // Add a rogue room exceeding the boundary
    model.levels[0].rooms.push({
      id: 'rogue_room',
      name: 'Rogue Encroaching Room',
      type: 'BEDROOM',
      levelIndex: 0,
      polygon: [
        { x: -500, y: -500 },
        { x: 3000, y: -500 },
        { x: 3000, y: 3000 },
        { x: -500, y: 3000 }
      ],
      bounds: { minX: -500, minY: -500, maxX: 3000, maxY: 3000, widthMm: 3500, lengthMm: 3500 },
      areaSqm: 12.25,
      zone: 'PRIVATE'
    });

    const report = validateBuildingConstraints(model);
    expect(report.isValid).toBe(false);
    expect(report.hardFailuresCount).toBeGreaterThanOrEqual(1);
    expect(report.issues.some(i => i.code === 'OUTSIDE_BUILDABLE_ENVELOPE')).toBe(true);
  });
});
