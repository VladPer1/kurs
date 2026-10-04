import { Request, Response } from 'express';
import { Role, Permission, RolePermission, User } from '../models/index.js';

export class RoleController {
  // GetAllRoles Godoc
  // @Summary      Получить список всех ролей
  // @Description  Возвращает роли с привязанными правами (пермишн roles:manage)
  // @Tags         roles
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Success      200  {object}  models.RoleListResponse
  // @Failure      403  {object}  models.ErrorResponse
  // @Router       /roles [get]
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

  // CreateRole Godoc
  // @Summary      Создать новую роль
  // @Description  Создает новую системную или пользовательскую роль (пермишн roles:manage)
  // @Tags         roles
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        request  body      models.CreateRoleRequest  true  "Данные роли"
  // @Success      201      {object}  models.RoleResponse
  // @Failure      400      {object}  models.ErrorResponse
  // @Failure      409      {object}  models.ErrorResponse
  // @Router       /roles [post]
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

  // UpdateRole Godoc
  // @Summary      Обновить роль
  // @Description  Обновляет название или описание роли (запрещено переименовывать базовые роли)
  // @Tags         roles
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        id       path      string                    true  "Role ID"
  // @Param        request  body      models.UpdateRoleRequest  true  "Новые данные роли"
  // @Success      200      {object}  models.RoleResponse
  // @Failure      400      {object}  models.ErrorResponse
  // @Failure      404      {object}  models.ErrorResponse
  // @Router       /roles/{id} [put]
  static async updateRole(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, description } = req.body;

    const role = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'slug', 'description'],
          through: { attributes: [] },
        },
      ],
    });

    if (!role) {
      res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: 'Роль не найдена.' },
      });
      return;
    }

    const systemRoles = ['admin', 'instructor', 'student'];
    if (name && name.toLowerCase().trim() !== role.name && systemRoles.includes(role.name)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_RENAME_SYSTEM_ROLE',
          message: `Переименование системной роли '${role.name}' запрещено политикой безопасности платформы.`,
        },
      });
      return;
    }

    if (name && name.toLowerCase().trim() !== role.name) {
      const existing = await Role.findOne({ where: { name: name.toLowerCase().trim() } });
      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'ROLE_ALREADY_EXISTS', message: `Роль с именем ${name} уже существует.` },
        });
        return;
      }
      role.name = name.toLowerCase().trim();
    }

    if (description !== undefined) {
      role.description = description;
    }

    await role.save();

    res.status(200).json({
      success: true,
      message: 'Роль успешно обновлена.',
      data: role,
    });
  }

  // DeleteRole Godoc
  // @Summary      Удалить роль
  // @Description  Удаляет кастомную роль (запрещено удалять системные роли и роли, назначенные пользователям)
  // @Tags         roles
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        id   path      string  true  "Role ID"
  // @Success      200  {object}  models.SuccessResponse
  // @Failure      400  {object}  models.ErrorResponse
  // @Failure      404  {object}  models.ErrorResponse
  // @Router       /roles/{id} [delete]
  static async deleteRole(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const role = await Role.findByPk(id);
    if (!role) {
      res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: 'Роль не найдена.' },
      });
      return;
    }

    const systemRoles = ['admin', 'instructor', 'student'];
    if (systemRoles.includes(role.name)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SYSTEM_ROLE',
          message: `Удаление базовой системной роли '${role.name}' запрещено.`,
        },
      });
      return;
    }

    const usersCount = await User.count({ where: { role_id: role.id } });
    if (usersCount > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ROLE_IN_USE',
          message: `Невозможно удалить роль '${role.name}': она назначена пользователям (${usersCount} чел.). Сначала измените их роли.`,
        },
      });
      return;
    }

    await RolePermission.destroy({ where: { role_id: role.id } });
    await role.destroy();

    res.status(200).json({
      success: true,
      message: `Роль '${role.name}' успешно удалена.`,
    });
  }

  // GetAllPermissions Godoc
  // @Summary      Получить список всех прав
  // @Description  Возвращает справочник всех атомарных прав системы (пермишн permissions:view)
  // @Tags         roles
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Success      200  {object}  models.PermissionsListResponse
  // @Router       /permissions [get]
  static async getAllPermissions(_req: Request, res: Response): Promise<void> {
    const permissions = await Permission.findAll({
      order: [['slug', 'ASC']],
    });

    res.status(200).json({
      success: true,
      data: permissions,
    });
  }

  // UpdateRolePermissions Godoc
  // @Summary      Назначить права роли
  // @Description  Динамическое назначение атомарных прав роли (пермишн roles:manage)
  // @Tags         roles
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        id       path      string                              true  "Role ID"
  // @Param        request  body      models.RolePermissionsAssignRequest  true  "Список прав"
  // @Success      200      {object}  models.RoleResponse
  // @Router       /roles/{id}/permissions [post]
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

  // AssignUserRole Godoc
  // @Summary      Назначить роль пользователю
  // @Description  Изменение роли пользователя (пермишн users:manage_roles)
  // @Tags         roles
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        id       path      string                    true  "User ID"
  // @Param        request  body      models.AssignRoleRequest  true  "Роль"
  // @Success      200      {object}  models.AssignRoleResponse
  // @Failure      404      {object}  models.ErrorResponse
  // @Router       /users/{id}/role [patch]
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
        user_id: user.id,
        email: user.email,
        role: targetRole.name,
      },
    });
  }
}
