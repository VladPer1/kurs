import { Request, Response } from 'express';
import { User, Role, Instructor } from '../models/index.js';
import { AuthService } from '../services/authService.js';
import { AuthenticatedRequest } from '../middleware/authJwt.js';
import { ENV } from '../config/env.js';

export class AuthController {
  // Register Godoc
  // @Summary      Регистрация нового пользователя
  // @Description  Регистрирует нового пользователя с обязательной ролью (student, instructor, manager) и хеширует пароль bcrypt
  // @Tags         auth
  // @Accept       json
  // @Produce      json
  // @Param        request  body      models.RegisterRequest  true  "Данные регистрации с обязательной ролью"
  // @Success      201      {object}  models.AuthResponse
  // @Failure      400      {object}  models.ErrorResponse
  // @Failure      409      {object}  models.ErrorResponse
  // @Router       /auth/register [post]
  static async register(req: Request, res: Response): Promise<void> {
    const { email, password, full_name, role } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      res.status(409).json({
        success: false,
        error: {
          code: 'USER_ALREADY_EXISTS',
          message: 'Пользователь с таким email адресом уже зарегистрирован.',
        },
      });
      return;
    }

    const normalizedRole = (role || 'student').toLowerCase().trim();
    const targetRole = await Role.findOne({ where: { name: normalizedRole } });
    if (!targetRole) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: `Роль '${normalizedRole}' не найдена в системе. Доступные роли: student, instructor, manager.`,
        },
      });
      return;
    }

    const password_hash = await AuthService.hashPassword(password);
    const user = await User.create({
      role_id: targetRole.id,
      email,
      password_hash,
      full_name,
    });

    if (targetRole.name === 'instructor') {
      await Instructor.findOrCreate({
        where: { user_id: user.id },
        defaults: {
          user_id: user.id,
          bio: 'Преподаватель учебной платформы',
          specialization: 'Общие курсы',
          rating: 5.0,
        },
      });
    }

    const userWithPerms = await AuthService.getUserWithPermissions(user.id);
    const permissions = userWithPerms ? userWithPerms.permissions : [];

    const accessToken = AuthService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: targetRole.name,
      permissions,
    });

    const refreshToken = AuthService.generateRefreshToken({ userId: user.id });
    await user.update({ refresh_token: refreshToken });

    // Set refresh token in httpOnly secure cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Регистрация успешно завершена.',
      data: {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: {
            id: targetRole.id,
            name: targetRole.name,
            description: targetRole.description,
            permissions,
          },
        },
      },
    });
  }

  // Login Godoc
  // @Summary      Вход в систему
  // @Description  Аутентификация с защитой от брутфорса (блокировка на 15 мин после 5 попыток)
  // @Tags         auth
  // @Accept       json
  // @Produce      json
  // @Param        request  body      models.LoginRequest  true  "Учетные данные"
  // @Success      200      {object}  models.AuthResponse
  // @Failure      401      {object}  models.ErrorResponse
  // @Failure      423      {object}  models.ErrorResponse
  // @Router       /auth/login [post]
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Неверный адрес электронной почты или пароль.',
        },
      });
      return;
    }

    // Check brute-force lock
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      const minutesRemaining = Math.ceil(
        (new Date(user.lock_until).getTime() - Date.now()) / (60 * 1000)
      );
      res.status(423).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Учетная запись заблокирована из-за 5 неверных попыток ввода пароля. Попробуйте снова через ${minutesRemaining} минут.`,
          lock_until: user.lock_until,
        },
      });
      return;
    }

    const isValidPassword = await AuthService.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      const { isLocked, attemptsLeft } = await AuthService.handleFailedLogin(user, ip);
      if (isLocked) {
        res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Превышен лимит 5 попыток. Аккаунт заблокирован на 15 минут.`,
            lock_until: user.lock_until,
          },
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: `Неверный пароль. Осталось попыток: ${attemptsLeft}`,
          attempts_left: attemptsLeft,
        },
      });
      return;
    }

    // Login successful
    const userDetails = await AuthService.getUserWithPermissions(user.id);
    const roleName = userDetails ? userDetails.roleName : 'student';
    const permissions = userDetails ? userDetails.permissions : [];

    const accessToken = AuthService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: roleName,
      permissions,
    });

    const refreshToken = AuthService.generateRefreshToken({ userId: user.id });
    await AuthService.handleSuccessfulLogin(user, refreshToken, ip);

    // Set refresh token in httpOnly secure cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'Успешная авторизация.',
      data: {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: userDetails ? userDetails.role : { name: roleName, permissions },
        },
      },
    });
  }

  // RefreshToken Godoc
  // @Summary      Обновить Access Token
  // @Description  Выпуск нового токена по Refresh Token из HttpOnly cookie
  // @Tags         auth
  // @Accept       json
  // @Produce      json
  // @Success      200  {object}  models.TokenResponse
  // @Failure      401  {object}  models.ErrorResponse
  // @Router       /auth/refresh [post]
  static async refresh(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refresh_token || req.cookies?.refreshToken || req.body?.refresh_token || req.body?.refreshToken;

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh-токен отсутствует в cookie или теле запроса.',
        },
      });
      return;
    }

    try {
      const decoded = AuthService.verifyRefreshToken(token);
      const user = await User.findByPk(decoded.userId);

      if (!user || user.refresh_token !== token) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Refresh-токен отозван или недействителен.',
          },
        });
        return;
      }

      const userDetails = await AuthService.getUserWithPermissions(user.id);
      const roleName = userDetails ? userDetails.roleName : 'student';
      const permissions = userDetails ? userDetails.permissions : [];

      const newAccessToken = AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: roleName,
        permissions,
      });

      const newRefreshToken = AuthService.generateRefreshToken({ userId: user.id });
      await user.update({ refresh_token: newRefreshToken });

      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: {
          access_token: newAccessToken,
        },
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh-токен просрочен. Пожалуйста, выполните вход заново.',
        },
      });
    }
  }

  // Logout Godoc
  // @Summary      Выход из системы
  // @Description  Очистка сессионных cookie
  // @Tags         auth
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Success      200  {object}  models.SuccessResponse
  // @Router       /auth/logout [post]
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (req.user?.userId) {
      await User.update({ refresh_token: null }, { where: { id: req.user.userId } });
    }

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({
      success: true,
      message: 'Вы успешно вышли из системы.',
    });
  }

  // GetMe Godoc
  // @Summary      Текущий аутентифицированный пользователь
  // @Description  Возвращает профиль текущего пользователя и его актуальные права (RBAC)
  // @Tags         auth
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Success      200  {object}  models.CurrentUserResponse
  // @Failure      401  {object}  models.ErrorResponse
  // @Router       /auth/me [get]
  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Необходима авторизация.' },
      });
      return;
    }

    const details = await AuthService.getUserWithPermissions(req.user.userId);
    if (!details) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: details.user.id,
        email: details.user.email,
        full_name: details.user.full_name,
        role: details.role,
        created_at: details.user.created_at,
      },
    });
  }
}
