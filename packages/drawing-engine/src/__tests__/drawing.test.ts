import { describe, it, expect } from 'vitest';
import { renderFloorPlanSvg, renderElevationSvg } from '../index';
import { createDefaultBuildingModel } from '@buildplanner/building-model';

describe('Drawing Engine', () => {
  it('renders valid SVG string for 2D architectural floor plan', () => {
    const model = createDefaultBuildingModel({
      id: 'draw_test_model',
      projectId: 'proj_draw',
      plotWidthMm: 9144,
      plotLengthMm: 12192
    });

    const svg = renderFloorPlanSvg(model, 0);
    expect(svg).toContain('<svg');
    expect(svg).toContain('SITE BOUNDARY');
    expect(svg).toContain('NORTH ROAD');
    expect(svg).toContain('architectural-drawing');
    expect(svg).toContain('</svg>');
  });

  it('renders valid SVG string for building elevations', () => {
    const model = createDefaultBuildingModel({
      id: 'draw_test_model',
      projectId: 'proj_draw',
      plotWidthMm: 9144,
      plotLengthMm: 12192
    });

    const northElevation = renderElevationSvg(model, 'NORTH');
    expect(northElevation).toContain('<svg');
    expect(northElevation).toContain('NORTH ELEVATION');
    expect(northElevation).toContain('PLINTH LEVEL');
    expect(northElevation).toContain('PARAPET');
    expect(northElevation).toContain('</svg>');
  });
});
