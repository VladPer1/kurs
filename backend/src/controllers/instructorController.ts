import { Request, Response } from 'express';
import { Instructor, User, Course, Role, Enrollment } from '../models/index.js';
import { AuthenticatedRequest } from '../middleware/authJwt.js';

export class InstructorController {
  /**
   * GET /api/v1/instructors
   * Public list of instructors with rating and courses
   */
  static async getAll(_req: Request, res: Response): Promise<void> {
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

    // Check if requester has instructors:manage permission or is owner of profile
    const canManageAllInstructors = req.user?.permissions?.includes('instructors:manage');
    if (!canManageAllInstructors && req.user?.userId !== instructor.user_id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Вы можете редактировать только собственный профиль преподавателя.' },
      });
      return;
    }

    await instructor.update({
      bio: bio !== undefined ? bio : instructor.bio,
      specialization: specialization !== undefined ? specialization : instructor.specialization,
      rating: rating !== undefined && canManageAllInstructors ? parseFloat(rating) : instructor.rating,
    });

    res.status(200).json({
      success: true,
      message: 'Профиль преподавателя успешно обновлен.',
      data: instructor,
    });
  }

  /**
   * GET /api/v1/instructors/my/students
   * Get all students enrolled in the instructor's courses
   * Requires permission: instructors:view_students
   */
  static async getMyStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const canViewAll = req.user?.permissions?.includes('users:view_all');

    let instructorId: string | undefined;

    if (canViewAll && req.query.instructor_id) {
      instructorId = String(req.query.instructor_id);
    } else {
      const instructor = await Instructor.findOne({ where: { user_id: userId } });
      if (!instructor) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'У вас нет профиля преподавателя.' },
        });
        return;
      }
      instructorId = instructor.id;
    }

    const courses = await Course.findAll({
      where: { instructor_id: instructorId },
      include: [
        {
          model: Enrollment,
          as: 'enrollments',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'full_name', 'email', 'created_at'],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const studentsMap = new Map<string, any>();
    const courseSummaries = courses.map((course: any) => {
      const courseEnrollments = (course.enrollments || []).map((enrollment: any) => {
        const studentInfo = {
          student_id: enrollment.user?.id,
          full_name: enrollment.user?.full_name,
          email: enrollment.user?.email,
          enrollment_id: enrollment.id,
          course_id: course.id,
          course_title: course.title,
          status: enrollment.status,
          enrolled_at: enrollment.enrolled_at,
        };

        if (enrollment.user?.id && !studentsMap.has(enrollment.user.id)) {
          studentsMap.set(enrollment.user.id, {
            id: enrollment.user.id,
            full_name: enrollment.user.full_name,
            email: enrollment.user.email,
            courses_count: 1,
            enrolled_courses: [{ course_id: course.id, course_title: course.title, status: enrollment.status }],
          });
        } else if (enrollment.user?.id) {
          const existing = studentsMap.get(enrollment.user.id);
          existing.courses_count += 1;
          existing.enrolled_courses.push({ course_id: course.id, course_title: course.title, status: enrollment.status });
        }

        return studentInfo;
      });

      return {
        course_id: course.id,
        course_title: course.title,
        status: course.status,
        max_seats: course.max_seats,
        available_seats: course.available_seats,
        students_enrolled_count: courseEnrollments.length,
        students: courseEnrollments,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        total_unique_students: studentsMap.size,
        courses: courseSummaries,
        students: Array.from(studentsMap.values()),
      },
    });
  }
}
