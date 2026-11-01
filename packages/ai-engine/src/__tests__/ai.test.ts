import { describe, it, expect } from 'vitest';
import { executeAIOperation, MockAIProvider } from '../index';
import { createDefaultBuildingModel } from '@buildplanner/building-model';
import { ftToMm } from '@buildplanner/units';

describe('AI Engine & Copilot Operations', () => {
  it('executes RESIZE_ROOM operation and updates canonical BuildingModel', () => {
    const model = createDefaultBuildingModel({
      id: 'ai_model_test',
      projectId: 'proj_ai',
      plotWidthMm: 9144,
      plotLengthMm: 12192
    });

    // Add room to level 0
    model.levels[0].rooms.push({
      id: 'room_master_bed',
      name: 'Master Bedroom',
      type: 'MASTER_BEDROOM',
      levelIndex: 0,
      polygon: [
        { x: 1000, y: 1500 },
        { x: 4000, y: 1500 },
        { x: 4000, y: 5500 },
        { x: 1000, y: 5500 }
      ],
      bounds: { minX: 1000, minY: 1500, maxX: 4000, maxY: 5500, widthMm: 3000, lengthMm: 4000 },
      areaSqm: 12,
      zone: 'PRIVATE'
    });

    const newW = ftToMm(12); // ~3658 mm
    const newL = ftToMm(14); // ~4267 mm

    const res = executeAIOperation(model, {
      operation: 'RESIZE_ROOM',
      parameters: {
        roomId: 'room_master_bed',
        widthMm: newW,
        lengthMm: newL
      }
    });

    expect(res.success).toBe(true);
    expect(res.updatedModel).toBeDefined();
    expect(res.updatedModel!.versionNumber).toBe(2);

    const updatedRoom = res.updatedModel!.levels[0].rooms.find(r => r.id === 'room_master_bed');
    expect(updatedRoom!.bounds.widthMm).toBe(newW);
    expect(updatedRoom!.bounds.lengthMm).toBe(newL);
  });

  it('handles natural language command in MockAIProvider', async () => {
    const model = createDefaultBuildingModel({
      id: 'ai_model_test_chat',
      projectId: 'proj_ai_chat',
      plotWidthMm: 9144,
      plotLengthMm: 12192
    });

    model.levels[0].rooms.push({
      id: 'room_master_bed',
      name: 'Master Bedroom',
      type: 'MASTER_BEDROOM',
      levelIndex: 0,
      polygon: [
        { x: 1000, y: 1500 },
        { x: 4000, y: 1500 },
        { x: 4000, y: 5500 },
        { x: 1000, y: 5500 }
      ],
      bounds: { minX: 1000, minY: 1500, maxX: 4000, maxY: 5500, widthMm: 3000, lengthMm: 4000 },
      areaSqm: 12,
      zone: 'PRIVATE'
    });

    const provider = new MockAIProvider();
    const chatRes = await provider.chat(
      { model, activeLevelIndex: 0 },
      'make master bedroom 12 by 14 feet'
    );

    expect(chatRes.operationApplied).toBe(true);
    expect(chatRes.reply).toContain('Master Bedroom');
    expect(chatRes.updatedModel).toBeDefined();
    expect(chatRes.updatedModel!.versionNumber).toBe(2);
  });
});
