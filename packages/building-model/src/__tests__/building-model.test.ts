import { describe, it, expect } from 'vitest';
import { BuildingModelSchema, createDefaultBuildingModel } from '../index';
import { ftToMm } from '@buildplanner/units';

describe('BuildingModel Domain Model', () => {
  it('creates and validates a valid default BuildingModel', () => {
    const widthMm = ftToMm(30); // 9144
    const lengthMm = ftToMm(40); // 12192

    const model = createDefaultBuildingModel({
      id: 'bldg_demo_1',
      projectId: 'proj_demo_1',
      plotWidthMm: widthMm,
      plotLengthMm: lengthMm,
      levelsCount: 2
    });

    const parsed = BuildingModelSchema.safeParse(model);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.levels.length).toBe(2);
      expect(parsed.data.site.dimensionsMm.width).toBe(9144);
      expect(parsed.data.site.dimensionsMm.length).toBe(12192);
      expect(parsed.data.site.roads.NORTH.enabled).toBe(true);
      expect(parsed.data.site.roads.WEST.enabled).toBe(true);
    }
  });

  it('rejects an invalid BuildingModel lacking required fields', () => {
    const invalidData = {
      id: 'invalid',
      site: {}
    };

    const parsed = BuildingModelSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});
