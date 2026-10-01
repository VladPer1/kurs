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

    // Super admin role always possesses full access
    if (role === 'admin' || (permissions && permissions.includes(permissionSlug))) {
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

/**
 * Role-based guard: checks if user has one of allowed roles
 */
export function hasRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Требуется авторизация.',
        },
      });
      return;
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    logger.audit({
      eventType: 'ACCESS_DENIED',
      email: req.user.email,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      endpoint: req.originalUrl,
      details: `Denied access. Required roles: [${allowedRoles.join(', ')}]. User role: [${req.user.role}].`,
    });

    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_ROLE_RESTRICTED',
        message: `Доступ запрещен для роли ${req.user.role}.`,
      },
    });
  };
}
