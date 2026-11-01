# Rule Engine & Municipal Compliance

`@buildplanner/rule-engine` is the statutory compliance checking engine. It validates canonical building models against municipal development control regulations and building bye-laws.

---

## 1. The Never-Hallucinate Policy

A critical architectural mandate of BuildPlanner AI is **strict legal fidelity**:
- An architectural software must **never fabricate or guess building bye-laws**.
- Only verified, gazetted municipal building rules are programmed into the verified dataset.
- When an unknown or unverified jurisdiction is evaluated, the engine returns status **`UNKNOWN`** along with a clear disclaimer:

> *"Building regulations for this specific jurisdiction have not yet been formally verified in our gazetted dataset. Please consult the local municipal development authority or a certified chartered architect before submission."*

---

## 2. Verified Jurisdiction: Bhubaneswar Development Authority (BDA / OBRPS 2020)

The engine includes the verified **Odisha Development Authorities (Planning & Building Standards) Rules, 2020 (OBRPS)** governing Bhubaneswar, Odisha:

### 2.1 Maximum Ground Coverage
- **Legal Authority**: BDA / ODA Building Rules 2020, Rule 21 (Table 3).
- **Rule Thresholds**:
  - Plots $\le 200 m^2$ ($~2152 sqft$): Maximum **$65\%$** ground coverage.
  - Plots $201 - 500 m^2$: Maximum **$60\%$** ground coverage.
  - Plots $> 500 m^2$: Maximum **$50\%$** ground coverage.
- **Accepted Villa Performance**:
  - Plot: $30 \times 40 ft = 111.48 m^2$.
  - Ground Coverage: $58.2 m^2$ ($52.2\%$).
  - Status: **PASS** (Safely below the $65\%$ ceiling).

### 2.2 Front Setback (Street Clearance)
- **Legal Authority**: BDA / ODA Building Rules 2020, Rule 24.
- **Rule Thresholds**:
  - Abutting road width $\le 9.14 m$ ($30 ft$): Minimum **$1.5 m$** ($1500 mm$).
  - Abutting road width $9.14 m - 12.19 m$ ($30 - 40 ft$): Minimum **$2.0 m$** ($2000 mm$).
  - Abutting road width $> 12.19 m$: Minimum **$3.0 m$** ($3000 mm$).
- **Accepted Villa Performance**:
  - North Road ($30 ft$): $1500 mm$ front setback provided.
  - Status: **PASS**.

### 2.3 Rear and Side Setbacks
- **Legal Authority**: BDA / ODA Building Rules 2020, Rule 24.
- **Requirements**:
  - Rear open space: Minimum **$1.0 m$** ($1000 mm$).
  - Side clearances: Minimum **$1.0 m$** ($1000 mm$) on both sides ($1.2 m$ provided on West side to account for secondary street access).
- **Status**: **PASS**.

### 2.4 Off-Street Parking (ECS)
- **Legal Authority**: BDA / ODA Building Rules 2020, Rule 39 (Table 7).
- **Requirement**: Minimum **1 Equivalent Car Space (ECS)** for independent residential villas.
- **Dimension Standard**: Minimum $2.5 m \times 5.0 m$ clear bay.
- **Status**: **PASS**.

### 2.5 Height Limitation
- **Legal Authority**: BDA / ODA Building Rules 2020, Low-Rise Residential category.
- **Requirement**: Maximum **$10.0 m$** building height for G+1 residential structure.
- **Accepted Villa Height**: $7.6 m$ (Plinth $0.6m$ + Floor 1 $3.0m$ + Floor 2 $3.0m$ + Parapet $1.0m$).
- **Status**: **PASS**.

---

## 3. Compliance Report Data Structure

The engine returns a structured JSON payload:

```json
{
  "jurisdiction": {
    "country": "India",
    "state": "Odisha",
    "city": "Bhubaneswar",
    "authority": "Bhubaneswar Development Authority (BDA)",
    "ruleDatasetVersion": "ODA / OBRPS Building Standards 2020 (Verified Edition)"
  },
  "overallStatus": "PASS",
  "rulesEvaluated": [
    {
      "ruleId": "ODA_RULE_COVERAGE",
      "category": "COVERAGE",
      "parameter": "Maximum Ground Coverage",
      "requiredValue": "≤ 65%",
      "actualValue": "52.2%",
      "status": "PASS",
      "authority": "BDA / ODA Building Rules 2020",
      "clause": "Rule 21 (Table 3): Ground Coverage for Low-Rise Residential"
    }
  ],
  "disclaimer": "Preliminary AI-generated architectural design. Professional verification and approval are required before construction or official submission."
}
```
