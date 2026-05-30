import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { sendError } from '../utils/response';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body });
    if (!result.success) {
      return sendError(res, result.error.errors[0].message, 422);
    }
    next();
  };
};
