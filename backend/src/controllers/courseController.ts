import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Course, Instructor, User, Enrollment } from '../models/index.js';
import { AuthenticatedRequest } from '../middleware/authJwt.js';

export class CourseController {
  /**
   * GET /api/v1/courses
   * Public catalog with pagination and filters
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);
    const offset = (page - 1) * limit;

    const { min_price, max_price, instructor_id, search, status } = req.query;

    const where: any = {};

    // By default only published courses for public catalog, unless explicit
    if (status) {
      where.status = status;
    } else {
      where.status = 'published';
    }

    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price[Op.gte] = parseFloat(min_price as string);
      if (max_price) where.price[Op.lte] = parseFloat(max_price as string);
    }

    if (instructor_id) {
      where.instructor_id = instructor_id;
    }

    if (search && typeof search === 'string') {
      where[Op.or] = [
        { title: { [Op.like]: `%${search.trim()}%` } },
        { description: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const { count, rows } = await Course.findAndCountAll({
      where,
      limit,
      offset,
      order: [['start_date', 'ASC']],
      include: [
        {
          model: Instructor,
          as: 'instructor',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['full_name', 'email'],
            },
          ],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  }

  /**
   * GET /api/v1/courses/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const course = await Course.findByPk(id, {
      include: [
        {
          model: Instructor,
          as: 'instructor',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'full_name', 'email'],
            },
          ],
        },
      ],
    });

    if (!course) {
      res.status(404).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'Курс не найден.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  }

  /**
   * POST /api/v1/courses
   * Create course (permission: courses:create)
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { title, description, price, start_date, max_seats, instructor_id, status } = req.body;

    let targetInstructorId = instructor_id;

    // If caller is an instructor, resolve their instructor_id automatically
    if (!targetInstructorId || req.user?.role !== 'admin') {
      const instructorProfile = await Instructor.findOne({ where: { user_id: req.user?.userId } });
      if (!instructorProfile) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSTRUCTOR_PROFILE_MISSING',
            message: 'Для создания курса необходимо иметь профиль преподавателя.',
          },
        });
        return;
      }
      targetInstructorId = instructorProfile.id;
    }

    const course = await Course.create({
      instructor_id: targetInstructorId,
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      start_date: new Date(start_date),
      max_seats: parseInt(max_seats, 10),
      available_seats: parseInt(max_seats, 10),
      status: status || 'published',
    });

    res.status(201).json({
      success: true,
      message: 'Курс успешно создан.',
      data: course,
    });
  }

  /**
   * PUT /api/v1/courses/:id
   * Update course (permission: courses:edit)
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { title, description, price, start_date, max_seats, status } = req.body;

    const course = await Course.findByPk(id, {
      include: [{ model: Instructor, as: 'instructor' }],
    });

    if (!course) {
      res.status(404).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'Курс не найден.' },
      });
      return;
    }

    // Check ownership: must be author instructor or admin
    if (req.user?.role !== 'admin') {
      const instructorProfile = await Instructor.findOne({ where: { user_id: req.user?.userId } });
      if (!instructorProfile || course.instructor_id !== instructorProfile.id) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Вы можете редактировать только свои курсы.' },
        });
        return;
      }
    }

    // If max_seats updated, adjust available_seats
    let newAvailableSeats = course.available_seats;
    if (max_seats !== undefined) {
      const seatsDifference = parseInt(max_seats, 10) - course.max_seats;
      newAvailableSeats = Math.max(0, course.available_seats + seatsDifference);
    }

    await course.update({
      title: title !== undefined ? title.trim() : course.title,
      description: description !== undefined ? description.trim() : course.description,
      price: price !== undefined ? parseFloat(price) : course.price,
      start_date: start_date ? new Date(start_date) : course.start_date,
      max_seats: max_seats !== undefined ? parseInt(max_seats, 10) : course.max_seats,
      available_seats: newAvailableSeats,
      status: status !== undefined ? status : course.status,
    });

    res.status(200).json({
      success: true,
      message: 'Курс успешно обновлен.',
      data: course,
    });
  }

  /**
   * DELETE /api/v1/courses/:id
   * Delete course (permission: courses:delete)
   */
  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const course = await Course.findByPk(id);
    if (!course) {
      res.status(404).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'Курс не найден.' },
      });
      return;
    }

    if (req.user?.role !== 'admin') {
      const instructorProfile = await Instructor.findOne({ where: { user_id: req.user?.userId } });
      if (!instructorProfile || course.instructor_id !== instructorProfile.id) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Вы можете удалять только свои курсы.' },
        });
        return;
      }
    }

    // Check if course has confirmed enrollments
    const activeEnrollments = await Enrollment.count({
      where: {
        course_id: course.id,
        status: ['confirmed', 'pending_payment'],
      },
    });

    if (activeEnrollments > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'COURSE_HAS_ENROLLMENTS',
          message: `Невозможно удалить курс с активными записями (${activeEnrollments} чел.). Вместо этого измените статус на archived.`,
        },
      });
      return;
    }

    await course.destroy();

    res.status(200).json({
      success: true,
      message: 'Курс успешно удален.',
    });
  }
}
