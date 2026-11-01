import { create } from 'zustand';
import { BuildingModel, RoomModel, WallModel, DoorModel, WindowModel } from '@buildplanner/building-model';

export type ViewMode = '2D' | '3D' | 'SPLIT';
export type EditorTool = 'SELECT' | 'PAN' | 'ROOM' | 'WALL' | 'DOOR' | 'WINDOW' | 'DIMENSION';
export type SelectedEntityType = 'ROOM' | 'WALL' | 'DOOR' | 'WINDOW' | 'PARKING' | 'STAIR' | null;

interface EditorState {
  activeProjectId: string | null;
  buildingModel: BuildingModel | null;
  activeLevelIndex: number;
  viewMode: ViewMode;
  activeTool: EditorTool;
  selectedId: string | null;
  selectedType: SelectedEntityType;
  zoom: number;
  pan: { x: number; y: number };
  undoStack: BuildingModel[];
  redoStack: BuildingModel[];
  isSaving: boolean;

  // Actions
  setModel: (model: BuildingModel) => void;
  updateModel: (updater: (prev: BuildingModel) => BuildingModel, recordHistory?: boolean) => void;
  setActiveProject: (projectId: string | null) => void;
  setActiveLevelIndex: (index: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveTool: (tool: EditorTool) => void;
  setSelectedEntity: (id: string | null, type: SelectedEntityType) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  activeProjectId: null,
  buildingModel: null,
  activeLevelIndex: 0,
  viewMode: '2D',
  activeTool: 'SELECT',
  selectedId: null,
  selectedType: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  undoStack: [],
  redoStack: [],
  isSaving: false,

  setModel: (model) => {
    set({
      buildingModel: model,
      undoStack: [],
      redoStack: [],
      selectedId: null,
      selectedType: null
    });
  },

  updateModel: (updater, recordHistory = true) => {
    const current = get().buildingModel;
    if (!current) return;

    if (recordHistory) {
      set((state) => ({
        undoStack: [...state.undoStack.slice(-20), JSON.parse(JSON.stringify(current))],
        redoStack: []
      }));
    }

    const next = updater(JSON.parse(JSON.stringify(current)));
    set({ buildingModel: next });
  },

  setActiveProject: (projectId) => set({ activeProjectId: projectId }),
  setActiveLevelIndex: (index) => set({ activeLevelIndex: index, selectedId: null, selectedType: null }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedEntity: (id, type) => set({ selectedId: id, selectedType: type }),
  setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(zoom, 5)) }),
  setPan: (pan) => set({ pan }),

  undo: () => {
    const { undoStack, redoStack, buildingModel } = get();
    if (undoStack.length === 0 || !buildingModel) return;

    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);

    set({
      buildingModel: previous,
      undoStack: newUndo,
      redoStack: [buildingModel, ...redoStack.slice(0, 20)]
    });
  },

  redo: () => {
    const { undoStack, redoStack, buildingModel } = get();
    if (redoStack.length === 0 || !buildingModel) return;

    const next = redoStack[0];
    const newRedo = redoStack.slice(1);

    set({
      buildingModel: next,
      undoStack: [...undoStack, buildingModel],
      redoStack: newRedo
    });
  }
}));
