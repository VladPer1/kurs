import { Response } from 'express';
import { Enrollment, Course, User, Instructor, Payment } from '../models/index.js';
import { AuthenticatedRequest } from '../middleware/authJwt.js';
import { sequelize } from '../config/database.js';

export class EnrollmentController {
  /**
   * POST /api/v1/enrollments
   * Reserve seat and create enrollment for course
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { course_id } = req.body;
    const userId = req.user?.userId;

    if (!course_id) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'course_id обязателен.' },
      });
      return;
    }

    const course = await Course.findByPk(course_id);
    if (!course) {
      res.status(404).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'Курс не найден.' },
      });
      return;
    }

    if (course.status !== 'published') {
      res.status(400).json({
        success: false,
        error: { code: 'COURSE_NOT_AVAILABLE', message: 'Курс не доступен для записи (не опубликован).' },
      });
      return;
    }

    // Check existing active enrollment
    const existing = await Enrollment.findOne({
      where: {
        user_id: userId,
        course_id,
        status: ['pending_payment', 'confirmed'],
      },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_ENROLLED',
          message: `Вы уже записаны на данный курс (статус: ${existing.status}).`,
          enrollmentId: existing.id,
        },
      });
      return;
    }

    if (course.available_seats <= 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_SEATS_AVAILABLE', message: 'На данном курсе закончились свободные места.' },
      });
      return;
    }

    // Transactional seat decrement & enrollment creation
    const t = await sequelize.transaction();
    try {
      await course.decrement('available_seats', { by: 1, transaction: t });

      const enrollment = await Enrollment.create(
        {
          user_id: userId!,
          course_id,
          status: 'pending_payment',
          enrolled_at: new Date(),
        },
        { transaction: t }
      );

      await t.commit();

      const created = await Enrollment.findByPk(enrollment.id, {
        include: [{ model: Course, as: 'course' }],
      });

      res.status(201).json({
        success: true,
        message: 'Вы успешно записаны на курс. Место зарезервировано, ожидается оплата.',
        data: created,
      });
    } catch (err: any) {
      await t.rollback();
      res.status(500).json({
        success: false,
        error: { code: 'ENROLLMENT_FAILED', message: 'Не удалось завершить запись на курс.' },
      });
    }
  }

  /**
   * GET /api/v1/enrollments/my
   * Get authenticated student's enrollments
   */
  static async getMy(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;

    const enrollments = await Enrollment.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Course,
          as: 'course',
          include: [
            {
              model: Instructor,
              as: 'instructor',
              include: [{ model: User, as: 'user', attributes: ['full_name', 'email'] }],
            },
          ],
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['id', 'amount', 'status', 'transaction_ref', 'paid_at'],
        },
      ],
      order: [['enrolled_at', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: enrollments,
    });
  }

  /**
   * GET /api/v1/enrollments/instructor
   * Get enrollments for instructor's courses
   */
  static async getForInstructor(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const canViewAll = req.user?.permissions?.includes('courses:view_all');

    const instructor = await Instructor.findOne({ where: { user_id: userId } });
    if (!instructor && !canViewAll) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'У вас нет профиля преподавателя.' },
      });
      return;
    }

    const courseWhere = canViewAll ? {} : { instructor_id: instructor?.id };

    const enrollments = await Enrollment.findAll({
      include: [
        {
          model: Course,
          as: 'course',
          where: courseWhere,
          required: true,
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email'],
        },
      ],
      order: [['enrolled_at', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: enrollments,
    });
  }

  /**
   * DELETE /api/v1/enrollments/:id
   * Cancel enrollment and release reserved seat
   */
  static async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user?.userId;

    const enrollment = await Enrollment.findByPk(id, {
      include: [{ model: Course, as: 'course' }],
    });

    if (!enrollment) {
      res.status(404).json({
        success: false,
        error: { code: 'ENROLLMENT_NOT_FOUND', message: 'Запись не найдена.' },
      });
      return;
    }

    // Must be own enrollment or user with permission courses:delete / users:manage_roles
    const canCancelAnyEnrollment = req.user?.permissions?.includes('courses:delete') || req.user?.permissions?.includes('users:manage_roles');
    if (!canCancelAnyEnrollment && enrollment.user_id !== userId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Вы можете отменять только свои записи.' },
      });
      return;
    }

    if (enrollment.status === 'cancelled') {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CANCELLED', message: 'Запись уже была отменена ранее.' },
      });
      return;
    }

    const t = await sequelize.transaction();
    try {
      await enrollment.update({ status: 'cancelled' }, { transaction: t });

      // Return seat to available seats
      const course = await Course.findByPk(enrollment.course_id);
      if (course) {
        await course.increment('available_seats', { by: 1, transaction: t });
      }

      await t.commit();

      res.status(200).json({
        success: true,
        message: 'Запись на курс успешно отменена. Зарезервированное место освобождено.',
      });
    } catch (err: any) {
      await t.rollback();
      res.status(500).json({
        success: false,
        error: { code: 'CANCEL_FAILED', message: 'Не удалось отменить запись.' },
      });
    }
  }
}
