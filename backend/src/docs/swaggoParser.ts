import fs from 'fs';
import path from 'path';

export interface SwaggoDocConfig {
  info: {
    title: string;
    version: string;
    description: string;
  };
  basePath: string;
  controllersDir: string;
}

// Complete OpenAPI 3.0 Schemas with full property definitions and realistic examples for all models
export const SWAGGER_SCHEMAS: Record<string, any> = {
  RegisterRequest: {
    type: 'object',
    required: ['email', 'password', 'full_name', 'role'],
    properties: {
      email: { type: 'string', format: 'email', example: 'student@example.com' },
      password: { type: 'string', minLength: 8, example: 'StudentSecurePass123!' },
      full_name: { type: 'string', example: 'Иван Иванов' },
      role: {
        type: 'string',
        enum: ['student', 'instructor', 'manager'],
        example: 'student',
        description: 'Обязательная роль пользователя (student, instructor, manager)',
      },
    },
    example: {
      email: 'student@example.com',
      password: 'StudentSecurePass123!',
      full_name: 'Иван Иванов',
      role: 'student',
    },
  },

  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'admin@course-platform.local' },
      password: { type: 'string', example: 'AdminSecurePass123!' },
    },
    example: {
      email: 'admin@course-platform.local',
      password: 'AdminSecurePass123!',
    },
  },

  CreateCourseRequest: {
    type: 'object',
    required: ['title', 'price', 'start_date', 'max_seats'],
    properties: {
      title: { type: 'string', example: 'Архитектура микросервисов на Go и Kubernetes' },
      description: {
        type: 'string',
        example: 'Глубокий практический курс по разработке распределенных отказоустойчивых систем на Golang.',
      },
      price: { type: 'number', example: 45000 },
      start_date: { type: 'string', format: 'date-time', example: '2026-11-01T10:00:00.000Z' },
      max_seats: { type: 'integer', example: 30 },
      instructor_id: { type: 'string', example: 'instr-uuid-1' },
      status: { type: 'string', enum: ['draft', 'published', 'archived'], example: 'published' },
    },
    example: {
      title: 'Архитектура микросервисов на Go и Kubernetes',
      description: 'Глубокий практический курс по разработке распределенных отказоустойчивых систем на Golang.',
      price: 45000,
      start_date: '2026-11-01T10:00:00.000Z',
      max_seats: 30,
      status: 'published',
    },
  },

  UpdateCourseRequest: {
    type: 'object',
    properties: {
      title: { type: 'string', example: 'Архитектура микросервисов на Go (Обновленный)' },
      description: { type: 'string', example: 'Добавлены модули по gRPC, Kafka и OpenTelemetry.' },
      price: { type: 'number', example: 49000 },
      start_date: { type: 'string', format: 'date-time', example: '2026-11-15T10:00:00.000Z' },
      max_seats: { type: 'integer', example: 35 },
      status: { type: 'string', enum: ['draft', 'published', 'archived'], example: 'published' },
    },
    example: {
      title: 'Архитектура микросервисов на Go (Обновленный)',
      description: 'Добавлены модули по gRPC, Kafka и OpenTelemetry.',
      price: 49000,
      start_date: '2026-11-15T10:00:00.000Z',
      max_seats: 35,
      status: 'published',
    },
  },

  CreateRoleRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'moderator' },
      description: { type: 'string', example: 'Модератор обучающих курсов и заявок студентов' },
    },
    example: {
      name: 'moderator',
      description: 'Модератор обучающих курсов и заявок студентов',
    },
  },

  UpdateRoleRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', example: 'content_manager' },
      description: { type: 'string', example: 'Управление публикацией учебных программ' },
    },
    example: {
      name: 'content_manager',
      description: 'Управление публикацией учебных программ',
    },
  },

  UpdateRolePermissionsRequest: {
    type: 'object',
    required: ['permission_ids'],
    properties: {
      permission_ids: {
        type: 'array',
        items: { type: 'string' },
        example: ['perm-courses-create', 'perm-courses-edit', 'perm-courses-view-students'],
      },
    },
    example: {
      permission_ids: ['perm-courses-create', 'perm-courses-edit'],
    },
  },

  AssignRoleRequest: {
    type: 'object',
    required: ['role_id'],
    properties: {
      role_id: { type: 'string', example: 'role-uuid-instructor' },
    },
    example: {
      role_id: 'role-uuid-instructor',
    },
  },

  CreateInstructorRequest: {
    type: 'object',
    required: ['user_id'],
    properties: {
      user_id: { type: 'string', example: 'usr-uuid-example-1' },
      bio: { type: 'string', example: 'Staff Backend Engineer, архитектор распределенных систем.' },
      specialization: { type: 'string', example: 'Golang, Highload, PostgreSQL, Docker' },
      rating: { type: 'number', example: 4.95 },
    },
    example: {
      user_id: 'usr-uuid-example-1',
      bio: 'Staff Backend Engineer, архитектор распределенных систем.',
      specialization: 'Golang, Highload, PostgreSQL, Docker',
      rating: 4.95,
    },
  },

  UpdateInstructorRequest: {
    type: 'object',
    properties: {
      bio: { type: 'string', example: 'Главный технический руководитель направления Cloud-Native.' },
      specialization: { type: 'string', example: 'Golang, Kubernetes, Distributed Systems' },
      rating: { type: 'number', example: 5.0 },
    },
    example: {
      bio: 'Главный технический руководитель направления Cloud-Native.',
      specialization: 'Golang, Kubernetes, Distributed Systems',
      rating: 5.0,
    },
  },

  CreateEnrollmentRequest: {
    type: 'object',
    required: ['course_id'],
    properties: {
      course_id: { type: 'string', example: 'course-uuid-golang' },
    },
    example: {
      course_id: 'course-uuid-golang',
    },
  },

  AddCardRequest: {
    type: 'object',
    required: ['card_number', 'card_holder', 'exp_month', 'exp_year', 'cvv'],
    properties: {
      card_number: { type: 'string', example: '4532758812345678', description: '16-значный номер банковской карты' },
      card_holder: { type: 'string', example: 'IVAN IVANOV', description: 'Имя держателя карты латиницей' },
      exp_month: { type: 'string', example: '12', description: 'Месяц окончания (01-12)' },
      exp_year: { type: 'string', example: '2028', description: 'Год окончания (YYYY)' },
      cvv: { type: 'string', example: '789', description: '3 или 4 цифры кода CVV' },
      is_default: { type: 'boolean', example: true },
    },
    example: {
      card_number: '4532758812345678',
      card_holder: 'IVAN IVANOV',
      exp_month: '12',
      exp_year: '2028',
      cvv: '789',
      is_default: true,
    },
  },

  CheckoutPaymentRequest: {
    type: 'object',
    required: ['enrollment_id'],
    properties: {
      enrollment_id: { type: 'string', example: 'enr-uuid-1234' },
      payment_method_id: { type: 'string', example: 'card-uuid-5678' },
    },
    example: {
      enrollment_id: 'enr-uuid-1234',
      payment_method_id: 'card-uuid-5678',
    },
  },

  TokenResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },
    },
    example: {
      success: true,
      data: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3ItMSIsInJvbGUiOiJzdHVkZW50In0...',
      },
    },
  },

  // Response Models
  AuthResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Аутентификация успешна.' },
      data: {
        type: 'object',
        properties: {
          access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: {
            type: 'object',
            required: ['id', 'email', 'full_name', 'role'],
            properties: {
              id: { type: 'string', example: 'usr-uuid-1' },
              email: { type: 'string', example: 'admin@course-platform.local' },
              full_name: { type: 'string', example: 'Администратор Системы' },
              role: {
                type: 'object',
                required: ['id', 'name', 'permissions'],
                properties: {
                  id: { type: 'string', example: 'role-uuid-admin' },
                  name: { type: 'string', example: 'admin' },
                  description: { type: 'string', example: 'Полный администратор платформы' },
                  permissions: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                      'users:view_all',
                      'users:manage_roles',
                      'roles:manage',
                      'courses:create',
                      'payments:view_all',
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    example: {
      success: true,
      message: 'Аутентификация успешна.',
      data: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3ItMSIsInJvbGUiOiJhZG1pbiJ9...',
        user: {
          id: 'usr-uuid-1',
          email: 'admin@course-platform.local',
          full_name: 'Администратор Системы',
          role: {
            id: 'role-uuid-admin',
            name: 'admin',
            description: 'Полный администратор платформы',
            permissions: [
              'users:view_all',
              'users:manage_roles',
              'roles:manage',
              'courses:create',
              'payments:view_all',
            ],
          },
        },
      },
    },
  },

  CurrentUserResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'usr-uuid-1' },
          email: { type: 'string', example: 'admin@course-platform.local' },
          full_name: { type: 'string', example: 'Администратор Системы' },
          role: {
            type: 'object',
            required: ['id', 'name', 'permissions'],
            properties: {
              id: { type: 'string', example: 'role-uuid-admin' },
              name: { type: 'string', example: 'admin' },
              description: { type: 'string', example: 'Полный администратор платформы' },
              permissions: {
                type: 'array',
                items: { type: 'string' },
                example: ['users:view_all', 'roles:manage'],
              },
            },
          },
          created_at: { type: 'string', example: '2026-10-04T00:00:00.000Z' },
        },
      },
    },
    example: {
      success: true,
      data: {
        id: 'usr-uuid-1',
        email: 'admin@course-platform.local',
        full_name: 'Администратор Системы',
        role: {
          id: 'role-uuid-admin',
          name: 'admin',
          description: 'Полный администратор платформы',
          permissions: [
            'users:view_all',
            'users:manage_roles',
            'roles:manage',
            'courses:create',
            'payments:view_all',
          ],
        },
        created_at: '2026-10-04T00:00:00.000Z',
      },
    },
  },

  UserResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        required: ['id', 'email', 'full_name', 'role'],
        properties: {
          id: { type: 'string', example: 'usr-uuid-1' },
          email: { type: 'string', example: 'student@example.com' },
          full_name: { type: 'string', example: 'Иван Иванов' },
          role: {
            type: 'object',
            required: ['id', 'name', 'permissions'],
            properties: {
              id: { type: 'string', example: 'role-uuid-student' },
              name: { type: 'string', example: 'student' },
              description: { type: 'string', example: 'Слушатель курсов' },
              permissions: {
                type: 'array',
                items: { type: 'string' },
                example: ['courses:view', 'enrollments:create', 'enrollments:view_my'],
              },
            },
          },
          courses: {
            type: 'array',
            items: { type: 'object' },
            example: [{ id: 'course-1', title: 'Основы Golang', status: 'confirmed' }],
          },
        },
      },
    },
    example: {
      success: true,
      data: {
        id: 'usr-uuid-1',
        email: 'student@example.com',
        full_name: 'Иван Иванов',
        role: {
          id: 'role-uuid-student',
          name: 'student',
          description: 'Слушатель курсов',
          permissions: ['courses:view', 'enrollments:create', 'enrollments:view_my'],
        },
        enrollments: [
          {
            id: 'enr-1',
            status: 'confirmed',
            course: { id: 'c-1', title: 'Основы Go', price: 30000 },
          },
        ],
      },
    },
  },

  UserListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 12 },
          users: {
            type: 'array',
            items: { $ref: '#/components/schemas/UserResponse' },
          },
        },
      },
    },
    example: {
      success: true,
      data: {
        total: 2,
        users: [
          {
            id: 'usr-1',
            email: 'admin@course-platform.local',
            full_name: 'Администратор Системы',
            role: { name: 'admin' },
          },
          {
            id: 'usr-2',
            email: 'student@example.com',
            full_name: 'Иван Иванов',
            role: { name: 'student' },
          },
        ],
      },
    },
  },

  RoleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'role-uuid-instructor' },
          name: { type: 'string', example: 'instructor' },
          description: { type: 'string', example: 'Преподаватель курсов' },
          permissions: {
            type: 'array',
            items: { type: 'object' },
            example: [
              { id: 'perm-1', code: 'courses:create', description: 'Создание курсов' },
              { id: 'perm-2', code: 'courses:edit', description: 'Редактирование своих курсов' },
            ],
          },
        },
      },
    },
    example: {
      success: true,
      data: {
        id: 'role-uuid-instructor',
        name: 'instructor',
        description: 'Преподаватель курсов',
        permissions: [
          { id: 'perm-1', code: 'courses:create', description: 'Создание курсов' },
          { id: 'perm-2', code: 'courses:edit', description: 'Редактирование своих курсов' },
          { id: 'perm-3', code: 'courses:view_students', description: 'Просмотр студентов курса' },
        ],
      },
    },
  },

  RoleListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/RoleResponse' },
      },
    },
    example: {
      success: true,
      data: [
        { id: 'role-1', name: 'admin', description: 'Полный администратор платформы' },
        { id: 'role-2', name: 'instructor', description: 'Преподаватель курсов' },
        { id: 'role-3', name: 'student', description: 'Студент / Слушатель' },
      ],
    },
  },

  AssignRoleResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Пользователю успешно назначена роль instructor.' },
      data: {
        type: 'object',
        properties: {
          user_id: { type: 'string', example: 'usr-uuid-1' },
          email: { type: 'string', example: 'student@example.com' },
          role: { type: 'string', example: 'instructor' },
        },
      },
    },
    example: {
      success: true,
      message: 'Пользователю успешно назначена роль instructor.',
      data: {
        user_id: 'usr-uuid-1',
        email: 'student@example.com',
        role: 'instructor',
      },
    },
  },

  PermissionListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            code: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
    example: {
      success: true,
      data: [
        { id: 'p-1', code: 'users:view_all', category: 'users', description: 'Просмотр всех пользователей' },
        { id: 'p-2', code: 'courses:create', category: 'courses', description: 'Создание новых обучающих курсов' },
        { id: 'p-3', code: 'roles:manage', category: 'roles', description: 'Управление ролями и правами RBAC' },
      ],
    },
  },

  CourseResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'c-uuid-1' },
          title: { type: 'string', example: 'Разработка на Go и TypeScript' },
          description: { type: 'string', example: 'Практический интенсив' },
          price: { type: 'number', example: 45000 },
          start_date: { type: 'string', example: '2026-11-01T10:00:00.000Z' },
          max_seats: { type: 'integer', example: 25 },
          available_seats: { type: 'integer', example: 24 },
          status: { type: 'string', example: 'published' },
        },
      },
    },
    example: {
      success: true,
      data: {
        id: 'c-uuid-1',
        title: 'Разработка на Go и TypeScript',
        description: 'Практический интенсив по созданию масштабируемых систем.',
        price: 45000,
        start_date: '2026-11-01T10:00:00.000Z',
        max_seats: 25,
        available_seats: 24,
        status: 'published',
        instructor: {
          id: 'instr-1',
          specialization: 'Golang, Highload',
          user: { full_name: 'Алексей Архитекторов', email: 'alexey@instructor.local' },
        },
      },
    },
  },

  CourseListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/CourseResponse' },
      },
      pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 10 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total_pages: { type: 'integer', example: 1 },
        },
      },
    },
    example: {
      success: true,
      data: [
        {
          id: 'c-1',
          title: 'Golang Microservices & Docker',
          price: 45000,
          start_date: '2026-11-01T10:00:00.000Z',
          available_seats: 18,
          max_seats: 25,
          status: 'published',
        },
      ],
      pagination: { total: 1, page: 1, limit: 10, total_pages: 1 },
    },
  },

  CourseStudentsResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          course_id: { type: 'string', example: 'c-1' },
          course_title: { type: 'string', example: 'Разработка на Go' },
          total_students: { type: 'integer', example: 5 },
          students: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                student_id: { type: 'string' },
                full_name: { type: 'string' },
                email: { type: 'string' },
                status: { type: 'string' },
              },
            },
          },
        },
      },
    },
    example: {
      success: true,
      data: {
        course_id: 'c-1',
        course_title: 'Разработка на Go',
        total_students: 1,
        students: [
          {
            enrollment_id: 'enr-1',
            student_id: 'usr-student-1',
            full_name: 'Иван Иванов',
            email: 'student@example.com',
            status: 'confirmed',
            enrolled_at: '2026-10-04T02:00:00.000Z',
          },
        ],
      },
    },
  },

  InstructorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'instr-1' },
          bio: { type: 'string', example: 'Senior Go Developer' },
          specialization: { type: 'string', example: 'Golang, Highload' },
          rating: { type: 'number', example: 4.95 },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'usr-1' },
              full_name: { type: 'string', example: 'Алексей Архитекторов' },
              email: { type: 'string', example: 'alex@mentor.ru' },
            },
          },
        },
      },
    },
    example: {
      success: true,
      data: {
        id: 'instr-1',
        bio: 'Senior Go Developer, 10 лет опыта в распределенных системах.',
        specialization: 'Golang, Distributed Systems, Docker',
        rating: 4.95,
        user: { id: 'usr-1', full_name: 'Алексей Архитекторов', email: 'alex@mentor.ru' },
      },
    },
  },

  InstructorListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/InstructorResponse' },
      },
    },
    example: {
      success: true,
      data: [
        {
          id: 'instr-1',
          specialization: 'Golang, Highload',
          rating: 4.95,
          user: { full_name: 'Алексей Архитекторов', email: 'alex@mentor.ru' },
        },
      ],
    },
  },

  InstructorStudentsResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          instructor: { type: 'object' },
          total_students: { type: 'integer', example: 8 },
          enrollments: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    example: {
      success: true,
      data: {
        total_students: 2,
        enrollments: [
          {
            enrollment_id: 'enr-1',
            student_name: 'Иван Иванов',
            student_email: 'student@example.com',
            course_title: 'Golang Architecture',
            status: 'confirmed',
          },
        ],
      },
    },
  },

  EnrollmentResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Место успешно забронировано!' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'enr-1234' },
          status: { type: 'string', example: 'pending_payment' },
          enrolled_at: { type: 'string', example: '2026-10-04T04:00:00.000Z' },
          course: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'course-1' },
              title: { type: 'string', example: 'Golang Microservices' },
              price: { type: 'number', example: 45000 },
              available_seats: { type: 'integer', example: 19 },
            },
          },
        },
      },
    },
    example: {
      success: true,
      message: 'Место успешно забронировано (статус: pending_payment). Перейдите к оплате.',
      data: {
        id: 'enr-1234',
        status: 'pending_payment',
        enrolled_at: '2026-10-04T04:00:00.000Z',
        course: {
          id: 'course-1',
          title: 'Golang Microservices',
          price: 45000,
          available_seats: 19,
        },
      },
    },
  },

  EnrollmentListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/EnrollmentResponse' },
      },
    },
    example: {
      success: true,
      data: [
        {
          id: 'enr-1234',
          status: 'confirmed',
          course: { id: 'c-1', title: 'Golang Intensive', price: 45000 },
          payments: [{ id: 'pay-1', status: 'succeeded', amount: 45000 }],
        },
      ],
    },
  },

  CardResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Банковская карта успешно привязана (AES-256-GCM).' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'card-1' },
          card_holder: { type: 'string', example: 'IVAN IVANOV' },
          last4: { type: 'string', example: '5678' },
          exp_month: { type: 'string', example: '12' },
          exp_year: { type: 'string', example: '28' },
          is_default: { type: 'boolean', example: true },
          created_at: { type: 'string', example: '2026-10-04T04:00:00.000Z' },
        },
      },
    },
    example: {
      success: true,
      message: 'Банковская карта успешно привязана (данные зашифрованы алгоритмом AES-256-GCM).',
      data: {
        id: 'card-1',
        card_holder: 'IVAN IVANOV',
        last4: '5678',
        exp_month: '12',
        exp_year: '28',
        is_default: true,
        created_at: '2026-10-04T04:00:00.000Z',
      },
    },
  },

  CardListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            card_holder: { type: 'string' },
            last4: { type: 'string' },
            exp_month: { type: 'string' },
            exp_year: { type: 'string' },
            is_default: { type: 'boolean' },
          },
        },
      },
    },
    example: {
      success: true,
      data: [
        {
          id: 'card-1',
          card_holder: 'IVAN IVANOV',
          last4: '5678',
          exp_month: '12',
          exp_year: '28',
          is_default: true,
        },
      ],
    },
  },

  PaymentSuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Оплата успешно завершена!' },
      data: {
        type: 'object',
        properties: {
          payment_id: { type: 'string', example: 'pay-1234' },
          transaction_ref: { type: 'string', example: 'tx_a8f9c1b2e3d4' },
          amount: { type: 'number', example: 45000 },
          status: { type: 'string', example: 'succeeded' },
          paid_at: { type: 'string', example: '2026-10-04T04:10:00.000Z' },
          course: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'course-1' },
              title: { type: 'string', example: 'Golang Microservices' },
            },
          },
        },
      },
    },
    example: {
      success: true,
      message: 'Оплата успешно завершена! Доступ к курсу активирован.',
      data: {
        payment_id: 'pay-1234',
        transaction_ref: 'tx_a8f9c1b2e3d4',
        amount: 45000,
        status: 'succeeded',
        paid_at: '2026-10-04T04:10:00.000Z',
        course: {
          id: 'course-1',
          title: 'Golang Microservices',
          start_date: '2026-11-01T10:00:00.000Z',
        },
      },
    },
  },

  MyPaymentsResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: { type: 'object' },
      },
    },
    example: {
      success: true,
      data: [
        {
          id: 'pay-1',
          amount: 45000,
          status: 'succeeded',
          transaction_ref: 'tx_a8f9c1b2e3d4',
          paid_at: '2026-10-04T04:10:00.000Z',
          enrollment: {
            course: { id: 'c-1', title: 'Golang Microservices', price: 45000 },
          },
        },
      ],
    },
  },

  PaymentListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 1 },
          payments: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    example: {
      success: true,
      data: {
        total: 1,
        payments: [
          {
            id: 'pay-1',
            amount: 45000,
            status: 'succeeded',
            transaction_ref: 'tx_a8f9c1b2e3d4',
            paid_at: '2026-10-04T04:10:00.000Z',
            user: { id: 'usr-1', full_name: 'Иван Иванов', email: 'student@example.com' },
            enrollment: { course: { title: 'Golang Microservices', price: 45000 } },
          },
        ],
      },
    },
  },

  HealthResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'UP' },
      timestamp: { type: 'string', example: '2026-10-04T04:20:00.000Z' },
      database: { type: 'string', example: 'connected' },
      uptime_seconds: { type: 'integer', example: 3600 },
    },
    example: {
      status: 'UP',
      timestamp: '2026-10-04T04:20:00.000Z',
      database: 'connected',
      uptime_seconds: 3600,
    },
  },

  MetricsResponse: {
    type: 'object',
    properties: {
      uptime_seconds: { type: 'integer', example: 3600 },
      total_requests_served: { type: 'integer', example: 254 },
      memory_usage: {
        type: 'object',
        properties: {
          rss_mb: { type: 'string', example: '85.40' },
          heap_total_mb: { type: 'string', example: '42.10' },
          heap_used_mb: { type: 'string', example: '31.25' },
        },
      },
      node_version: { type: 'string', example: 'v20.12.0' },
      platform: { type: 'string', example: 'linux' },
      recent_audit_logs: { type: 'array', items: { type: 'object' } },
    },
    example: {
      uptime_seconds: 3600,
      total_requests_served: 254,
      memory_usage: { rss_mb: '85.40', heap_total_mb: '42.10', heap_used_mb: '31.25' },
      node_version: 'v20.12.0',
      platform: 'linux',
      recent_audit_logs: [],
    },
  },

  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Операция успешно выполнена.' },
    },
    example: {
      success: true,
      message: 'Операция успешно выполнена.',
    },
  },

  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Неверные параметры запроса.' },
          details: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    example: {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Неверные параметры запроса.',
      },
    },
  },
};

