import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const isDev = process.env.NODE_ENV === 'development';

  // Map well-known error types to appropriate HTTP status codes
  let status: number = err.status || err.statusCode || 500;

  if (err.name === 'ValidationError')      status = 422; // Mongoose schema validation
  if (err.name === 'CastError')            status = 400; // Mongoose bad ObjectId
  if (err.code === 11000)                  status = 409; // Mongoose duplicate key
  if (err.name === 'JsonWebTokenError')    status = 401;
  if (err.name === 'TokenExpiredError')    status = 401;

  if (isDev) {
    return res.status(status).json({
      success: false,
      message: err.message || 'Internal Server Error',
      ...(err.stack  && { stack:  err.stack }),
      ...(err.errors && { errors: err.errors }),
    });
  }

  // Production: never expose internals for server errors
  const safeMessage =
    status >= 500
      ? 'Internal Server Error'
      : err.message || 'Request failed'; // 4xx messages are generally safe to surface

  return res.status(status).json({
    success: false,
    message: safeMessage,
  });
};
