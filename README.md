# BuildPlanner AI

<div align="center">

# 🏛️ BuildPlanner AI
### *"Describe your property. Build your plan."*

**Production-grade, end-to-end parametric architecture planning platform.**  
Transforms real-world property dimensions and spatial requirements into verified, constructible, canonical building blueprints.

[![CI Tests](https://img.shields.io/badge/tests-44%20passed-brightgreen.svg)](tests/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.173-black.svg)](https://threejs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

</div>

---

## 🌟 Why BuildPlanner AI?

Mainstream generative AI models generate static raster images with non-functional geometry: stairs that lead to ceilings, bedrooms without doors, floating walls, and illegal room sizes that violate municipal bye-laws.

**BuildPlanner AI is fundamentally different.** It is built on a **Deterministic Computational Geometry Pipeline**:

$$\text{User Requirements} \longrightarrow \text{Planning Engine} \longrightarrow \text{Parametric Geometry Engine} \longrightarrow \text{Canonical BuildingModel}$$

$$\text{Canonical BuildingModel} \longrightarrow \begin{cases} \text{Interactive 2D SVG Blueprint Canvas} \\ \text{Interactive 3D WebGL Three.js Viewport} \\ \text{Statutory Rule Engine (BDA / OBRPS 2020)} \\ \text{Constraint Engine (NBC 2016 Standards & 9-Zone Vastu)} \\ \text{Vector Drawing Engine (SVG / PDF Sheet Exports)} \\ \text{AI Architectural Copilot (Parametric Mutations)} \end{cases}$$

Every view, calculation, compliance check, and modification operates on a single canonical source of truth in millimeters.

---

## 🚀 Key Features

- 📐 **Single Source of Truth (`BuildingModel`)**: Complete JSON schema specifying boundary coordinates, levels, rooms, deduplicated walls, doors, windows, stairs, parking, and calculations.
- ⚡ **Bhubaneswar G+1 Villa Acceptance**: Real-world benchmark on a $30 \times 40\text{ ft}$ plot with North and West road frontages:
  - **Ground Floor**: Strictly 2 Bedrooms (Master + Bed 2), Living, Dining, Kitchen, Puja Room, 2 Bathrooms.
  - **First Floor**: Strictly 2 Bedrooms (Master 2 + Bed 3), Family Lounge, Dining, Kitchen, 2 Bathrooms, Front Balcony.
  - **Site Parking**: Strictly 1 dedicated off-street car parking bay.
  - **Vertical Core**: Aligned dog-legged staircase with continuous vertical expansion capability for future floors.
- 🎨 **Multi-Candidate Synthesis**: Produces 3 viable layouts per prompt:
  - **Candidate A**: Classic Vastu-Compliant Villa (South-East kitchen, South-West master suite, North-East puja).
  - **Candidate B**: Contemporary Open-Plan Villa (Flowing living/dining, expansive natural cross-ventilation).
  - **Candidate C**: Courtyard Light-Well Villa (Central illumination shaft for dense urban sites).
- 📜 **Statutory Rule Engine (Never Hallucinates)**:
  - Verified rules for **Bhubaneswar Development Authority (BDA / OBRPS 2020)**: Ground coverage $\le 65\%$, road-facing front setback, rear/side clearances, low-rise height limit, and parking ratios.
  - Unverified locations output `UNKNOWN` with citations to National Building Code (NBC 2016 Part 3).
- 🤖 **AI Architectural Copilot**:
  - Translates natural language commands into typed mutation operations (`RESIZE_ROOM`, `MOVE_ROOM`, `ADD_ROOM`, `DELETE_ROOM`, `CHANGE_STAIRCASE_TYPE`).
  - Implements an atomic **Self-Correction Validation Loop** that rolls back operations if geometric collisions or setback encroachments occur.
- 🖥️ **Interactive Viewports**:
  - **2D Architectural Canvas**: Real-time pan, zoom, grid, snap, room selection, and wall/opening inspection.
  - **3D Three.js Viewport**: Real-time WebGL extrusions with floor isolation (Ground / First / All) and dynamic sunlight angle simulation.
- 🖨️ **Vector Drawing Export Package**:
  - Scaled 2D SVG architectural floor plans with door swing arcs, window double-lines, and room stamps.
  - Scaled North and West orthographic elevations with plinth line, floor slabs, windows, and roof parapet.

---

## 🏗️ Monorepo Architecture

```
buildplanner-ai/
├── apps/
│   ├── api/                     # Node.js + Express REST API (Mongoose / MemoryDB)
│   └── web/                     # React 19 + Vite 6 + Tailwind CSS + Three.js
├── packages/
│   ├── units/                   # Millimeter standard, composite ft-in parser & unit converters
│   ├── shared/                  # Standard errors, disclaimers, API response envelope
│   ├── building-model/          # Canonical BuildingModel schema (Zod) and type definitions
│   ├── geometry-engine/         # 2D Point/Polygon math, wall deduction, openings, stairs
│   ├── constraint-engine/       # Hard geometric constraints, NBC 2016 standards, 9-zone Vastu
│   ├── rule-engine/             # Bhubaneswar BDA / OBRPS 2020 regulatory compliance
│   ├── planning-engine/         # Deterministic candidate layout generator (Candidate A, B, C)
│   ├── ai-engine/               # Typed AI operation execution, prompt parsing, self-correction
│   └── drawing-engine/          # Procedural 2D SVG floor plans, North/West orthographic elevations
├── docs/                        # Complete technical specifications & design docs
├── tests/                       # End-to-end integration and scenario acceptance test suites
├── docker-compose.yml           # Production multi-container orchestration
└── package.json                 # Monorepo root configuration
```

---

## 🚦 Quick Start

### 1. Zero-Setup Local Development (Node.js & pnpm)

You do not need an external database or cloud keys to run BuildPlanner AI locally:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/buildplanner-ai.git
cd buildplanner-ai

# 2. Install workspace dependencies
pnpm install

# 3. Build shared packages
pnpm -r --filter "@buildplanner/*" run build

# 4. Start API and Web servers concurrently
pnpm dev
```

- **Web Frontend**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:5000/api](http://localhost:5000/api)

### 2. Containerized Stack (Docker Compose)

Run the full production stack with MongoDB, Express API, and Nginx Web in Docker:

```bash
docker compose up -d --build
```

- **Web Application**: [http://localhost](http://localhost)
- **API Server**: [http://localhost:5000/api](http://localhost:5000/api)

---

## 🧪 Testing & Verification

BuildPlanner AI includes a comprehensive test suite covering mathematical geometry, unit conversions, schema validation, candidate generation, regulatory compliance, vector drawings, and AI mutations:

```bash
# Run all 44 unit, integration, and scenario tests
pnpm test

# Run strict TypeScript typechecking across all 11 packages and apps
pnpm typecheck

# Build all production bundles
pnpm build
```

---

## 📚 Technical Documentation Index

Detailed specifications and architectural deep dives are available in the [`docs/`](docs/) directory:

- [System Architecture](docs/architecture.md) — Reactive pipeline, data flow, and technology choices
- [Canonical BuildingModel](docs/building-model.md) — Schema, coordinate standards, and entity models
- [Geometry Engine](docs/geometry-engine.md) — Shoelace area, ray casting, wall deduction, and stair ergonomics
- [Planning Engine](docs/planning-engine.md) — Procedural synthesis, candidate variations, and Bhubaneswar villa specs
- [Rule Engine & Compliance](docs/rule-engine.md) — BDA / OBRPS 2020 bye-laws, NBC 2016 norms, and never-hallucinate policy
- [AI Copilot System](docs/ai-system.md) — Typed operation schemas, intent parsing, and collision rollback loop
- [REST API Reference](docs/api.md) — Endpoints, payloads, authentication, and drawing exports
- [Deployment & Operations](docs/deployment.md) — Docker, environment variables, and cloud production architecture
- [Developer Mode Guide](docs/developer-mode.md) — Diagnostics, live model inspection, and local testing

---

## ⚖️ Architectural Disclaimer

*BuildPlanner AI generates preliminary architectural planning concepts based on user inputs, computational geometry, and codified municipal bye-laws. All designs, calculations, structural concepts, and regulatory checks must be verified and certified by a registered architect and licensed structural engineer prior to construction or statutory municipal submission.*
