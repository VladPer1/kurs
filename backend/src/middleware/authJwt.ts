import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/authService.js';
import { logger } from '../config/logger.js';
import { User } from '../models/index.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      // Fallback: check access_token cookie
      token = req.cookies.access_token;
    }

    if (!token) {
      logger.audit({
        eventType: 'ACCESS_DENIED',
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        endpoint: req.originalUrl,
        details: 'Missing authentication token.',
      });
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Требуется авторизация. Предоставьте валидный Bearer токен в заголовке Authorization.',
        },
      });
      return;
    }

    let decoded: TokenPayload;
    try {
      decoded = AuthService.verifyAccessToken(token);
    } catch (err: any) {
      logger.audit({
        eventType: 'ACCESS_DENIED',
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        endpoint: req.originalUrl,
        details: `Invalid or expired token: ${err.message}`,
      });
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED_OR_INVALID',
          message: 'Срок действия токена истек или токен недействителен. Пожалуйста, выполните обновление токена.',
        },
      });
      return;
    }

    // Verify user exists and is not locked
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Пользователь не найден.',
        },
      });
      return;
    }

    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_TEMPORARILY_LOCKED',
          message: `Аккаунт временно заблокирован до ${user.lock_until.toISOString()} из-за множественных неудачных попыток входа.`,
        },
      });
      return;
    }

    // Refresh user permissions from DB to support dynamic changes instantly
    const userDetails = await AuthService.getUserWithPermissions(user.id);
    if (userDetails) {
      decoded.role = userDetails.roleName;
      decoded.permissions = userDetails.permissions;
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_AUTH_ERROR',
        message: 'Ошибка при проверке авторизации.',
      },
    });
  }
}
