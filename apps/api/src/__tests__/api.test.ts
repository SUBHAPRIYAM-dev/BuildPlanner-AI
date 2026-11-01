import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDB, disconnectDB } from '../config/db';

const app = createApp();

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

describe('API Integration Tests', () => {
  let authToken = '';
  let projectId = '';

  it('GET /api/health returns healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/auth/register creates a user and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `test_${Date.now()}@buildplanner.ai`,
        password: 'password123',
        name: 'Architect Subha',
        organization: 'Deep Architecture Lab',
        role: 'ARCHITECT'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    authToken = res.body.data.tokens.accessToken;
  });

  it('POST /api/projects creates a new project with default BuildingModel', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Bhubaneswar Villa 30x40',
        description: 'Modern G+1 Residential Villa',
        propertyType: 'RESIDENTIAL',
        location: {
          city: 'Bhubaneswar',
          state: 'Odisha',
          country: 'India'
        },
        plot: {
          widthMm: 9144, // 30 ft
          lengthMm: 12192, // 40 ft
          shape: 'RECTANGLE'
        },
        roads: {
          NORTH: { enabled: true, widthMm: 9144, type: 'ACCESS' },
          WEST: { enabled: true, widthMm: 12192, type: 'MAIN' }
        },
        floorsCount: 2,
        parking: { cars: 1, motorcycles: 0 },
        futureFloors: { planned: true, count: 1 }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.currentModel).toBeDefined();
    expect(res.body.data.currentModel.levels.length).toBe(2);
    projectId = res.body.data._id;
  });

  it('GET /api/projects retrieves user projects list', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/projects/:id/design retrieves the current BuildingModel', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/design`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.buildingModel.schemaVersion).toBe('1.0.0');
    expect(res.body.data.buildingModel.site.dimensionsMm.width).toBe(9144);
    expect(res.body.data.buildingModel.site.dimensionsMm.length).toBe(12192);
  });

  it('PATCH /api/projects/:id/design updates the BuildingModel and creates a version', async () => {
    // Fetch current
    const currentRes = await request(app)
      .get(`/api/projects/${projectId}/design`)
      .set('Authorization', `Bearer ${authToken}`);

    const model = currentRes.body.data.buildingModel;
    model.metadata.title = 'Updated Bhubaneswar Villa';

    const updateRes = await request(app)
      .patch(`/api/projects/${projectId}/design`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        buildingModel: model,
        changeDescription: 'Updated project title',
        source: 'USER_EDIT'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.version.versionNumber).toBe(2);
  });
});
