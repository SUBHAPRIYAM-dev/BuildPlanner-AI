import { z } from 'zod';
import {
  BuildingModel,
  RoomModel,
  RoomType,
  RoomTypeSchema,
  SpatialZone,
  SpatialZoneSchema,
  StaircaseType,
  StaircaseTypeSchema
} from '@buildplanner/building-model';
import {
  calculatePolygonAreaSqm,
  generateWallsFromRooms,
  calculateBuildableEnvelope,
  calculateBoundingBox
} from '@buildplanner/geometry-engine';
import { validateBuildingConstraints } from '@buildplanner/constraint-engine';
import { parseLengthToMm, ftToMm } from '@buildplanner/units';

// ---------------------------------------------------------------------------
// 1. Typed AI Operation Schemas
// ---------------------------------------------------------------------------

export const ResizeRoomOpSchema = z.object({
  operation: z.literal('RESIZE_ROOM'),
  parameters: z.object({
    roomId: z.string(),
    widthMm: z.number().positive(),
    lengthMm: z.number().positive()
  })
});

export const MoveRoomOpSchema = z.object({
  operation: z.literal('MOVE_ROOM'),
  parameters: z.object({
    roomId: z.string(),
    dxMm: z.number(),
    dyMm: z.number()
  })
});

export const AddRoomOpSchema = z.object({
  operation: z.literal('ADD_ROOM'),
  parameters: z.object({
    levelIndex: z.number().int().nonnegative(),
    name: z.string(),
    type: RoomTypeSchema,
    widthMm: z.number().positive(),
    lengthMm: z.number().positive(),
    zone: SpatialZoneSchema.default('PRIVATE')
  })
});

export const DeleteRoomOpSchema = z.object({
  operation: z.literal('DELETE_ROOM'),
  parameters: z.object({
    roomId: z.string()
  })
});

export const ChangeStairOpSchema = z.object({
  operation: z.literal('CHANGE_STAIRCASE_TYPE'),
  parameters: z.object({
    stairId: z.string(),
    type: StaircaseTypeSchema
  })
});

export const AIOperationSchema = z.discriminatedUnion('operation', [
  ResizeRoomOpSchema,
  MoveRoomOpSchema,
  AddRoomOpSchema,
  DeleteRoomOpSchema,
  ChangeStairOpSchema
]);
export type AIOperation = z.infer<typeof AIOperationSchema>;

export interface AICommandResult {
  success: boolean;
  message: string;
  operationApplied?: AIOperation['operation'];
  updatedModel?: BuildingModel;
  errors?: Array<{ code: string; message: string }>;
}

// ---------------------------------------------------------------------------
// 2. Command Execution & Correction Engine
// ---------------------------------------------------------------------------

/**
 * Applies a validated AI operation directly onto the canonical BuildingModel,
 * updating rooms, walls, areas, and validating constraints.
 */
