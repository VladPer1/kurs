import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env.js';
import { User, Role, Permission } from '../models/index.js';
import { logger } from '../config/logger.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

export class AuthService {
  /**
   * Hash password with bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password with bcrypt hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access token (short lived: 15m)
   */
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
      expiresIn: ENV.JWT_ACCESS_EXPIRES_IN as any,
    });
  }

  /**
   * Generate refresh token (long lived: 7d)
   */
  static generateRefreshToken(payload: { userId: string }): string {
    return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
      expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any,
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as TokenPayload;
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as { userId: string };
  }

  /**
   * Load user with associated role and permissions
   */
  static async getUserWithPermissions(userId: string): Promise<{
    user: User;
    role: {
      id: string;
      name: string;
      description?: string;
      permissions: string[];
    };
    roleName: string;
    permissions: string[];
  } | null> {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'role',
          include: [
            {
              model: Permission,
              as: 'permissions',
              attributes: ['id', 'slug', 'description'],
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!user) return null;

    const userRole = (user as any).role;
    const roleName = userRole ? userRole.name : 'student';
    const permissions: string[] = userRole?.permissions
      ? userRole.permissions.map((p: any) => p.slug)
      : [];

    return {
      user,
      role: {
        id: userRole?.id || '',
        name: roleName,
        description: userRole?.description || '',
        permissions,
      },
      roleName,
      permissions,
    };
  }

  /**
   * Handle failed login attempt (Brute force protection)
   */
  static async handleFailedLogin(user: User, ip: string): Promise<{ isLocked: boolean; attemptsLeft: number }> {
    const attempts = user.failed_login_attempts + 1;
    let isLocked = false;
    let lockUntil: Date | null = null;

    if (attempts >= ENV.BRUTE_FORCE_MAX_ATTEMPTS) {
      isLocked = true;
      lockUntil = new Date(Date.now() + ENV.LOCK_TIME_MINUTES * 60 * 1000);
      logger.audit({
        eventType: 'ACCOUNT_LOCKED',
        email: user.email,
        ip,
        endpoint: '/api/v1/auth/login',
        details: `Account locked for ${ENV.LOCK_TIME_MINUTES} minutes due to ${attempts} failed login attempts.`,
      });
    } else {
      logger.audit({
        eventType: 'PASSWORD_BRUTE_FORCE_ATTEMPT',
        email: user.email,
        ip,
        endpoint: '/api/v1/auth/login',
        details: `Failed attempt ${attempts} of ${ENV.BRUTE_FORCE_MAX_ATTEMPTS}.`,
      });
    }

    await user.update({
      failed_login_attempts: attempts,
      lock_until: lockUntil,
    });

    return {
      isLocked,
      attemptsLeft: Math.max(0, ENV.BRUTE_FORCE_MAX_ATTEMPTS - attempts),
    };
  }

  /**
   * Reset failed attempts on successful login
   */
  static async handleSuccessfulLogin(user: User, refreshToken: string, ip: string): Promise<void> {
    await user.update({
      failed_login_attempts: 0,
      lock_until: null,
      refresh_token: refreshToken,
    });

    logger.audit({
      eventType: 'AUTH_SUCCESS',
      email: user.email,
      ip,
      endpoint: '/api/v1/auth/login',
      details: 'User authenticated successfully.',
    });
  }
}
