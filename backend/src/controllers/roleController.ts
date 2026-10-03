import { Request, Response } from 'express';
import { Role, Permission, RolePermission, User } from '../models/index.js';

export class RoleController {
  /**
   * GET /api/v1/roles
   * List all roles with associated permissions
   */
  static async getAllRoles(_req: Request, res: Response): Promise<void> {
    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'slug', 'description'],
          through: { attributes: [] },
        },
      ],
      order: [['name', 'ASC']],
    });

    res.status(200).json({
      success: true,
      data: roles,
    });
  }

  /**
   * POST /api/v1/roles
   * Create new role
   */
  static async createRole(req: Request, res: Response): Promise<void> {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Системное имя роли (name) обязательно.' },
      });
      return;
    }

    const existing = await Role.findOne({ where: { name } });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'ROLE_ALREADY_EXISTS', message: `Роль с именем ${name} уже существует.` },
      });
      return;
    }

    const role = await Role.create({
      name: name.toLowerCase().trim(),
      description: description || '',
    });

    res.status(201).json({
      success: true,
      message: 'Роль успешно создана.',
      data: role,
    });
  }

  /**
   * GET /api/v1/permissions
   * List all system permissions
   */
  static async getAllPermissions(_req: Request, res: Response): Promise<void> {
    const permissions = await Permission.findAll({
      order: [['slug', 'ASC']],
    });

    res.status(200).json({
      success: true,
      data: permissions,
    });
  }

  /**
   * POST /api/v1/roles/:id/permissions
   * Dynamically assign permissions to role
   */
  static async updateRolePermissions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { permission_ids, permission_slugs } = req.body;

    const role = await Role.findByPk(id);
    if (!role) {
      res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: 'Роль не найдена.' },
      });
      return;
    }

    let targetPermissions: Permission[] = [];
    if (Array.isArray(permission_ids) && permission_ids.length > 0) {
      targetPermissions = await Permission.findAll({
        where: { id: permission_ids },
      });
    } else if (Array.isArray(permission_slugs) && permission_slugs.length > 0) {
      targetPermissions = await Permission.findAll({
        where: { slug: permission_slugs },
      });
    }

    // Replace permissions
    await RolePermission.destroy({ where: { role_id: role.id } });

    for (const perm of targetPermissions) {
      await RolePermission.create({
        role_id: role.id,
        permission_id: perm.id,
      });
    }

    const updatedRole = await Role.findByPk(role.id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'slug', 'description'],
          through: { attributes: [] },
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Права для роли успешно обновлены.',
      data: updatedRole,
    });
  }

  /**
   * PATCH /api/v1/users/:id/role
   * Assign role to user
   */
  static async assignUserRole(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { role_id, role_name } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден.' },
      });
      return;
    }

    let targetRole: Role | null = null;
    if (role_id) {
      targetRole = await Role.findByPk(role_id);
    } else if (role_name) {
      targetRole = await Role.findOne({ where: { name: role_name } });
    }

    if (!targetRole) {
      res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: 'Указанная роль не найдена.' },
      });
      return;
    }

    await user.update({ role_id: targetRole.id });

    res.status(200).json({
      success: true,
      message: `Пользователю успешно назначена роль ${targetRole.name}.`,
      data: {
        userId: user.id,
        email: user.email,
        role: targetRole.name,
      },
    });
  }
}
