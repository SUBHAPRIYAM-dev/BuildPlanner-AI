# REST API Documentation

The BuildPlanner AI Backend (`apps/api`) provides a structured, type-safe REST API for project management, parametric candidate generation, AI design chat, versioning, and architectural drawing exports.

**Base URL**: `http://localhost:5000/api`

All responses follow the standard JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable notification"
}
```

---

## 1. Authentication Endpoints

### 1.1 Register User
- **Method**: `POST /auth/register`
- **Body**:
  ```json
  {
    "email": "architect@example.com",
    "password": "SecurePassword123!",
    "name": "Ar. Priya Sharma",
    "profession": "ARCHITECT"
  }
  ```
- **Response**: `201 Created` with JWT access token and user profile.

### 1.2 Login User
- **Method**: `POST /auth/login`
- **Body**:
  ```json
  {
    "email": "architect@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response**: `200 OK` with JWT access and refresh tokens.

### 1.3 Get Current User Profile
- **Method**: `GET /auth/me`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response**: `200 OK` with user details.

---

## 2. Project & Planning Endpoints

### 2.1 List Projects
- **Method**: `GET /projects`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response**: `200 OK` with array of project summary cards.

### 2.2 Create Project
- **Method**: `POST /projects`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**:
  ```json
  {
    "title": "Bhubaneswar G+1 Residential Villa",
    "location": {
      "city": "Bhubaneswar",
      "state": "Odisha",
      "country": "India"
    },
    "plot": {
      "widthMm": 9144,
      "lengthMm": 12192,
      "shape": "RECTANGLE"
    },
    "floorsCount": 2
  }
  ```
- **Response**: `201 Created` with initialized project document.

### 2.3 Generate Planning Candidates
- **Method**: `POST /projects/:id/generate`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**: Complete `PlanningInput` payload.
- **Response**: `200 OK` returning 3 viable architectural design candidates:
  - Candidate A: Classic Vastu Villa
  - Candidate B: Contemporary Open-Plan
  - Candidate C: Courtyard Light-Well
  Each candidate includes its complete canonical `BuildingModel`, calculated area metrics, and compliance status.

### 2.4 AI Architectural Copilot Chat & Mutation
- **Method**: `POST /projects/:id/ai/chat`
- **Headers**: `Authorization: Bearer <JWT>`
- **Body**:
  ```json
  {
    "prompt": "Make staircase straight",
    "activeLevelIndex": 0
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "reply": "Updated the primary staircase to Straight Flight...",
      "operationApplied": true,
      "updatedModel": { ... }
    }
  }
  ```

### 2.5 Export Architectural Drawings
- **Method**: `GET /projects/:id/export/drawing?format=svg&type=floorplan&level=0`
- **Query Parameters**:
  - `format`: `svg` | `png` | `dxf` | `pdf`
  - `type`: `floorplan` | `elevation_north` | `elevation_west` | `siteplan`
  - `level`: Floor level index (`0` for Ground, `1` for First)
- **Response**: `200 OK` with MIME type `image/svg+xml` containing clean vector architectural blueprint with scale, title block, and statutory disclaimer.

### 2.6 Version History
- **Method**: `GET /projects/:id/versions`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response**: `200 OK` with list of model revisions (V1, V2...) with timestamps and change summaries.

### 2.7 Verified Jurisdictions
- **Method**: `GET /projects/rules/jurisdictions`
- **Response**: `200 OK` listing verified municipal codes:
  - `Bhubaneswar Development Authority (BDA / OBRPS 2020)`
  - Status and coverage notes.
