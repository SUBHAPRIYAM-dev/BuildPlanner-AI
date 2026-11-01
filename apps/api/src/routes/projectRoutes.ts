import { Router } from 'express';
import { z } from 'zod';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getProjectDesign,
  saveProjectDesign,
  listProjectVersions,
  restoreProjectVersion,
  generateProjectDesign,
  chatWithProjectAI,
  exportProjectDrawing,
  getRulesAndJurisdictions
} from '../controllers/projectController';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router: Router = Router();

// Public rule endpoint
router.get('/rules/jurisdictions', getRulesAndJurisdictions);

const createProjectSchema = {
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    propertyType: z.enum(['RESIDENTIAL', 'DEVELOPER']).optional(),
    location: z.object({
      city: z.string(),
      state: z.string(),
      country: z.string()
    }).optional(),
    plot: z.object({
      widthMm: z.number().positive(),
      lengthMm: z.number().positive(),
      shape: z.enum(['RECTANGLE', 'L_SHAPE', 'CUSTOM']).optional()
    }).optional(),
    roads: z.record(z.string(), z.any()).optional(),
    orientationNorthDegrees: z.number().min(0).max(360).optional(),
    floorsCount: z.number().int().positive().optional(),
    floorRequirements: z.array(z.any()).optional(),
    parking: z.object({
      cars: z.number().int().nonnegative(),
      motorcycles: z.number().int().nonnegative().optional(),
      location: z.enum(['SURFACE_PORCH', 'BASEMENT_UNDERGROUND', 'STILT']).optional()
    }).optional(),
    staircase: z.object({
      type: z.enum(['DOG_LEGGED_U', 'STRAIGHT', 'L_SHAPED']).optional(),
      positionZone: z.enum(['WEST', 'NORTH_WEST', 'SOUTH_WEST', 'SOUTH_EAST', 'NORTH_EAST']).optional()
    }).optional(),
    vastu: z.object({
      enabled: z.boolean(),
      preference: z.enum(['STRICT', 'BALANCED', 'FLEXIBLE']).optional()
    }).optional(),
    budget: z.object({
      minInr: z.number().nonnegative(),
      maxInr: z.number().nonnegative()
    }).optional(),
    futureFloors: z.object({
      planned: z.boolean(),
      count: z.number().int().nonnegative()
    }).optional()
  })
};

router.use(requireAuth);

router.get('/', listProjects);
router.post('/', validate(createProjectSchema), createProject);
router.get('/:id', getProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

// Design, Generation & AI endpoints
router.post('/:id/generate', generateProjectDesign);
router.post('/:id/ai/chat', chatWithProjectAI);
router.get('/:id/export/drawing', exportProjectDrawing);
router.get('/:id/design', getProjectDesign);
router.patch('/:id/design', saveProjectDesign);
router.get('/:id/versions', listProjectVersions);
router.post('/:id/versions/:versionId/restore', restoreProjectVersion);

export default router;
