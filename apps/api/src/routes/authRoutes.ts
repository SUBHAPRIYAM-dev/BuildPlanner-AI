import { Router } from 'express';
import { z } from 'zod';
import { register, login, getMe, refresh } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router: Router = Router();

const registerSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    organization: z.string().optional(),
    role: z.enum(['HOMEOWNER', 'ARCHITECT', 'ENGINEER', 'BUILDER', 'DEVELOPER']).optional()
  })
};

const loginSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
};

const refreshSchema = {
  body: z.object({
    refreshToken: z.string().min(1)
  })
};

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, getMe);
router.post('/refresh', validate(refreshSchema), refresh);

export default router;