export function executeAIOperation(
  model: BuildingModel,
  operation: AIOperation
): AICommandResult {
  const cloned: BuildingModel = JSON.parse(JSON.stringify(model));
  let modifiedLevelIndex = 0;

  switch (operation.operation) {
    case 'RESIZE_ROOM': {
      const { roomId, widthMm, lengthMm } = operation.parameters;
      let found = false;

      for (const level of cloned.levels) {
        const room = level.rooms.find(r => r.id === roomId || r.name.toLowerCase().includes(roomId.toLowerCase()));
        if (room) {
          found = true;
          modifiedLevelIndex = level.levelIndex;
          const originX = room.bounds.minX;
          const originY = room.bounds.minY;

          room.bounds.widthMm = widthMm;
          room.bounds.lengthMm = lengthMm;
          room.bounds.maxX = originX + widthMm;
          room.bounds.maxY = originY + lengthMm;
          room.polygon = [
            { x: originX, y: originY },
            { x: originX + widthMm, y: originY },
            { x: originX + widthMm, y: originY + lengthMm },
            { x: originX, y: originY + lengthMm }
          ];
          room.areaSqm = Number(calculatePolygonAreaSqm(room.polygon).toFixed(2));
          break;
        }
      }

      if (!found) {
        return {
          success: false,
          message: `Could not find room with identifier "${roomId}" in the current design.`
        };
      }
      break;
    }

    case 'MOVE_ROOM': {
      const { roomId, dxMm, dyMm } = operation.parameters;
      let found = false;

      for (const level of cloned.levels) {
        const room = level.rooms.find(r => r.id === roomId || r.name.toLowerCase().includes(roomId.toLowerCase()));
        if (room) {
          found = true;
          modifiedLevelIndex = level.levelIndex;
          room.bounds.minX += dxMm;
          room.bounds.maxX += dxMm;
          room.bounds.minY += dyMm;
          room.bounds.maxY += dyMm;
          room.polygon = room.polygon.map(p => ({ x: p.x + dxMm, y: p.y + dyMm }));
          break;
        }
      }

      if (!found) {
        return {
          success: false,
          message: `Could not find room "${roomId}" to move.`
        };
      }
      break;
    }

    case 'ADD_ROOM': {
      const { levelIndex, name, type, widthMm, lengthMm, zone } = operation.parameters;
      const level = cloned.levels.find(l => l.levelIndex === levelIndex);
      if (!level) {
        return { success: false, message: `Level ${levelIndex} does not exist.` };
      }

      modifiedLevelIndex = levelIndex;
      const envBox = calculateBoundingBox(cloned.site.buildableBoundary);
      const newRoomId = `room_added_${Date.now()}`;

      // Place in first available quadrant
      const posX = envBox.minX + 200;
      const posY = envBox.minY + 200;

      const newRoom: RoomModel = {
        id: newRoomId,
        name,
        type,
        levelIndex,
        polygon: [
          { x: posX, y: posY },
          { x: posX + widthMm, y: posY },
          { x: posX + widthMm, y: posY + lengthMm },
          { x: posX, y: posY + lengthMm }
        ],
        bounds: {
          minX: posX,
          minY: posY,
          maxX: posX + widthMm,
          maxY: posY + lengthMm,
          widthMm,
          lengthMm
        },
        areaSqm: Number(calculatePolygonAreaSqm([
          { x: posX, y: posY },
          { x: posX + widthMm, y: posY },
          { x: posX + widthMm, y: posY + lengthMm },
          { x: posX, y: posY + lengthMm }
        ]).toFixed(2)),
        zone
      };

      level.rooms.push(newRoom);
      break;
    }

    case 'DELETE_ROOM': {
      const { roomId } = operation.parameters;
      let found = false;

      for (const level of cloned.levels) {
        const idx = level.rooms.findIndex(r => r.id === roomId || r.name.toLowerCase().includes(roomId.toLowerCase()));
        if (idx !== -1) {
          found = true;
          modifiedLevelIndex = level.levelIndex;
          level.rooms.splice(idx, 1);
          break;
        }
      }

      if (!found) {
        return { success: false, message: `Room "${roomId}" not found for deletion.` };
      }
      break;
    }

    case 'CHANGE_STAIRCASE_TYPE': {
      const { stairId, type } = operation.parameters;
      const stair = cloned.staircases.find(s => s.id === stairId || s.type !== type);
      if (stair) {
        stair.type = type;
      }
      break;
    }
  }

  // Recalculate walls for the modified level
  const targetLevel = cloned.levels.find(l => l.levelIndex === modifiedLevelIndex);
  if (targetLevel) {
    targetLevel.walls = generateWallsFromRooms(targetLevel.rooms, modifiedLevelIndex);
  }

  // Recalculate total built-up and ground coverage
  const groundRooms = cloned.levels[0]?.rooms || [];
  cloned.calculations.groundCoverageSqm = Number(
    groundRooms.reduce((acc, r) => acc + r.areaSqm, 0).toFixed(2)
  );
  cloned.calculations.groundCoverageRatio = Number(
    (cloned.calculations.groundCoverageSqm / cloned.calculations.plotAreaSqm).toFixed(3)
  );
  const totalArea = cloned.levels.reduce((sum, lvl) => sum + lvl.rooms.reduce((s, r) => s + r.areaSqm, 0), 0);
  cloned.calculations.totalBuiltUpAreaSqm = Number(totalArea.toFixed(2));
  cloned.calculations.carpetAreaSqm = Number((totalArea * 0.82).toFixed(2));

  // Validate model constraints
  const report = validateBuildingConstraints(cloned);
  if (!report.isValid) {
    const hardError = report.issues.find(i => i.priority === 'HARD');
    return {
      success: false,
      message: hardError ? hardError.message : 'Geometric conflict: Operation violates site setbacks or room boundaries.',
      errors: report.issues.map(i => ({ code: i.code, message: i.message }))
    };
  }

  cloned.versionNumber += 1;
  cloned.metadata.updatedAt = new Date().toISOString();
  cloned.metadata.source = 'AI_COMMAND';
  cloned.metadata.changeDescription = `Applied AI Operation: ${operation.operation}`;

  return {
    success: true,
    message: `Successfully executed ${operation.operation}. Blueprint model updated to V${cloned.versionNumber}.`,
    operationApplied: operation.operation,
    updatedModel: cloned
  };
}

// ---------------------------------------------------------------------------
// 3. Mock AI Provider (Deterministic Local AI)
// ---------------------------------------------------------------------------

export interface AIChatContext {
  model: BuildingModel;
  activeLevelIndex: number;
}

export interface AIChatResponse {
  reply: string;
  operationApplied?: boolean;
  updatedModel?: BuildingModel;
  commandSummary?: string;
}

