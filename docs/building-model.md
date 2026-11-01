# Canonical BuildingModel Specification

The **`BuildingModel`** is the canonical, single-source-of-truth data structure for BuildPlanner AI. It completely specifies a building's geometry, spatial organization, structural components, regulatory metrics, and lifecycle metadata.

---

## 1. Coordinate Standard & Units

- **Distance Standard**: All coordinates, dimensions, offsets, and thicknesses are stored as 64-bit IEEE floating-point numbers in **millimeters ($mm$)**.
- **Area Standard**: Stored in **square meters ($m^2$)** rounded to 2 decimal places.
- **Orientation**: Standard Cartesian 2D plane:
  - Coordinate $(0, 0)$ is the front-left (South-West or custom origin) corner of the plot.
  - $+X$ extends to the right (East / Plot Width).
  - $+Y$ extends into the plot depth (North / Plot Length).
  - $+Z$ (Elevation) extends vertically upwards in 3D.
- **Angles**: Expressed in degrees $[0, 360)$ where $0^\circ$ corresponds to North along the $+Y$ axis.

---

## 2. Top-Level Entity Schema

```typescript
interface BuildingModel {
  id: string;                               // Unique UUID or slug
  schemaVersion: '1.0.0';                   // Semantic schema version
  projectId: string;                        // Associated project ID
  versionNumber: number;                    // Monotonically increasing revision number (V1, V2...)
  metadata: {
    title: string;                          // Human-readable title
    createdAt: string;                      // ISO-8601 timestamp
    updatedAt: string;                      // ISO-8601 timestamp
    generatorVersion: string;               // Version of Planning Engine used
    source: 'GENERATOR' | 'USER_EDIT' | 'AI_COMMAND';
    changeDescription?: string;             // Audit log description of revision
  };
  site: SiteModel;                          // Plot dimensions, boundaries, setbacks, roads
  levels: LevelModel[];                     // Floor levels containing rooms, walls, openings
  staircases: StaircaseModel[];             // Vertical circulation cores
  parkingSpaces: ParkingSpaceModel[];       // On-site vehicular bays
  futureFloors: {
    planned: boolean;                       // Future vertical expansion intent
    count: number;                          // Number of prospective additional floors
    note: string;                           // Structural advisory notice
  };
  calculations: BuildingCalculations;       // Plot, Coverage, FSI/FAR, BUA, Carpet areas
  validation: ValidationSummary;            // Compliance statuses, messages, disclaimers
}
```

---

## 3. Sub-Component Models

### 3.1 `SiteModel`
Defines the cadastral parcel, abutting public roads, and statutory setbacks:

```typescript
interface SiteModel {
  id: string;
  dimensionsMm: { width: number; length: number };
  boundary: Point2D[];                      // Polygon representing the legal plot boundary
  orientationNorthDegrees: number;          // Angle of True North (0 to 360)
  roads: {
    NORTH: RoadInfo;
    SOUTH: RoadInfo;
    EAST: RoadInfo;
    WEST: RoadInfo;
  };
  setbacksMm: {
    front: number;                          // Road-facing statutory clearance
    rear: number;                           // Rear boundary clearance
    side1: number;                          // Left side clearance
    side2: number;                          // Right side clearance
  };
  buildableBoundary: Point2D[];             // Inset polygon restricting habitable construction
}
```

### 3.2 `LevelModel` (Floors)
Defines each horizontal floor slab:

```typescript
interface LevelModel {
  id: string;
  name: string;                             // e.g. "Ground Floor", "First Floor"
  levelIndex: number;                       // 0 for Ground, 1 for First, etc.
  elevationMm: number;                      // Finished floor level (FFL) above plinth
  heightMm: number;                         // Floor-to-floor ceiling height (default 3000mm)
  rooms: RoomModel[];
  walls: WallModel[];
  doors: DoorModel[];
  windows: WindowModel[];
}
```

### 3.3 `RoomModel`
Defines an enclosed architectural room:

```typescript
interface RoomModel {
  id: string;
  name: string;                             // e.g. "Master Bedroom", "Puja Room"
  type: RoomType;                           // LIVING, DINING, KITCHEN, BEDROOM, etc.
  levelIndex: number;
  polygon: Point2D[];                       // Exact closed 2D polygon in millimeters
  bounds: BoundingBox;                      // Axis-aligned bounding box (minX, minY, maxX, maxY)
  areaSqm: number;                          // Net floor area in square meters
  zone: 'PUBLIC' | 'PRIVATE' | 'SERVICE' | 'CIRCULATION' | 'OUTDOOR';
  attachedToRoomId?: string;                // e.g. for attached ensuite bathrooms
  vastuZone?: string;                       // Computed cardinal quadrant (e.g. "NORTH_EAST")
  vastuScore?: number;                      // Individual Vastu rating (0 - 10)
}
```

### 3.4 `WallModel`
Parametric structural or partition wall deduced from room boundaries:

```typescript
interface WallModel {
  id: string;
  startPoint: Point2D;
  endPoint: Point2D;
  thicknessMm: number;                      // 200mm for exterior load-bearing, 100mm for interior
  heightMm: number;                         // Default 3000mm
  type: 'EXTERIOR' | 'INTERIOR' | 'PARTITION';
  levelIndex: number;
  isExterior: boolean;
}
```

### 3.5 `StaircaseModel`
Vertical circulation flight with verified riser and tread geometry:

```typescript
interface StaircaseModel {
  id: string;
  type: 'DOG_LEGGED_U' | 'STRAIGHT' | 'L_SHAPED';
  startPoint: Point2D;
  dimensionsMm: { width: number; length: number };
  flightWidthMm: number;                    // Clear flight width (min 1000mm)
  riserMm: number;                          // 150mm standard
  treadMm: number;                          // 250mm standard
  stepCount: number;                        // Number of risers per story
  landingWidthMm: number;                   // Mid-landing depth
  startLevelIndex: number;
  endLevelIndex: number;
  continuesUp: boolean;                     // Structural core continuation for future floors
}
```

### 3.6 `ParkingSpaceModel`
Vehicular parking bay:

```typescript
interface ParkingSpaceModel {
  id: string;
  type: 'CAR' | 'MOTORCYCLE' | 'BICYCLE';
  positionMm: Point2D;
  dimensionsMm: { width: number; length: number }; // 2500 x 5000mm for car
  allocatedLevelIndex: number;
}
```

---

## 4. Calculations & Area Statements

The canonical model automatically maintains certified architectural area calculations:

- **Plot Area ($m^2$)**: $\frac{\text{Plot Width} \times \text{Plot Length}}{1,000,000}$
- **Ground Coverage Area ($m^2$)**: Total footprint area of ground floor enclosed rooms.
- **Ground Coverage Ratio**: $\frac{\text{Ground Coverage Area}}{\text{Plot Area}}$
- **Total Built-Up Area (BUA) ($m^2$)**: Sum of covered floor areas across all levels.
- **Carpet Area ($m^2$)**: Net usable internal floor area (typically calculated at $82\%$ of Built-Up Area under RERA / NBC norms).
