# Developer Mode & Diagnostics Guide

BuildPlanner AI includes specialized developer diagnostics to allow architects, engineers, and contributors to inspect, test, and debug the underlying parametric models and geometry engines.

---

## 1. Inspecting the Canonical BuildingModel

In the web interface:
1. Open any project in the Workspace (`/projects/:id`).
2. Click the **"Export / Blueprint"** button in the header and select **"View Raw Canonical JSON"**, or press the Developer Mode button in the bottom-left status bar.
3. The interactive JSON inspector displays:
   - Full polygon vertices in millimeters
   - Deduplicated wall segments with thicknesses
   - Door positions and swing arcs
   - Detailed area statements (BUA, Carpet Area, Ground Coverage)
   - Complete statutory validation output

---

## 2. Live Parametric Tweaking via REPL / Tests

Developers can directly test planning logic, geometric transformations, and constraint checks using Vitest:

```bash
# Run Vitest in interactive watch mode
pnpm test:watch
```

### 2.1 Example: Instantiating and Mutating a Model in Code
```typescript
import { generatePlanningCandidates } from '@buildplanner/planning-engine';
import { executeAIOperation } from '@buildplanner/ai-engine';
import { validateBuildingConstraints } from '@buildplanner/constraint-engine';
import { ftToMm } from '@buildplanner/units';

// 1. Generate Bhubaneswar Villa
const candidates = generatePlanningCandidates({
  projectId: 'test_dev',
  plot: { widthMm: ftToMm(30), lengthMm: ftToMm(40) },
  roads: {
    NORTH: { enabled: true, widthMm: ftToMm(30), type: 'ACCESS' },
    WEST: { enabled: true, widthMm: ftToMm(40), type: 'MAIN' },
    SOUTH: { enabled: false, widthMm: 0, type: 'ACCESS' },
    EAST: { enabled: false, widthMm: 0, type: 'ACCESS' }
  },
  floorsCount: 2,
  floorRequirements: [ /* ... */ ],
  parking: { cars: 1 }
});

const model = candidates[0].buildingModel;

// 2. Perform safe mutation
const result = executeAIOperation(model, {
  operation: 'CHANGE_STAIRCASE_TYPE',
  parameters: {
    stairId: model.staircases[0].id,
    type: 'STRAIGHT'
  }
});

console.log(result.success); // true
console.log(result.updatedModel?.staircases[0].type); // 'STRAIGHT'
```

---

## 3. Verifying Monorepo Health

```bash
# Run all 44 unit and integration test suites
pnpm test

# Run strict TypeScript typechecking across all 11 packages & apps
pnpm typecheck

# Build all production artifacts
pnpm build
```

---

## 4. Zero-Setup Database Architecture

To ensure any developer can clone the repository and run it immediately without setting up Docker or a local MongoDB service:
- `apps/api/src/config/db.ts` checks for `process.env.MONGODB_URI`.
- If absent, it spins up an embedded instance of `mongodb-memory-server` automatically.
- All collections and indexes are initialized transparently in memory.
- In CI/CD pipelines and local test runners, tests execute instantly with zero network or external dependencies.
