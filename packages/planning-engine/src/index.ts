import {
  BuildingModel,
  LevelModel,
  RoomModel,
  SiteModel,
  StaircaseModel,
  ParkingSpaceModel,
  Point2D,
  Polygon2D,
  RoadInfo
} from '@buildplanner/building-model';
import {
  calculatePolygonAreaSqm,
  calculateBoundingBox,
  calculateBuildableEnvelope,
  generateWallsFromRooms,
  calculateStaircaseSpecs,
  placeDoorOnWall,
  placeWindowOnWall
} from '@buildplanner/geometry-engine';
import { validateBuildingConstraints } from '@buildplanner/constraint-engine';
import { evaluateRegulatoryCompliance } from '@buildplanner/rule-engine';
import { DISCLAIMERS } from '@buildplanner/shared';
import { mm2ToSqm } from '@buildplanner/units';

export interface FloorRequirementInput {
  levelIndex: number;
  name: string;
  bedrooms: number;
  bathrooms: number;
  attachedBathrooms: number;
  commonBathrooms: number;
  living: number;
  dining: number;
  kitchen: number;
  puja: number;
  balcony: number;
  study?: number;
}

export interface PlanningInput {
  projectId: string;
  title?: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  plot: {
    widthMm: number;
    lengthMm: number;
    shape?: 'RECTANGLE' | 'L_SHAPE' | 'CUSTOM';
  };
  roads: {
    NORTH: RoadInfo;
    SOUTH: RoadInfo;
    EAST: RoadInfo;
    WEST: RoadInfo;
  };
  orientationNorthDegrees?: number;
  floorsCount: number;
  floorRequirements: FloorRequirementInput[];
  parking: {
    cars: number;
    motorcycles?: number;
    location?: 'SURFACE_PORCH' | 'BASEMENT_UNDERGROUND' | 'STILT';
  };
  staircase?: {
    type?: 'DOG_LEGGED_U' | 'STRAIGHT' | 'L_SHAPED';
    positionZone?: 'WEST' | 'NORTH_WEST' | 'SOUTH_WEST' | 'SOUTH_EAST' | 'NORTH_EAST';
  };
  vastu: {
    enabled: boolean;
    preference?: 'STRICT' | 'BALANCED' | 'FLEXIBLE';
  };
  futureFloors?: {
    planned: boolean;
    count: number;
  };
}

export interface PlanningCandidate {
  candidateId: string;
  name: string;
  description: string;
  buildingModel: BuildingModel;
  metrics: {
    plotAreaSqm: number;
    groundCoverageSqm: number;
    groundCoveragePercent: number;
    totalBuiltUpAreaSqm: number;
    carpetAreaSqm: number;
    bedroomCountGround: number;
    bedroomCountFirst: number;
    parkingCarsCount: number;
    vastuScore: number;
    regulatoryStatus: 'PASS' | 'WARNING' | 'FAIL' | 'UNKNOWN';
  };
}

/**
 * Creates room polygon and bounds object helper
 */
function createRoom(params: {
  id: string;
  name: string;
  type: RoomModel['type'];
  levelIndex: number;
  x: number;
  y: number;
  widthMm: number;
  lengthMm: number;
  zone: RoomModel['zone'];
  attachedToRoomId?: string;
}): RoomModel {
  const { id, name, type, levelIndex, x, y, widthMm, lengthMm, zone, attachedToRoomId } = params;
  const polygon: Polygon2D = [
    { x, y },
    { x: x + widthMm, y },
    { x: x + widthMm, y: y + lengthMm },
    { x, y: y + lengthMm }
  ];

  return {
    id,
    name,
    type,
    levelIndex,
    polygon,
    bounds: {
      minX: x,
      minY: y,
      maxX: x + widthMm,
      maxY: y + lengthMm,
      widthMm,
      lengthMm
    },
    areaSqm: Number(calculatePolygonAreaSqm(polygon).toFixed(2)),
    zone,
    attachedToRoomId
  };
}