export function generateSwaggerFromSwaggo(config: SwaggoDocConfig): any {
  const { info, basePath, controllersDir } = config;

  const paths: Record<string, any> = {};

  const files = fs.readdirSync(controllersDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(controllersDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse swaggo blocks
    const lines = content.split('\n');
    let currentBlock: string[] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') && (trimmed.includes('Godoc') || trimmed.includes('@Summary'))) {
        currentBlock = [];
      }

      if (currentBlock && trimmed.startsWith('//')) {
        currentBlock.push(trimmed.replace(/^\/\/\s*/, ''));
        if (trimmed.includes('@Router')) {
          processSwaggoBlock(currentBlock, paths);
          currentBlock = null;
        }
      } else if (currentBlock && !trimmed.startsWith('//')) {
        currentBlock = null;
      }
    }
  }

  return {
    openapi: '3.0.3',
    info,
    servers: [{ url: basePath, description: 'API v1 Base Endpoint' }],
    tags: [
      { name: 'auth', description: 'Регистрация, вход, refresh токенов и аудит безопасности (OWASP A07)' },
      { name: 'users', description: 'Управление пользователями и связанными курсами (Только Администратор)' },
      { name: 'roles', description: 'Управление ролями и динамическими атомарными правами (Dynamic RBAC)' },
      { name: 'courses', description: 'Каталог, создание и управление курсами (право courses:create)' },
      { name: 'instructors', description: 'Профили преподавателей и просмотр записанных студентов' },
      { name: 'enrollments', description: 'Запись на курсы и управление заявками' },
      { name: 'cards', description: 'Привязка и безопасное хранение карт (AES-256-GCM, OWASP A02)' },
      { name: 'payments', description: 'Оплата курсов и реестр финансовых транзакций' },
      { name: 'system', description: 'Health check и метрики производительности' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Введите JWT Access токен (Bearer <token>)',
        },
      },
      schemas: SWAGGER_SCHEMAS,
    },
    paths,
  };
}

