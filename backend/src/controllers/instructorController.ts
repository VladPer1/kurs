import { Request, Response } from 'express';
import { Instructor, User, Course, Role } from '../models/index.js';
import { AuthenticatedRequest } from '../middleware/authJwt.js';

export class InstructorController {
  /**
   * GET /api/v1/instructors
   * Public list of instructors with rating and courses
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    const instructors = await Instructor.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email'],
        },
        {
          model: Course,
          as: 'courses',
          where: { status: 'published' },
          required: false,
          attributes: ['id', 'title', 'price', 'start_date', 'available_seats'],
        },
      ],
      order: [['rating', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: instructors,
    });
  }

  /**
   * GET /api/v1/instructors/:id
   * Get single instructor profile
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const instructor = await Instructor.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email'],
        },
        {
          model: Course,
          as: 'courses',
          where: { status: 'published' },
          required: false,
        },
      ],
    });

    if (!instructor) {
      res.status(404).json({
        success: false,
        error: { code: 'INSTRUCTOR_NOT_FOUND', message: 'Профиль преподавателя не найден.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: instructor,
    });
  }

  /**
   * POST /api/v1/instructors
   * Create instructor profile for user (requires instructors:manage or admin)
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { user_id, bio, specialization, rating } = req.body;

    const user = await User.findByPk(user_id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден.' },
      });
      return;
    }

    const existing = await Instructor.findOne({ where: { user_id } });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'INSTRUCTOR_PROFILE_EXISTS', message: 'У данного пользователя уже есть профиль преподавателя.' },
      });
      return;
    }

    // Optionally update user role to instructor if it's currently student
    const instructorRole = await Role.findOne({ where: { name: 'instructor' } });
    if (instructorRole) {
      await user.update({ role_id: instructorRole.id });
    }

    const instructor = await Instructor.create({
      user_id,
      bio: bio || '',
      specialization: specialization || 'Общие курсы',
      rating: rating ? parseFloat(rating) : 5.0,
    });

    res.status(201).json({
      success: true,
      message: 'Профиль преподавателя успешно создан.',
      data: instructor,
    });
  }

  /**
   * PUT /api/v1/instructors/:id
   * Update instructor bio/specialization
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { bio, specialization, rating } = req.body;

    const instructor = await Instructor.findByPk(id);
    if (!instructor) {
      res.status(404).json({
        success: false,
        error: { code: 'INSTRUCTOR_NOT_FOUND', message: 'Профиль преподавателя не найден.' },
      });
      return;
    }

    // Check if requester is owner of profile or admin
    if (req.user?.role !== 'admin' && req.user?.userId !== instructor.user_id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Вы можете редактировать только собственный профиль преподавателя.' },
      });
      return;
    }

    await instructor.update({
      bio: bio !== undefined ? bio : instructor.bio,
      specialization: specialization !== undefined ? specialization : instructor.specialization,
      rating: rating !== undefined && req.user?.role === 'admin' ? parseFloat(rating) : instructor.rating,
    });

    res.status(200).json({
      success: true,
      message: 'Профиль преподавателя успешно обновлен.',
      data: instructor,
    });
  }
}
