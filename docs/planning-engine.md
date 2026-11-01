# Planning Engine — Deterministic Layout Generator

`@buildplanner/planning-engine` is the procedural spatial layout synthesis engine that translates user plot specifications and room requirements into viable, production-grade architectural design candidates.

---

## 1. Architectural Philosophy

Conventional generative AI produces unconstrained floor plans with disconnected stairs, bedrooms without doors, overlapping walls, and floating rooms. 

The BuildPlanner AI Planning Engine is **deterministic and rule-governed**:
- Generates valid spatial topologies that respect structural bays, load-bearing alignments, plumbing wet-walls, and circulation corridors.
- Synthesizes **three distinct architectural candidates** for every design request, allowing the user to select their preferred lifestyle layout.

---

## 2. The 3 Architectural Candidates

### Candidate A: Classic Vastu-Compliant Villa
- **Target Audience**: Families seeking traditional Indian spatial orientation adhering to Vastu Shastra principles.
- **Key Characteristics**:
  - **Kitchen**: Placed in the South-East (Agni corner) with morning sun and optimal exhaust venting.
  - **Master Bedroom**: Placed in the South-West (Nairutya quadrant) for master suite stability and quietude.
  - **Puja Room**: Placed in the sacred North-East (Ishanya quadrant).
  - **Living Area**: Welcoming North/North-West public zone.
  - **Central Core**: Vertical dog-leg staircase positioned along the Western wall for structural continuity.

### Candidate B: Contemporary Open-Plan Villa
- **Target Audience**: Modern urban families prioritizing natural light, continuous visual sightlines, and entertaining spaces.
- **Key Characteristics**:
  - **Living & Dining**: Integrated great room layout maximizing perceived spatial volume.
  - **Cross Ventilation**: Large window openings on North and West facades.
  - **First-Floor Balcony**: Expansive front-facing balcony offering street views.

### Candidate C: Courtyard Light-Well Villa
- **Target Audience**: Dense urban sites with narrow road frontages.
- **Key Characteristics**:
  - **Light-Well / Cutout**: Vertical atrium core bringing daylight deep into the ground and first floor living zones.
  - **Thermal Chimney Effect**: Facilitates natural passive cooling and upward heat exhaust.

---

## 3. The Bhubaneswar G+1 Villa Acceptance Specification

The Planning Engine was rigorously benchmarked against the real-world acceptance criteria:

| Requirement | Engine Output Ground Floor | Engine Output First Floor | Status |
| :--- | :--- | :--- | :--- |
| **Bedrooms** | Exactly 2 Bedrooms (Master Suite + Bed 2) | Exactly 2 Bedrooms (Master 2 + Bed 3) | **SATISFIED (4 Total)** |
| **Living Spaces** | 1 Living Hall ($> 18 m^2$) | 1 Family Lounge ($> 14 m^2$) | **SATISFIED** |
| **Dining Spaces** | 1 Dining Hall | 1 Dining Area | **SATISFIED** |
| **Kitchens** | 1 Kitchen (South-East) | 1 First Floor Kitchen / Pantry | **SATISFIED** |
| **Puja Room** | 1 Puja Room (North-East) | N/A | **SATISFIED** |
| **Bathrooms** | 2 Bathrooms (1 attached, 1 common) | 2 Bathrooms (1 attached, 1 common) | **SATISFIED** |
| **Balconies** | N/A | 1 Front Balcony ($3.0 \times 1.5 m$) | **SATISFIED** |
| **Car Parking** | 1 Dedicated Off-Street Bay ($2.5 \times 5.0 m$) | N/A | **SATISFIED** |
| **Future Floors** | Continuous dog-leg core extending upwards | Continuous dog-leg core extending upwards | **SATISFIED** |

---

## 4. Pipeline Integration

For each generated candidate, the Planning Engine:
1. Calculates buildable envelope using statutory setbacks.
2. Places rooms within structural bays without collisions.
3. Automatically generates deduplicated exterior ($200mm$) and interior ($100mm$) walls.
4. Places doors with swing clearances and windows on exterior perimeter walls.
5. Computes precise area statements (Plot, Coverage, Built-Up, Carpet Area).
6. Executes constraint validation (`validateBuildingConstraints`) and regulatory checking (`evaluateRegulatoryCompliance`).
7. Embeds the full validation report and disclaimer into the candidate's canonical model.
