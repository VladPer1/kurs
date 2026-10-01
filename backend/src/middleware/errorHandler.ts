import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';
import { logger } from '../config/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Always log internal error details for server diagnostics
  logger.error(`Unhandled Exception on ${req.method} ${req.originalUrl}:`, {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  const statusCode = err.statusCode || err.status || 500;

  // OWASP Rule 24: Generic errors in production to avoid leaking server internals
  if (ENV.NODE_ENV === 'production' && statusCode === 500) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'На сервере произошла внутренняя ошибка. Пожалуйста, обратитесь в службу поддержки.',
      },
    });
    return;
  }

  // Development mode or explicit client-facing exceptions
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Ошибка обработки запроса',
      ...(ENV.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}
