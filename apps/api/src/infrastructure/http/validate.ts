import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export type RequestValidationSchemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

export type ValidatedRequestInput = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

/**
 * Parses request input at the HTTP boundary.
 * Attach on routes; do not call from services.
 *
 * Express 5 exposes `req.query` as a getter, so it cannot be assigned.
 * Parsed values are stored on `req.validated` instead of writing back to
 * `req.query` / `req.params`. Controllers must read from `req.validated`.
 */
export function validate(schemas: RequestValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const validated: ValidatedRequestInput = { ...req.validated };

      if (schemas.body) {
        validated.body = schemas.body.parse(req.body);
      }

      if (schemas.query) {
        validated.query = schemas.query.parse(req.query);
      }

      if (schemas.params) {
        validated.params = schemas.params.parse(req.params);
      }

      req.validated = validated;
      next();
    } catch (error) {
      next(error);
    }
  };
}
