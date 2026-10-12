import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../models/User';
import { verifyToken } from '../services/authService';
import { HttpError } from '../utils/httpError';

export interface AuthContext {
  userId: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/** Requires a valid `Authorization: Bearer <jwt>` header. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(HttpError.unauthorized());
  try {
    const payload = verifyToken(header.slice('Bearer '.length).trim());
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    next(HttpError.unauthorized('Session expired or invalid — please log in again'));
  }
}

/** Requires the authenticated user to have one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(HttpError.unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(HttpError.forbidden(`Only ${roles.join(' or ')} accounts can do this`));
    }
    next();
  };
}

/** Narrowing helper for handlers mounted behind requireAuth. */
export function authOf(req: Request): AuthContext {
  if (!req.auth) throw HttpError.unauthorized();
  return req.auth;
}