function processSwaggoBlock(block: string[], paths: Record<string, any>) {
  let summary = '';
  let description = '';
  const tags: string[] = [];
  let routerPath = '';
  let routerMethod = '';
  let isSecure = false;
  const parameters: any[] = [];
  let requestBody: any = null;
  const responses: Record<string, any> = {};

  for (const line of block) {
    if (line.startsWith('@Summary')) {
      summary = line.replace('@Summary', '').trim();
    } else if (line.startsWith('@Description')) {
      description = line.replace('@Description', '').trim();
    } else if (line.startsWith('@Tags')) {
      const tagStr = line.replace('@Tags', '').trim();
      tagStr.split(/\s+/).forEach((t) => {
        if (t) tags.push(t);
      });
    } else if (line.startsWith('@Security')) {
      isSecure = true;
    } else if (line.startsWith('@Router')) {
      const match = line.replace('@Router', '').trim().match(/^(\S+)\s*\[(\w+)\]/);
      if (match) {
        routerPath = match[1];
        routerMethod = match[2].toLowerCase();
      }
    } else if (line.startsWith('@Param')) {
      // Swaggo format: @Param <name> <in> <type> <required> "<description>"
      const raw = line.replace('@Param', '').trim();
      const parts = raw.split(/\s+/);
      if (parts.length >= 4) {
        const paramName = parts[0];
        const paramIn = parts[1].toLowerCase();
        const paramType = parts[2];
        const paramRequired = parts[3].toLowerCase() === 'true';

        // Extract quoted description
        const descMatch = raw.match(/"([^"]+)"/);
        const paramDesc = descMatch ? descMatch[1] : '';

        if (paramIn === 'body') {
          // paramType is e.g. "models.RegisterRequest" -> "RegisterRequest"
          const cleanModelName = paramType.replace(/^models\./, '');
          const schemaObj = SWAGGER_SCHEMAS[cleanModelName];

          requestBody = {
            required: paramRequired,
            description: paramDesc || 'Request payload',
            content: {
              'application/json': {
                schema: schemaObj
                  ? { $ref: `#/components/schemas/${cleanModelName}` }
                  : { type: 'object' },
                ...(schemaObj?.example ? { example: schemaObj.example } : {}),
              },
            },
          };
        } else {
          // Path / Query parameter
          let exampleVal: any = undefined;
          if (paramName === 'id' || paramName.endsWith('_id')) {
            exampleVal = 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c';
          } else if (paramName === 'page') {
            exampleVal = 1;
          } else if (paramName === 'limit') {
            exampleVal = 10;
          } else if (paramName === 'search') {
            exampleVal = 'Go';
          } else if (paramName === 'role') {
            exampleVal = 'student';
          } else if (paramName === 'min_price') {
            exampleVal = 10000;
          } else if (paramName === 'max_price') {
            exampleVal = 80000;
          }

          parameters.push({
            name: paramName,
            in: paramIn,
            required: paramRequired,
            description: paramDesc,
            schema: {
              type: paramType === 'int' ? 'integer' : paramType === 'number' ? 'number' : 'string',
              ...(exampleVal !== undefined ? { example: exampleVal } : {}),
            },
            ...(exampleVal !== undefined ? { example: exampleVal } : {}),
          });
        }
      }
    } else if (line.startsWith('@Success') || line.startsWith('@Failure')) {
      // Swaggo format: @Success 200 {object} models.AuthResponse "Description"
      const raw = line.replace(/^@(Success|Failure)/, '').trim();
      const parts = raw.split(/\s+/);
      if (parts.length >= 1) {
        const statusCode = parts[0];
        const descMatch = raw.match(/"([^"]+)"/);
        const respDesc = descMatch ? descMatch[1] : parts.slice(2).join(' ') || 'Response';

        // Extract model reference (parts[2]) e.g. models.AuthResponse
        let cleanModelName = '';
        if (parts.length >= 3 && parts[1].includes('{object}')) {
          cleanModelName = parts[2].replace(/^models\./, '');
        }

        const schemaObj = cleanModelName ? SWAGGER_SCHEMAS[cleanModelName] : null;

        responses[statusCode] = {
          description: respDesc,
          content: {
            'application/json': {
              schema: schemaObj
                ? { $ref: `#/components/schemas/${cleanModelName}` }
                : { type: 'object' },
              ...(schemaObj?.example ? { example: schemaObj.example } : {}),
            },
          },
        };
      }
    }
  }

  if (routerPath && routerMethod) {
    if (!paths[routerPath]) {
      paths[routerPath] = {};
    }

    const op: any = {
      tags: tags.length ? tags : ['General'],
      summary: summary || routerPath,
      description: description || summary,
      parameters,
      responses: Object.keys(responses).length
        ? responses
        : { '200': { description: 'Успешный ответ' } },
    };

    if (requestBody) {
      op.requestBody = requestBody;
    }

    if (isSecure) {
      op.security = [{ bearerAuth: [] }];
    }

    paths[routerPath][routerMethod] = op;
  }
}
