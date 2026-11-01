import { describe, it, expect } from 'vitest';
import { evaluateRegulatoryCompliance, BHUBANESWAR_RULES } from '../index';
import { createDefaultBuildingModel } from '@buildplanner/building-model';

describe('Rule Engine', () => {
  it('evaluates compliance for Bhubaneswar villa within limits', () => {
    const model = createDefaultBuildingModel({
      id: 'test_model_bbnr',
      projectId: 'proj_bbnr',
      plotWidthMm: 9144, // 30ft
      plotLengthMm: 12192 // 40ft
    });

    // Add 1 car parking space
    model.parkingSpaces.push({
      id: 'park_1',
      type: 'CAR',
      positionMm: { x: 500, y: 500 },
      dimensionsMm: { width: 2500, length: 5000 },
      allocatedLevelIndex: 0
    });

    const report = evaluateRegulatoryCompliance(model, 'Bhubaneswar', 'Odisha');
    expect(report.jurisdiction.city).toBe('Bhubaneswar');
    expect(report.overallStatus).toBe('PASS');
    expect(report.rulesEvaluated.length).toBeGreaterThanOrEqual(4);
    expect(report.rulesEvaluated.every(r => r.status === 'PASS')).toBe(true);
  });

  it('evaluates international building code for global jurisdictions worldwide', () => {
    const model = createDefaultBuildingModel({
      id: 'test_model_unverified',
      projectId: 'proj_unverified',
      plotWidthMm: 9144,
      plotLengthMm: 12192
    });

    const report = evaluateRegulatoryCompliance(model, 'Berlin', 'Germany', 'Germany');
    expect(report.jurisdiction.authority).toContain('International Building Code');
    expect(['PASS', 'WARNING']).toContain(report.overallStatus);
    expect(report.rulesEvaluated.length).toBeGreaterThanOrEqual(4);
  });
});