/**
 * Deterministic Planning Generator:
 * Takes site, envelope, and explicit floor requirements and produces CandidateBuildingModels.
 */
export function generatePlanningCandidates(input: PlanningInput): PlanningCandidate[] {
  const {
    projectId,
    title = 'Residential Villa Plan',
    location,
    plot,
    roads,
    orientationNorthDegrees = 0,
    floorsCount = 2,
    floorRequirements,
    parking,
    staircase = { type: 'DOG_LEGGED_U', positionZone: 'WEST' },
    futureFloors = { planned: true, count: 1 }
  } = input;

  const now = new Date().toISOString();

  // 1. Site and Setbacks Setup
  // Bhubaneswar BDA: Front setback 1500mm (road facing), Rear 1000mm, Sides 1000mm
  const setbacks = {
    front: 1500,
    rear: 1000,
    side1: roads.WEST.enabled ? 1200 : 1000, // West side has road clearance
    side2: 1000
  };

  const siteBoundary: Polygon2D = [
    { x: 0, y: 0 },
    { x: plot.widthMm, y: 0 },
    { x: plot.widthMm, y: plot.lengthMm },
    { x: 0, y: plot.lengthMm }
  ];

  const buildableEnvelope = calculateBuildableEnvelope(plot.widthMm, plot.lengthMm, setbacks);
  const envBox = calculateBoundingBox(buildableEnvelope);

  // Parking Location & Multi-Car Setup
  const parkingLoc = parking.location || 'SURFACE_PORCH';
  const carsCount = Math.max(0, Math.min(4, parking.cars || 1));

  // 2. Candidate Variations (A: Classic Vastu, B: Contemporary Open-Plan, C: Courtyard Layout)
  const candidateConfigs = [
    {
      id: 'candidate_a',
      name: 'Classic Vastu-Compliant Villa',
      description: 'Zoned privacy with traditional central foyer, South-East Agni kitchen, and South-West Nairutya master suite.'
    },
    {
      id: 'candidate_b',
      name: 'Contemporary Open-Plan Villa',
      description: 'Flowing open-concept living and dining spaces with expansive natural cross-ventilation.'
    },
    {
      id: 'candidate_c',
      name: 'Courtyard Light-Well Villa',
      description: 'Integrated vertical light-well ensuring optimal illumination and ventilation in dense urban settings.'
    }
  ];

  const candidates: PlanningCandidate[] = [];

  for (let cIdx = 0; cIdx < candidateConfigs.length; cIdx++) {
    const config = candidateConfigs[cIdx];
    const candidateId = `${projectId}_${config.id}`;

    // Compute layout grid based on envelope dimensions (e.g. 7144 x 9692 mm for 30x40 ft)
    const envW = envBox.widthMm;
    const envL = envBox.lengthMm;
    const originX = envBox.minX;
    const originY = envBox.minY;

    // Split width into 2 primary spatial bays (Left Bay ~48%, Right Bay ~52%)
    const bayLeftW = Math.round(envW * (cIdx === 1 ? 0.46 : 0.48));
    const bayRightW = envW - bayLeftW;
    const colRightX = originX + bayLeftW;

    // -----------------------------------------------------------------------
    // STAIRCASE GEOMETRY & LOCATION ZONE
    // -----------------------------------------------------------------------
    const stairZone = staircase.positionZone || 'WEST';
    const stairType = staircase.type || 'DOG_LEGGED_U';
    const stairW = stairType === 'STRAIGHT' ? 1400 : 2100;
    const stairL = stairType === 'STRAIGHT' ? 3000 : 2000;

    // Building plinth origin on Ground Floor (behind car parking if surface parking is active)
    const hasSurfaceParkingOverall = (parkingLoc === 'SURFACE_PORCH') && (carsCount >= 1);
    const groundFloorOriginY = hasSurfaceParkingOverall ? 5100 : originY;
    const envMaxY = originY + envL;
    const buildingEnvL = envMaxY - groundFloorOriginY;

    // Calculate vertical circulation core position (consistent across all floors)
    let stairX = originX;
    let stairY = groundFloorOriginY + Math.round((buildingEnvL - stairL) * 0.38); // Default: WEST (Mid-West)

    if (stairZone === 'NORTH_WEST') {
      stairX = originX;
      stairY = groundFloorOriginY;
    } else if (stairZone === 'SOUTH_WEST') {
      stairX = originX;
      stairY = envMaxY - stairL;
    } else if (stairZone === 'SOUTH_EAST') {
      stairX = colRightX;
      stairY = envMaxY - stairL;
    }

    // -----------------------------------------------------------------------
    // FLOOR-BY-FLOOR GENERATION (Strictly respects floorRequirements per level)
    // -----------------------------------------------------------------------
    const levelNameLabels = [
      'Ground Floor',
      'First Floor',
      'Second Floor',
      'Third Floor',
      'Fourth Floor',
      'Fifth Floor',
      'Sixth Floor',
      'Seventh Floor'
    ];

    const levels: LevelModel[] = [];

    for (let lvl = 0; lvl < floorsCount; lvl++) {
      const lvlRooms: RoomModel[] = [];
      const floorReq = floorRequirements.find(f => f.levelIndex === lvl);
      const lvlLabel = levelNameLabels[lvl] || `Level ${lvl}`;

      // Respect per-floor flags
      const hasPuja = floorReq ? (Number(floorReq.puja) > 0) : (lvl === 0);
      const hasKitchen = floorReq ? (Number(floorReq.kitchen) > 0) : (lvl === 0);
      const hasLiving = floorReq ? (Number(floorReq.living) > 0) : true;
      const hasDining = floorReq ? (Number(floorReq.dining) > 0) : (lvl === 0);
      const hasBalcony = floorReq ? (Number(floorReq.balcony) > 0) : (lvl > 0);
      const reqBedrooms = floorReq ? Number(floorReq.bedrooms) : 2;

      // Floor origin Y:
      // On Ground Floor: starts at groundFloorOriginY (5100mm when surface parking is active, 0mm overlap with parking 0-5000mm)
      // On Upper Floors: starts at originY (1500mm, with front balcony if requested)
      const floorOriginY = (lvl === 0) ? groundFloorOriginY : originY;
      const balconyL = (hasBalcony && lvl > 0) ? 1500 : 0;
      const pujaW = 1400;
      const pujaL = 1500;

      // ---------------------------------------------------------------------
      // EAST BAY ROOMS (Balcony, Puja, Living, Dining, Kitchen / Bed 3)
      // ---------------------------------------------------------------------
      // 1. Balcony (Road facing front on upper floors)
      if (hasBalcony && balconyL > 0) {
        lvlRooms.push(
          createRoom({
            id: `room_l${lvl}_balcony_${cIdx}`,
            name: `${lvl === 1 ? 'Front' : lvlLabel} Balcony`,
            type: 'BALCONY',
            levelIndex: lvl,
            x: colRightX,
            y: floorOriginY,
            widthMm: bayRightW,
            lengthMm: balconyL,
            zone: 'OUTDOOR'
          })
        );
      }

      // 2. Puja Room: Vastu Ishanya (North-East Corner: Top-Right)
      if (hasPuja) {
        const pujaX = colRightX + bayRightW - pujaW;
        const pujaY = floorOriginY + balconyL;
        lvlRooms.push(
          createRoom({
            id: `room_l${lvl}_puja_${cIdx}`,
            name: 'Puja Room',
            type: 'PUJA',
            levelIndex: lvl,
            x: pujaX,
            y: pujaY,
            widthMm: pujaW,
            lengthMm: pujaL,
            zone: 'PUBLIC'
          })
        );
      }

      // If Staircase is in SOUTH_EAST, the East Bay ends at stairY. Otherwise, ends at envMaxY.
      const eastBayMaxY = (stairZone === 'SOUTH_EAST') ? stairY : envMaxY;
      const eastAvailableL = eastBayMaxY - (floorOriginY + balconyL);

      // 3. Living Room / Family Lounge (Front Right)
      const livingL = Math.round(eastAvailableL * (hasDining && hasKitchen ? 0.38 : (hasDining || hasKitchen ? 0.52 : 1.0)));
      if (hasLiving && livingL > 0) {
        const livingY = floorOriginY + balconyL;
        const livingW = hasPuja ? (bayRightW - pujaW) : bayRightW;
        lvlRooms.push(
          createRoom({
            id: `room_l${lvl}_living_${cIdx}`,
            name: lvl === 0 ? 'Living Room' : (lvl === 1 ? 'Family Lounge' : `${lvlLabel} Lounge`),
            type: 'LIVING',
            levelIndex: lvl,
            x: colRightX,
            y: livingY,
            widthMm: livingW,
            lengthMm: livingL,
            zone: 'PUBLIC'
          })
        );
      }

      // 4. Dining Area (Central Right)
      const diningY = floorOriginY + balconyL + livingL;
      const diningL = (hasDining && hasKitchen)
        ? Math.round((eastBayMaxY - diningY) * 0.45)
        : (hasDining ? (eastBayMaxY - diningY) : 0);

      if (hasDining && diningL > 0) {
        lvlRooms.push(
          createRoom({
            id: `room_l${lvl}_dining_${cIdx}`,
            name: lvl === 0 ? 'Dining Hall' : `${lvlLabel} Dining`,
            type: 'DINING',
            levelIndex: lvl,
            x: colRightX,
            y: diningY,
            widthMm: bayRightW,
            lengthMm: diningL,
            zone: 'PUBLIC'
          })
        );
      }

      // 5. Kitchen (Vastu Agni: South-East Corner or Mid-East before Staircase)
      const kitchenY = diningY + diningL;
      const kitchenL = eastBayMaxY - kitchenY;
      if (hasKitchen && kitchenL > 0) {
        lvlRooms.push(
          createRoom({
            id: `room_l${lvl}_kitchen_${cIdx}`,
            name: lvl === 0 ? 'Kitchen' : `${lvlLabel} Kitchen`,
            type: 'KITCHEN',
            levelIndex: lvl,
            x: colRightX,
            y: kitchenY,
            widthMm: bayRightW,
            lengthMm: kitchenL,
            zone: 'SERVICE'
          })
        );
      } else if (reqBedrooms >= 3 && !hasKitchen && kitchenL > 0) {
        // Third Bedroom if requested and no kitchen on this level
        lvlRooms.push(
          createRoom({
            id: `room_l${lvl}_bed_3_${cIdx}`,
            name: `Bedroom ${lvl * 3 + 1}`,
            type: 'BEDROOM',
            levelIndex: lvl,
            x: colRightX,
            y: kitchenY,
            widthMm: bayRightW,
            lengthMm: kitchenL,
            zone: 'PRIVATE'
          })
        );
      }

      // ---------------------------------------------------------------------
      // WEST (LEFT) BAY ROOMS — Dynamically adapts to staircase position
      // ZERO empty space in the West part regardless of staircase position!
      // ---------------------------------------------------------------------
      const masterBedW = Math.max(2700, Math.round(bayLeftW * 0.72));
      const masterBathW = Math.max(1100, bayLeftW - masterBedW);

      let bed2Y = floorOriginY;
      let bed2L = 0;
      let bedRearY = 0;
      let bedRearL = 0;

      if (stairZone === 'WEST') {
        // Staircase is in the central-west part (stairY to stairY + stairL)
        // Bedroom 2 fills front-west (floorOriginY to stairY)
        bed2Y = floorOriginY;
        bed2L = stairY - floorOriginY;

        // Master Bedroom fills rear-west (stairY + stairL to envMaxY)
        bedRearY = stairY + stairL;
        bedRearL = envMaxY - bedRearY;
      } else if (stairZone === 'NORTH_WEST') {
        // Staircase is at front-west (stairY to stairY + stairL)
        // If upper floor extends before stairY, add a terrace / front balcony on left
        if (floorOriginY < stairY) {
          lvlRooms.push(
            createRoom({
              id: `room_l${lvl}_west_terrace_${cIdx}`,
              name: `${lvlLabel} West Terrace`,
              type: 'BALCONY',
              levelIndex: lvl,
              x: originX,
              y: floorOriginY,
              widthMm: bayLeftW,
              lengthMm: stairY - floorOriginY,
              zone: 'OUTDOOR'
            })
          );
        }

        // Remaining length behind staircase to rear boundary is split cleanly:
        const remL = envMaxY - (stairY + stairL);
        bed2Y = stairY + stairL;
        bed2L = Math.round(remL * 0.48);
        bedRearY = bed2Y + bed2L;
        bedRearL = envMaxY - bedRearY;
      } else if (stairZone === 'SOUTH_WEST') {
        // Staircase is at rear-west (stairY = envMaxY - stairL)
        // Available length in front of staircase:
        const frontL = stairY - floorOriginY;
        bed2Y = floorOriginY;
        bed2L = Math.round(frontL * 0.48);
        bedRearY = bed2Y + bed2L;
        bedRearL = stairY - bedRearY;
      } else {
        // stairZone === 'SOUTH_EAST': Staircase is in the East bay!
        // The ENTIRE West bay is available for the bedrooms — NO EMPTY HOLE!
        const westL = envMaxY - floorOriginY;
        bed2Y = floorOriginY;
        bed2L = Math.round(westL * 0.48);
        bedRearY = bed2Y + bed2L;
        bedRearL = envMaxY - bedRearY;
      }

      // Add Master Bedroom
      if (reqBedrooms >= 1 && bedRearL > 0) {
        lvlRooms.push(
          createRoom({
            id: `room_l${lvl}_master_bed_${cIdx}`,
            name: lvl === 0 ? 'Master Bedroom' : `Master Bedroom ${lvl + 1}`,
            type: 'MASTER_BEDROOM',
            levelIndex: lvl,
            x: originX,
            y: bedRearY,
            widthMm: masterBedW,
            lengthMm: bedRearL,
            zone: 'PRIVATE'
          })
        );

        // Attached Toilet for Master Bedroom
        lvlRooms.push(
          createRoom({
            id: `room_l${lvl}_attached_bath_${cIdx}`,
            name: lvl === 0 ? 'Attached Toilet' : `Attached Bath ${lvl + 1}`,
            type: 'BATHROOM_ATTACHED',
            levelIndex: lvl,
            x: originX + masterBedW,
            y: bedRearY,
            widthMm: masterBathW,
            lengthMm: Math.round(bedRearL * 0.55),
            zone: 'SERVICE',
            attachedToRoomId: `room_l${lvl}_master_bed_${cIdx}`
          })
        );

        // Common Toilet
        lvlRooms.push(
          createRoom({
            id: `room_l${lvl}_common_bath_${cIdx}`,
            name: lvl === 0 ? 'Common Toilet' : `Common Bath ${lvl + 1}`,
            type: 'BATHROOM_COMMON',
            levelIndex: lvl,
            x: originX + masterBedW,
            y: bedRearY + Math.round(bedRearL * 0.55),
            widthMm: masterBathW,
            lengthMm: bedRearL - Math.round(bedRearL * 0.55),
            zone: 'SERVICE'
          })
        );
      }

      // Add Bedroom 2 (or Study if 1 bedroom requested)
      if (bed2L > 0) {
        lvlRooms.push(
          createRoom({
            id: `room_l${lvl}_bed_2_${cIdx}`,
            name: reqBedrooms >= 2
              ? (lvl === 0 ? 'Bedroom 2' : `Bedroom ${lvl * 2 + 1}`)
              : 'Study / Home Office',
            type: reqBedrooms >= 2 ? 'BEDROOM' : 'STUDY',
            levelIndex: lvl,
            x: originX,
            y: bed2Y,
            widthMm: bayLeftW,
            lengthMm: bed2L,
            zone: 'PRIVATE'
          })
        );
      }

      // Deduce walls for this level
      const lvlWalls = generateWallsFromRooms(lvlRooms, lvl);

      const lvlDoors = lvlWalls.slice(0, 7).map((wall, idx) =>
        placeDoorOnWall({
          id: `door_l${lvl}_${idx + 1}`,
          wall,
          offsetMm: 200,
          widthMm: idx === 0 && lvl === 0 ? 1000 : 900
        })
      );

      const lvlWindows = lvlWalls.filter(w => w.isExterior).slice(0, 6).map((wall, idx) =>
        placeWindowOnWall({
          id: `win_l${lvl}_${idx + 1}`,
          wall,
          offsetMm: 400,
          widthMm: 1200
        })
      );

      levels.push({
        id: `level_${lvl}_${cIdx}`,
        name: lvlLabel,
        levelIndex: lvl,
        elevationMm: lvl * 3000,
        heightMm: 3000,
        rooms: lvlRooms,
        walls: lvlWalls,
        doors: lvlDoors,
        windows: lvlWindows
      });
    }

    // -----------------------------------------------------------------------
    // STAIRCASE CORE (Aligned vertically across all floors with user shape)
    // -----------------------------------------------------------------------
    const stairSpecs = calculateStaircaseSpecs(3000, stairType, 1000);
    const staircases: StaircaseModel[] = [
      {
        id: `stair_core_main_${cIdx}`,
        type: stairType,
        startPoint: { x: stairX, y: stairY },
        dimensionsMm: { width: stairW, length: stairL },
        flightWidthMm: 1000,
        riserMm: stairSpecs.riserMm,
        treadMm: stairSpecs.treadMm,
        stepCount: stairSpecs.stepCount,
        landingWidthMm: stairSpecs.landingWidthMm,
        startLevelIndex: 0,
        endLevelIndex: Math.max(1, floorsCount - 1),
        continuesUp: futureFloors.planned
      }
    ];

    // -----------------------------------------------------------------------
    // PROPERTY-LEVEL PARKING (Dynamic Multi-Car & Underground Support)
    // -----------------------------------------------------------------------
    const parkingSpaces: ParkingSpaceModel[] = [];
    const carSlotWidth = 2500;
    const carSlotLength = 5000;

    for (let i = 0; i < carsCount; i++) {
      let slotX = 300 + i * (carSlotWidth + 200);
      let slotY = 0; // Front driveway yard (0 to 5000mm, strictly before groundFloorOriginY=5100mm)

      if (parkingLoc === 'SURFACE_PORCH') {
        slotX = 300 + i * (carSlotWidth + 200);
        slotY = 0; // Porch in front yard (0 to 5000mm < groundFloorOriginY=5100mm)
      } else if (parkingLoc === 'BASEMENT_UNDERGROUND') {
        slotX = originX + i * (carSlotWidth + 300);
        slotY = originY + 500;
      }

      parkingSpaces.push({
        id: `park_car_${i + 1}_site_${cIdx}`,
        type: 'CAR',
        location: parkingLoc,
        slotNumber: i + 1,
        positionMm: { x: slotX, y: slotY },
        dimensionsMm: { width: carSlotWidth, length: carSlotLength },
        allocatedLevelIndex: parkingLoc === 'BASEMENT_UNDERGROUND' ? -1 : 0
      });
    }

    // -----------------------------------------------------------------------
    // CALCULATIONS & METRICS (Across all N levels)
    // -----------------------------------------------------------------------
    const plotAreaSqm = Number(((plot.widthMm * plot.lengthMm) / 1_000_000).toFixed(2));
    const gfBoundingW = bayLeftW + bayRightW;
    const gfBoundingL = envL - ((parkingLoc === 'SURFACE_PORCH' && carsCount >= 1 ? 5000 : originY) - originY);
    const groundCoverageSqm = Number(((gfBoundingW * gfBoundingL) / 1_000_000).toFixed(2));
    const totalBuiltUpAreaSqm = Number(
      levels.reduce((sum, lvl) => sum + lvl.rooms.reduce((acc, r) => acc + r.areaSqm, 0), 0).toFixed(2)
    );
    const carpetAreaSqm = Number((totalBuiltUpAreaSqm * 0.82).toFixed(2)); // net carpet area
    const groundCoverageRatio = Number((groundCoverageSqm / plotAreaSqm).toFixed(3));

    // Assemble BuildingModel
    const buildingModel: BuildingModel = {
      id: candidateId,
      schemaVersion: '1.0.0',
      projectId,
      versionNumber: 1,
      metadata: {
        title: `${title} - ${config.name}`,
        createdAt: now,
        updatedAt: now,
        generatorVersion: '1.0.0',
        source: 'GENERATOR',
        changeDescription: config.description
      },
      site: {
        id: `site_${candidateId}`,
        dimensionsMm: { width: plot.widthMm, length: plot.lengthMm },
        boundary: siteBoundary,
        orientationNorthDegrees,
        roads,
        setbacksMm: setbacks,
        buildableBoundary: buildableEnvelope
      },
      levels,
      staircases,
      parkingSpaces,
      futureFloors: {
        planned: futureFloors.planned,
        count: futureFloors.count,
        note: 'Staircase continued vertically for future floor. Structural engineer verification required.'
      },
      calculations: {
        plotAreaSqm,
        groundCoverageSqm,
        groundCoverageRatio,
        totalBuiltUpAreaSqm,
        carpetAreaSqm
      },
      validation: {
        overallStatus: 'PASS',
        messages: [],
        disclaimer: DISCLAIMERS.PRELIMINARY_DESIGN
      }
    };

    // Run constraint and rule evaluations
    const constraintReport = validateBuildingConstraints(buildingModel);
    const regulatoryReport = evaluateRegulatoryCompliance(
      buildingModel,
      location.city,
      location.state
    );

    // Update validation metadata
    buildingModel.validation.overallStatus = constraintReport.isValid
      ? regulatoryReport.overallStatus
      : 'FAIL';

    buildingModel.validation.messages = [
      ...constraintReport.issues.map(i => ({
        severity: i.priority === 'HARD' ? ('ERROR' as const) : ('WARNING' as const),
        code: i.code,
        message: i.message
      })),
      ...regulatoryReport.rulesEvaluated
        .filter(r => r.status !== 'PASS')
        .map(r => ({
          severity: r.status === 'FAIL' ? ('ERROR' as const) : ('WARNING' as const),
          code: r.ruleId,
          message: `${r.parameter}: ${r.actualValue} (Required: ${r.requiredValue})`
        }))
    ];

    // Compute exact room counts
    const groundBedrooms = (levels[0]?.rooms || []).filter(
      (r: RoomModel) => r.type === 'BEDROOM' || r.type === 'MASTER_BEDROOM'
    ).length;
    const firstBedrooms = (levels[1]?.rooms || []).filter(
      (r: RoomModel) => r.type === 'BEDROOM' || r.type === 'MASTER_BEDROOM'
    ).length;

    candidates.push({
      candidateId,
      name: config.name,
      description: config.description,
      buildingModel,
      metrics: {
        plotAreaSqm,
        groundCoverageSqm,
        groundCoveragePercent: Math.round(groundCoverageRatio * 100),
        totalBuiltUpAreaSqm,
        carpetAreaSqm,
        bedroomCountGround: groundBedrooms,
        bedroomCountFirst: firstBedrooms,
        parkingCarsCount: parkingSpaces.length,
        vastuScore: constraintReport.vastuScore,
        regulatoryStatus: regulatoryReport.overallStatus
      }
    });
  }

  return candidates;
}
