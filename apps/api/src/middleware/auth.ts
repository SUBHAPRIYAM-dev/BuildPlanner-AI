import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticationError } from '@buildplanner/shared';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
      req.user = decoded;
      return next();
    } catch {
      return next(new AuthenticationError('Invalid or expired authentication token'));
    }
  }

  // Support dev-user or guest fallback in development / testing or when dev header is supplied
  const devHeader = req.headers['x-dev-user-id'] as string;
  if (env.NODE_ENV !== 'production' || devHeader) {
    const rawId = devHeader || '000000000000000000000001';
    const validHexId = rawId.length === 24 && /^[0-9a-fA-F]{24}$/.test(rawId)
      ? rawId
      : '000000000000000000000001';

    req.user = {
      userId: validHexId,
      email: 'guest@buildplanner.ai',
      role: 'ADMIN'
    };
    return next();
  }

  next(new AuthenticationError('Authentication token required'));
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
      req.user = decoded;
    } catch {
      // Ignore optional invalid token
    }
  } else if (env.NODE_ENV !== 'production' && req.headers['x-dev-user-id']) {
    req.user = {
      userId: req.headers['x-dev-user-id'] as string,
      email: 'dev@buildplanner.ai',
      role: 'ADMIN'
    };
  }

  next();
}
