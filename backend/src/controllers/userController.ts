import { Response } from 'express';
import { User, Role, Permission, Course, Enrollment, Instructor } from '../models/index.js';
import { AuthenticatedRequest } from '../middleware/authJwt.js';
import { Op } from 'sequelize';

export class UserController {
  // GetAllUsers Godoc
  // @Summary      Получить список всех пользователей системы с их курсами
  // @Description  Возвращает всех пользователей со связанными курсами (Только для Администратора, пермишн users:view_all)
  // @Tags         users
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        search  query     string  false  "Поиск по имени или email"
  // @Param        role    query     string  false  "Фильтр по роли (admin, instructor, student)"
  // @Success      200     {object}  models.UserListResponse  "Список пользователей"
  // @Failure      401     {object}  models.ErrorResponse      "Не авторизован"
  // @Failure      403     {object}  models.ErrorResponse      "Доступ запрещен (требуется users:view_all)"
  // @Router       /users [get]
  static async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { role, search } = req.query;

    const whereClause: any = {};
    if (search && typeof search === 'string') {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const roleInclude: any = {
      model: Role,
      as: 'role',
      attributes: ['id', 'name', 'description'],
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'slug', 'description'],
          through: { attributes: [] },
        },
      ],
    };

    if (role && typeof role === 'string') {
      roleInclude.where = { name: role };
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'full_name', 'email', 'failed_login_attempts', 'lock_until', 'created_at', 'updated_at'],
      include: [
        roleInclude,
        {
          model: Enrollment,
          as: 'enrollments',
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'title', 'price', 'status', 'start_date'],
            },
          ],
        },
        {
          model: Instructor,
          as: 'instructor_profile',
          include: [
            {
              model: Course,
              as: 'courses',
              attributes: ['id', 'title', 'price', 'status', 'available_seats', 'max_seats', 'start_date'],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const formattedUsers = users.map((u: any) => {
      const isLocked = Boolean(u.lock_until && new Date(u.lock_until) > new Date());
      const roleName = u.role?.name || 'student';

      const enrolledCourses = (u.enrollments || []).map((e: any) => ({
        enrollment_id: e.id,
        course_id: e.course?.id,
        course_title: e.course?.title,
        course_price: e.course?.price,
        course_status: e.course?.status,
        enrollment_status: e.status,
        enrolled_at: e.enrolled_at,
      }));

      const teachingCourses = (u.instructor_profile?.courses || []).map((c: any) => ({
        course_id: c.id,
        title: c.title,
        price: c.price,
        status: c.status,
        available_seats: c.available_seats,
        max_seats: c.max_seats,
        start_date: c.start_date,
      }));

      return {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: {
          id: u.role?.id,
          name: roleName,
          description: u.role?.description,
          permissions: (u.role?.permissions || []).map((p: any) => p.slug || p.name),
        },
        security_status: {
          is_locked: isLocked,
          lock_until: u.lock_until,
          failed_login_attempts: u.failed_login_attempts,
        },
        enrolled_courses: enrolledCourses,
        total_enrolled_courses: enrolledCourses.length,
        teaching_courses: teachingCourses,
        total_teaching_courses: teachingCourses.length,
        created_at: u.created_at,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        total: formattedUsers.length,
        users: formattedUsers,
      },
    });
  }

  // GetUserByID Godoc
  // @Summary      Получить пользователя по ID
  // @Description  Возвращает данные пользователя по его уникальному идентификатору со связанными курсами
  // @Tags         users
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        id   path      string  true  "User ID (UUID)"
  // @Success      200  {object}  models.UserResponse   "Детальная информация о пользователе"
  // @Failure      401  {object}  models.ErrorResponse  "Не авторизован"
  // @Failure      403  {object}  models.ErrorResponse  "Доступ запрещен"
  // @Failure      404  {object}  models.ErrorResponse  "Пользователь не найден"
  // @Router       /users/{id} [get]
  static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const user: any = await User.findByPk(id, {
      attributes: ['id', 'full_name', 'email', 'failed_login_attempts', 'lock_until', 'created_at', 'updated_at'],
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'description'],
          include: [
            {
              model: Permission,
              as: 'permissions',
              attributes: ['id', 'slug', 'description'],
              through: { attributes: [] },
            },
          ],
        },
        {
          model: Enrollment,
          as: 'enrollments',
          include: [
            {
              model: Course,
              as: 'course',
            },
          ],
        },
        {
          model: Instructor,
          as: 'instructor_profile',
          include: [
            {
              model: Course,
              as: 'courses',
            },
          ],
        },
      ],
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден.' },
      });
      return;
    }

    const isLocked = Boolean(user.lock_until && new Date(user.lock_until) > new Date());
    const enrolledCourses = (user.enrollments || []).map((e: any) => ({
      enrollment_id: e.id,
      course_id: e.course?.id,
      course_title: e.course?.title,
      course_price: e.course?.price,
      course_status: e.course?.status,
      enrollment_status: e.status,
      enrolled_at: e.enrolled_at,
    }));

    const teachingCourses = (user.instructor_profile?.courses || []).map((c: any) => ({
      course_id: c.id,
      title: c.title,
      price: c.price,
      status: c.status,
      available_seats: c.available_seats,
      max_seats: c.max_seats,
      start_date: c.start_date,
    }));

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: {
          id: user.role?.id,
          name: user.role?.name || 'student',
          description: user.role?.description,
          permissions: (user.role?.permissions || []).map((p: any) => p.slug || p.name),
        },
        security_status: {
          is_locked: isLocked,
          lock_until: user.lock_until,
          failed_login_attempts: user.failed_login_attempts,
        },
        enrolled_courses: enrolledCourses,
        teaching_courses: teachingCourses,
        created_at: user.created_at,
      },
    });
  }
}
