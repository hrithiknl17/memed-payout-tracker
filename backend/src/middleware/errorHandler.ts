import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { SettlementConflictError } from '../domain/settlement';
import { HttpError } from '../utils/httpError';

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(HttpError.notFound(`No route for ${req.method} ${req.path}`));
}

/**
 * Single place that turns errors into JSON responses. Express 5 forwards
 * rejected promises from async handlers here automatically.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: 'Validation failed', details: err.message });
  }
  if (err instanceof SettlementConflictError) {
    // Extremely contended update; safe for the caller to retry.
    return res.status(409).json({ error: err.message });
  }

  console.error('[unhandled]', err);
  return res.status(500).json({ error: 'Something went wrong on our side' });
}
