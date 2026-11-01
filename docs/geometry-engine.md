# Geometry Engine — Technical Reference

`@buildplanner/geometry-engine` is the computational geometry core powering spatial analysis, parametric wall deduction, setback clipping, and opening calculations.

---

## 1. Core Mathematical Algorithms

### 1.1 Shoelace Area Calculation
To compute exact geometric area for arbitrary polygons, the engine implements Gauss's area formula (Shoelace algorithm):

$$A = \frac{1}{2} \left| \sum_{i=0}^{n-1} (x_i y_{i+1} - x_{i+1} y_i) \right|$$

With conversion from $mm^2$ to $m^2$:

```typescript
export function calculatePolygonAreaSqm(poly: Point2D[]): number {
  if (poly.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    area += poly[i].x * poly[j].y;
    area -= poly[j].x * poly[i].y;
  }
  return Math.abs(area / 2) / 1_000_000;
}
```

### 1.2 Point-in-Polygon (Ray Casting)
Implements the Jordan Curve Theorem (odd-even rule) to test whether a coordinate lies within a boundary:

```typescript
export function isPointInPolygon(point: Point2D, poly: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
```

### 1.3 Polygon Overlap Detection
Rooms on the same floor level cannot overlap. The engine utilizes Separating Axis Theorem (SAT) and intersection testing for bounding boxes and polygon interiors to guarantee zero spatial collisions.

---

## 2. Setback Clipping & Buildable Envelope

The buildable envelope is the statutory polygon within which construction is permitted, derived by insetting the legal site boundary by the front, rear, and side setback requirements:

$$\text{Envelope Width} = \text{Plot Width} - \text{Side}_1 - \text{Side}_2$$
$$\text{Envelope Length} = \text{Plot Length} - \text{Front Setback} - \text{Rear Setback}$$

```typescript
export function calculateBuildableEnvelope(
  plotWidthMm: number,
  plotLengthMm: number,
  setbacks: { front: number; rear: number; side1: number; side2: number }
): Polygon2D {
  return [
    { x: setbacks.side1, y: setbacks.front },
    { x: plotWidthMm - setbacks.side2, y: setbacks.front },
    { x: plotWidthMm - setbacks.side2, y: plotLengthMm - setbacks.rear },
    { x: setbacks.side1, y: plotLengthMm - setbacks.rear }
  ];
}
```

---

## 3. Parametric Wall Generation & Deduplication

In traditional CAD systems, users manually draw lines for walls, frequently resulting in duplicate collinear overlapping lines when two rooms share a partition.

BuildPlanner AI automatically generates clean structural and partition walls from room polygons through **Edge Deduplication**:

1. Extract all directed line segments from every room boundary.
2. Canonicalize segment representation (ensuring $(x_1, y_1) \le (x_2, y_2)$).
3. Count segment occurrences:
   - **Occurs 1 time**: Exterior wall (Thickness: $200mm$, `isExterior = true`).
   - **Occurs 2 or more times**: Shared interior partition wall (Thickness: $100mm$, `isExterior = false`).
4. Output a deduplicated set of `WallModel` instances with accurate thicknesses.

---

## 4. Staircase Ergonomics & Vertical Clearances

Staircases are computed to ensure comfortable ascent under standard architectural ergonomics:

- **Target Story Height ($H$)**: $3000mm$
- **Target Riser ($R$)**: $150mm$
- **Tread Depth ($T$)**: $250mm$
- **Riser Count**: $\lceil 3000 / 150 \rceil = 20$ steps
- **Blondel's Formula Check**: $2R + T = 2(150) + 250 = 550 \text{ to } 650 mm$ (satisfied).
- **Dog-Legged U-Turn**: Two 10-step flights with a $1000mm$ wide intermediate landing.
