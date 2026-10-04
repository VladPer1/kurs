import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Course, Instructor, User, Enrollment } from '../models/index.js';
import { AuthenticatedRequest } from '../middleware/authJwt.js';

export class CourseController {
  // GetAllCourses Godoc
  // @Summary      Каталог курсов
  // @Description  Каталог опубликованных курсов с фильтрацией, пагинацией и поиском
  // @Tags         courses
  // @Accept       json
  // @Produce      json
  // @Param        page           query     int     false  "Номер страницы"
  // @Param        limit          query     int     false  "Количество на страницу"
  // @Param        search         query     string  false  "Поиск по названию или описанию"
  // @Param        min_price      query     number  false  "Минимальная цена"
  // @Param        max_price      query     number  false  "Максимальная цена"
  // @Param        instructor_id  query     string  false  "ID преподавателя"
  // @Success      200            {object}  models.CourseListResponse
  // @Router       /courses [get]
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
        total_pages: Math.ceil(count / limit),
      },
    });
  }

  // GetCourseByID Godoc
  // @Summary      Детали курса по ID
  // @Description  Возвращает полную информацию о курсе
  // @Tags         courses
  // @Accept       json
  // @Produce      json
  // @Param        id   path      string  true  "Course ID"
  // @Success      200  {object}  models.CourseResponse
  // @Failure      404  {object}  models.ErrorResponse
  // @Router       /courses/{id} [get]
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

  // CreateCourse Godoc
  // @Summary      Создать курс
  // @Description  Создание нового курса (требуется особое разрешение courses:create)
  // @Tags         courses
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        request  body      models.CreateCourseRequest  true  "Данные курса"
  // @Success      201      {object}  models.CourseResponse
  // @Failure      400      {object}  models.ErrorResponse
  // @Failure      403      {object}  models.ErrorResponse
  // @Router       /courses [post]
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { title, description, price, start_date, max_seats, instructor_id, status } = req.body;

    let targetInstructorId = instructor_id;

    if (targetInstructorId) {
      const instructor = await Instructor.findByPk(targetInstructorId);
      if (!instructor) {
        res.status(404).json({
          success: false,
          error: {
            code: 'INSTRUCTOR_NOT_FOUND',
            message: 'Указанный преподаватель (instructor_id) не найден.',
          },
        });
        return;
      }
    } else {
      // Find caller's instructor profile
      let instructorProfile = await Instructor.findOne({ where: { user_id: req.user?.userId } });
      if (!instructorProfile) {
        // If caller has permission courses:create, auto-resolve instructor:
        // Use first active instructor or auto-create an instructor profile for the caller
        const firstInstructor = await Instructor.findOne();
        if (firstInstructor) {
          targetInstructorId = firstInstructor.id;
        } else {
          instructorProfile = await Instructor.create({
            user_id: req.user?.userId!,
            bio: 'Преподаватель учебной платформы',
            specialization: 'Общие курсы',
            rating: 5.0,
          });
          targetInstructorId = instructorProfile.id;
        }
      } else {
        targetInstructorId = instructorProfile.id;
      }
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

    const populatedCourse = await Course.findByPk(course.id, {
      include: [
        {
          model: Instructor,
          as: 'instructor',
          include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Курс успешно создан (разрешение courses:create подтверждено).',
      data: populatedCourse,
    });
  }

  // UpdateCourse Godoc
  // @Summary      Редактировать курс
  // @Description  Редактирование курса (разрешение courses:edit, только автор или админ)
  // @Tags         courses
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        id       path      string                      true  "Course ID"
  // @Param        request  body      models.UpdateCourseRequest  true  "Обновляемые поля"
  // @Success      200      {object}  models.CourseResponse
  // @Failure      403      {object}  models.ErrorResponse
  // @Failure      404      {object}  models.ErrorResponse
  // @Router       /courses/{id} [put]
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

    // Check ownership: must be author instructor or have instructors:manage / courses:delete privilege
    const canManageAnyCourse = req.user?.permissions?.includes('instructors:manage') || req.user?.permissions?.includes('courses:delete');
    if (!canManageAnyCourse) {
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

  // DeleteCourse Godoc
  // @Summary      Удалить курс
  // @Description  Удаление курса (разрешение courses:delete, запрещено при наличии активных записей)
  // @Tags         courses
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        id   path      string  true  "Course ID"
  // @Success      200  {object}  models.SuccessResponse
  // @Failure      400  {object}  models.ErrorResponse
  // @Failure      403  {object}  models.ErrorResponse
  // @Router       /courses/{id} [delete]
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

    const canDeleteAnyCourse = req.user?.permissions?.includes('instructors:manage') || req.user?.permissions?.includes('users:manage_roles');
    if (!canDeleteAnyCourse) {
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

  // GetCourseStudents Godoc
  // @Summary      Список студентов курса
  // @Description  Возвращает список студентов конкретного курса (разрешение courses:view_students)
  // @Tags         courses
  // @Accept       json
  // @Produce      json
  // @Security     BearerAuth
  // @Param        id   path      string  true  "Course ID"
  // @Success      200  {object}  models.CourseStudentsResponse
  // @Failure      403  {object}  models.ErrorResponse
  // @Failure      404  {object}  models.ErrorResponse
  // @Router       /courses/{id}/students [get]
  static async getCourseStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    });

    if (!course) {
      res.status(404).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'Курс не найден.' },
      });
      return;
    }

    const canViewAll = req.user?.permissions?.includes('users:view_all') || req.user?.permissions?.includes('courses:view_all');
    if (!canViewAll && course.instructor?.user_id !== req.user?.userId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Вы можете просматривать список студентов только для своих курсов.' },
      });
      return;
    }

    const students = ((course as any).enrollments || []).map((enrollment: any) => ({
      enrollment_id: enrollment.id,
      user_id: enrollment.user?.id,
      full_name: enrollment.user?.full_name,
      email: enrollment.user?.email,
      status: enrollment.status,
      enrolled_at: enrollment.enrolled_at,
    }));

    res.status(200).json({
      success: true,
      data: {
        course_id: course.id,
        course_title: course.title,
        status: course.status,
        max_seats: course.max_seats,
        available_seats: course.available_seats,
        students_count: students.length,
        students,
      },
    });
  }
}
