import { describe, it, expect } from 'vitest';
import { generatePlanningCandidates, PlanningInput } from '@buildplanner/planning-engine';
import { BuildingModelSchema } from '@buildplanner/building-model';
import { validateBuildingConstraints } from '@buildplanner/constraint-engine';
import { evaluateRegulatoryCompliance } from '@buildplanner/rule-engine';
import { renderFloorPlanSvg, renderElevationSvg } from '@buildplanner/drawing-engine';
import { MockAIProvider } from '@buildplanner/ai-engine';
import { ftToMm } from '@buildplanner/units';

describe('Bhubaneswar G+1 Villa - End-to-End Acceptance Scenario', () => {
  const bhubaneswarInput: PlanningInput = {
    projectId: 'bhubaneswar-villa-e2e',
    title: 'Bhubaneswar G+1 Residential Villa',
    location: {
      city: 'Bhubaneswar',
      state: 'Odisha',
      country: 'India'
    },
    plot: {
      widthMm: ftToMm(30), // 30 ft = 9144 mm
      lengthMm: ftToMm(40), // 40 ft = 12192 mm
      shape: 'RECTANGLE'
    },
    roads: {
      NORTH: { enabled: true, widthMm: ftToMm(30), type: 'ACCESS' }, // 30ft road on North
      WEST: { enabled: true, widthMm: ftToMm(40), type: 'MAIN' },    // 40ft road on West
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

  // Phase 1: Planning Engine Candidates
  it('generates 3 viable architectural candidates with compliant metrics', () => {
    const candidates = generatePlanningCandidates(bhubaneswarInput);
    expect(candidates).toHaveLength(3);

    for (const candidate of candidates) {
      // Must conform to canonical schema
      const parseResult = BuildingModelSchema.safeParse(candidate.buildingModel);
      expect(parseResult.success).toBe(true);

      // Verify basic metadata
      expect(candidate.buildingModel.metadata.title).toContain('Bhubaneswar');
      expect(candidate.buildingModel.site.dimensionsMm.width).toBe(9144);
      expect(candidate.buildingModel.site.dimensionsMm.length).toBe(12192);
    }
  });

  // Phase 2: Exact Acceptance Requirements
  it('strictly satisfies Ground Floor requirements (2 Bed, Living, Dining, Kitchen, Puja, 2 Bath)', () => {
    const candidates = generatePlanningCandidates(bhubaneswarInput);
    const model = candidates[0].buildingModel;
    const groundFloor = model.levels.find(l => l.levelIndex === 0);
    expect(groundFloor).toBeDefined();

    const rooms = groundFloor!.rooms;
    const bedrooms = rooms.filter(r => r.type === 'BEDROOM' || r.type === 'MASTER_BEDROOM');
    const living = rooms.filter(r => r.type === 'LIVING');
    const dining = rooms.filter(r => r.type === 'DINING');
    const kitchen = rooms.filter(r => r.type === 'KITCHEN');
    const puja = rooms.filter(r => r.type === 'PUJA');
    const bathrooms = rooms.filter(r => r.type === 'BATHROOM_ATTACHED' || r.type === 'BATHROOM_COMMON');

    expect(bedrooms.length).toBe(2);
    expect(living.length).toBe(1);
    expect(dining.length).toBe(1);
    expect(kitchen.length).toBe(1);
    expect(puja.length).toBe(1);
    expect(bathrooms.length).toBe(2);
  });

  it('strictly satisfies First Floor requirements (2 Bed, Lounge, Dining, Kitchen, 2 Bath, 1 Balcony)', () => {
    const candidates = generatePlanningCandidates(bhubaneswarInput);
    const model = candidates[0].buildingModel;
    const firstFloor = model.levels.find(l => l.levelIndex === 1);
    expect(firstFloor).toBeDefined();

    const rooms = firstFloor!.rooms;
    const bedrooms = rooms.filter(r => r.type === 'BEDROOM' || r.type === 'MASTER_BEDROOM');
    const living = rooms.filter(r => r.type === 'LIVING');
    const dining = rooms.filter(r => r.type === 'DINING');
    const kitchen = rooms.filter(r => r.type === 'KITCHEN');
    const bathrooms = rooms.filter(r => r.type === 'BATHROOM_ATTACHED' || r.type === 'BATHROOM_COMMON');
    const balcony = rooms.filter(r => r.type === 'BALCONY');

    expect(bedrooms.length).toBe(2);
    expect(living.length).toBe(1);
    expect(dining.length).toBe(1);
    expect(kitchen.length).toBe(1);
    expect(bathrooms.length).toBe(2);
    expect(balcony.length).toBe(1);
  });

  it('strictly enforces exactly 1 car parking bay and continuous staircase for future expansion', () => {
    const candidates = generatePlanningCandidates(bhubaneswarInput);
    const model = candidates[0].buildingModel;

    // Exactly 1 car parking
    expect(model.parkingSpaces).toHaveLength(1);
    expect(model.parkingSpaces[0].type).toBe('CAR');
    expect(model.parkingSpaces[0].dimensionsMm.width).toBeGreaterThanOrEqual(2500);
    expect(model.parkingSpaces[0].dimensionsMm.length).toBeGreaterThanOrEqual(5000);

    // Continuous vertical core
    expect(model.staircases).toHaveLength(1);
    const staircase = model.staircases[0];
    expect(staircase.type).toBe('DOG_LEGGED_U');
    expect(staircase.continuesUp).toBe(true);
    expect(model.futureFloors.planned).toBe(true);
    expect(model.futureFloors.count).toBe(1);
  });

  // Phase 3: Constraint Engine & NBC 2016 Norms
  it('satisfies hard spatial constraints and NBC 2016 minimum habitable sizes', () => {
    const candidates = generatePlanningCandidates(bhubaneswarInput);
    const model = candidates[0].buildingModel;

    // Hard constraints & Vastu
    const constraintReport = validateBuildingConstraints(model);
    console.log('REMAINING ISSUES:', constraintReport.issues.filter(i => i.priority === 'HARD'));
    expect(constraintReport.hardFailuresCount).toBe(0);
    expect(constraintReport.vastuScore).toBeGreaterThanOrEqual(70);
    expect(constraintReport.vastuDetails.length).toBeGreaterThan(0);
  });

  // Phase 4: Rule Engine (Bhubaneswar BDA / OBRPS 2020)
  it('verifies Bhubaneswar Development Authority (BDA) planning rules', () => {
    const candidates = generatePlanningCandidates(bhubaneswarInput);
    const model = candidates[0].buildingModel;

    const bdaReport = evaluateRegulatoryCompliance(model, 'Bhubaneswar', 'Odisha');
    expect(bdaReport.jurisdiction.authority).toBe('Bhubaneswar Development Authority (BDA)');
    expect(bdaReport.rulesEvaluated.length).toBeGreaterThanOrEqual(4);

    // Coverage check <= 65%
    const covRule = bdaReport.rulesEvaluated.find(r => r.ruleId === 'ODA_RULE_COVERAGE');
    expect(covRule).toBeDefined();
    expect(covRule!.status).toBe('PASS');

    // Front setback check
    const frontRule = bdaReport.rulesEvaluated.find(r => r.ruleId === 'ODA_RULE_SETBACK_FRONT');
    expect(frontRule).toBeDefined();
    expect(['PASS', 'WARNING']).toContain(frontRule!.status);

    // Parking requirement
    const parkRule = bdaReport.rulesEvaluated.find(r => r.ruleId === 'ODA_RULE_PARKING');
    expect(parkRule).toBeDefined();
    expect(parkRule!.status).toBe('PASS');
  });

  // Phase 5: Drawing Engine (2D Floor Plans & Elevations)
  it('renders valid SVG floor plans and architectural elevations', () => {
    const candidates = generatePlanningCandidates(bhubaneswarInput);
    const model = candidates[0].buildingModel;

    // Ground Floor SVG
    const groundSvg = renderFloorPlanSvg(model, 0);
    expect(groundSvg).toContain('<svg');
    expect(groundSvg).toContain('</svg>');
    expect(groundSvg).toContain('GROUND FLOOR ARCHITECTURAL PLAN');
    expect(groundSvg).toContain('MASTER BEDROOM');
    expect(groundSvg).toContain('LIVING ROOM');
    expect(groundSvg).toContain('KITCHEN');
    expect(groundSvg).toContain('PUJA ROOM');
    expect(groundSvg).toContain('CAR PARKING');

    // First Floor SVG
    const firstSvg = renderFloorPlanSvg(model, 1);
    expect(firstSvg).toContain('<svg');
    expect(firstSvg).toContain('</svg>');
    expect(firstSvg).toContain('FIRST FLOOR ARCHITECTURAL PLAN');
    expect(firstSvg).toContain('FRONT BALCONY');

    // Elevations
    const northElevation = renderElevationSvg(model, 'NORTH');
    expect(northElevation).toContain('<svg');
    expect(northElevation).toContain('NORTH ELEVATION');
    expect(northElevation).toContain('PLINTH LEVEL');
    expect(northElevation).toContain('PARAPET');

    const westElevation = renderElevationSvg(model, 'WEST');
    expect(westElevation).toContain('<svg');
    expect(westElevation).toContain('WEST ELEVATION');
  });

  // Phase 6: AI Copilot Mutation & Parametric Updates
  it('executes AI parametric mutations and maintains canonical model integrity', async () => {
    const candidates = generatePlanningCandidates(bhubaneswarInput);
    const model = candidates[0].buildingModel;
    const aiProvider = new MockAIProvider();

    // Natural language command to update staircase
    const prompt = 'Make staircase straight';
    const response = await aiProvider.chat({ model, activeLevelIndex: 0 }, prompt);

    expect(response.operationApplied).toBe(true);
    expect(response.updatedModel).toBeDefined();
    expect(response.updatedModel!.staircases[0].type).toBe('STRAIGHT');

    // Schema validation on the mutated model
    const validation = BuildingModelSchema.safeParse(response.updatedModel);
    expect(validation.success).toBe(true);

    // Hard constraints check on mutated model
    const constraintCheck = validateBuildingConstraints(response.updatedModel!);
    expect(constraintCheck.isValid).toBe(true);
  });
});
