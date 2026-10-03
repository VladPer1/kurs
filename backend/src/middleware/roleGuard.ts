import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authJwt.js';
import { logger } from '../config/logger.js';

/**
 * Dynamic RBAC Guard: checks if the authenticated user has a specific atomic permission
 */
export function hasPermission(permissionSlug: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Требуется предварительная аутентификация.',
        },
      });
      return;
    }

    const { role, permissions, email } = req.user;

    // Strict dynamic RBAC: check if user possesses the required atomic permission
    if (permissions && permissions.includes(permissionSlug)) {
      return next();
    }

    // Permission denied: audit log for OWASP compliance
    logger.audit({
      eventType: 'ACCESS_DENIED',
      email,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      endpoint: req.originalUrl,
      details: `Denied access to resource requiring permission: [${permissionSlug}]. User role: [${role}].`,
    });

    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
        message: `Доступ запрещен. Недостаточно прав для выполнения операции (требуется: ${permissionSlug}).`,
      },
    });
  };
}