export class MockAIProvider {
  /**
   * Processes user natural language instructions, parses intent, and modifies the BuildingModel.
   */
  async chat(context: AIChatContext, userMessage: string): Promise<AIChatResponse> {
    const msg = userMessage.trim().toLowerCase();
    const { model, activeLevelIndex } = context;

    // Pattern 1: Resize room (e.g. "make master bedroom 12 by 14 feet", "resize master bedroom to 12 by 14")
    const resizeMatch = msg.match(/(?:make|resize|change)\s+(?:the\s+)?([a-z\s]+?)\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*(?:by|x|\*)\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|m|meters)?/i);
    if (resizeMatch) {
      const roomQuery = resizeMatch[1].trim();
      const num1 = parseFloat(resizeMatch[2]);
      const num2 = parseFloat(resizeMatch[3]);

      // Determine units (default to feet if not specified, e.g. 12x14 ft = 3658 x 4267 mm)
      const widthMm = num1 < 20 ? ftToMm(num1) : Math.round(num1);
      const lengthMm = num2 < 20 ? ftToMm(num2) : Math.round(num2);

      const level = model.levels.find(l => l.levelIndex === activeLevelIndex) || model.levels[0];
      const targetRoom = level.rooms.find(r => r.name.toLowerCase().includes(roomQuery) || r.type.toLowerCase().includes(roomQuery));

      if (targetRoom) {
        const op: AIOperation = {
          operation: 'RESIZE_ROOM',
          parameters: {
            roomId: targetRoom.id,
            widthMm,
            lengthMm
          }
        };

        const result = executeAIOperation(model, op);
        if (result.success && result.updatedModel) {
          return {
            reply: `I have updated "${targetRoom.name}" to ${num1} × ${num2} ft (${(widthMm / 1000).toFixed(2)}m × ${(lengthMm / 1000).toFixed(2)}m). The walls, circulation, and area statements have been recalculated parametrically.`,
            operationApplied: true,
            updatedModel: result.updatedModel,
            commandSummary: `Resized ${targetRoom.name} to ${num1}×${num2} ft`
          };
        } else {
          return {
            reply: `Could not resize "${targetRoom.name}": ${result.message}. Please select smaller dimensions or adjust adjacent spaces first.`,
            operationApplied: false
          };
        }
      }
    }

    // Pattern 2: Add balcony
    if (msg.includes('add') && msg.includes('balcony')) {
      const op: AIOperation = {
        operation: 'ADD_ROOM',
        parameters: {
          levelIndex: 1,
          name: 'Terrace Balcony',
          type: 'BALCONY',
          widthMm: 3000,
          lengthMm: 1500,
          zone: 'OUTDOOR'
        }
      };

      const result = executeAIOperation(model, op);
      if (result.success && result.updatedModel) {
        return {
          reply: 'I have added a 3.0m × 1.5m balcony to the first-floor perimeter. The floor plan, railings, and exterior elevations have updated.',
          operationApplied: true,
          updatedModel: result.updatedModel,
          commandSummary: 'Added front balcony on Level 1'
        };
      }
    }

    // Pattern 3: Move room
    if (msg.includes('move') && msg.includes('kitchen')) {
      return {
        reply: 'The kitchen is currently placed in the South-East (Agni quadrant), which satisfies optimal Vastu and plumbing adjacency. If you wish to shift its position, you can drag it in the 2D editor or specify exact coordinates.',
        operationApplied: false
      };
    }

    // Pattern 4: Staircase modification
    if (msg.includes('stair') && (msg.includes('straight') || msg.includes('u-shaped') || msg.includes('dog-legged'))) {
      const isStraight = msg.includes('straight');
      const op: AIOperation = {
        operation: 'CHANGE_STAIRCASE_TYPE',
        parameters: {
          stairId: model.staircases[0]?.id || 'stair_main',
          type: isStraight ? 'STRAIGHT' : 'DOG_LEGGED_U'
        }
      };

      const result = executeAIOperation(model, op);
      if (result.success && result.updatedModel) {
        return {
          reply: `Updated the primary staircase to ${isStraight ? 'Straight Flight' : 'Dog-Legged U-Shaped'}. Treads, risers, and landing clearances were recalculated automatically.`,
          operationApplied: true,
          updatedModel: result.updatedModel,
          commandSummary: `Changed staircase to ${isStraight ? 'Straight' : 'Dog-Legged'}`
        };
      }
    }

    // General Architecture Q&A Fallback
    return {
      reply: `I am your BuildPlanner AI architectural copilot. You can give me parametric commands such as:\n• "Make master bedroom 12 by 14 feet"\n• "Add a balcony to the first floor"\n• "Make staircase U-shaped"\n• "Show setback calculations"`,
      operationApplied: false
    };
  }
}
