/**
 * BuildPlanner AI - Shared Types, Errors, and Constants
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
  metadata?: Record<string, unknown>;
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string) {
    super(`${resource}${id ? ` with id '${id}'` : ''} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class GeometryConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, 'GEOMETRY_CONFLICT', details);
  }
}

export const DISCLAIMERS = {
  PRELIMINARY_DESIGN: "Preliminary AI-generated architectural design. Professional verification and approval are required before construction or official submission.",
  REGULATION_UNKNOWN: "Official by-law rule unverified for this parameter. Professional verification required.",
  STRUCTURAL_CONCEPT: "Conceptual structural layout and grid only. Structural engineer verification required prior to construction."
} as const;
