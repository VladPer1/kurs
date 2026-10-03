export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Course & Training Management System API (ИПР №1)',
    version: '1.0.0',
    description:
      'Комплексный безопасный REST API для системы записи на курсы и тренинги с оплатой, личным кабинетом студента, кабинетом преподавателя и динамическим RBAC (Role-Based Access Control). Соответствует стандартам OWASP Top 10.',
    contact: {
      name: 'Команда разработки курсового проекта',
      email: 'dev@course-platform.local',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base Endpoint',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Введите JWT Access-токен, полученный при входе или регистрации.',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'HttpOnly Secure SameSite cookie для обновления токенов.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Некорректные параметры запроса.' },
              details: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          full_name: { type: 'string' },
          role: { type: 'string', example: 'student' },
          permissions: { type: 'array', items: { type: 'string' } },
        },
      },
      Course: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          instructor_id: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Архитектура безопасных REST API' },
          description: { type: 'string' },
          price: { type: 'number', example: 18900.0 },
          start_date: { type: 'string', format: 'date-time' },
          max_seats: { type: 'integer', example: 25 },
          available_seats: { type: 'integer', example: 24 },
          status: { type: 'string', enum: ['draft', 'published', 'archived'] },
        },
      },
      PaymentMethodSafe: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          card_holder: { type: 'string', example: 'IVAN PETROV' },
          last4: { type: 'string', example: '4242' },
          exp_month: { type: 'integer', example: 12 },
          exp_year: { type: 'integer', example: 2028 },
          is_default: { type: 'boolean', example: true },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          enrollment_id: { type: 'string', format: 'uuid' },
          amount: { type: 'number', example: 18900.0 },
          status: { type: 'string', enum: ['pending', 'succeeded', 'failed'] },
          transaction_ref: { type: 'string', example: 'tx_a8f9c1e2b4d6' },
          paid_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Регистрация нового пользователя',
        description: 'Создает аккаунт с базовой ролью student, хэширует пароль bcrypt (salt >= 10), возвращает JWT access token и устанавливает httpOnly cookie с refresh token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'full_name'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'newstudent@example.com' },
                  password: { type: 'string', minLength: 8, example: 'StudentPass123!' },
                  full_name: { type: 'string', example: 'Николай Сидоров' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Пользователь успешно зарегистрирован' },
          400: { description: 'Ошибка валидации полей' },
          409: { description: 'Пользователь с таким email уже существует' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Аутентификация пользователя',
        description: 'Проверка учетных данных, защита от брутфорса (блокировка на 15 мин при 5 ошибках), выдача JWT в теле и Refresh в httpOnly cookie.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@course-platform.local' },
                  password: { type: 'string', example: 'AdminPassword123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Успешная аутентификация' },
          401: { description: 'Неверный логин или пароль' },
          423: { description: 'Учетная запись заблокирована из-за 5 неудачных попыток' },
          429: { description: 'Превышен лимит запросов с IP-адреса' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Обновление пары токенов',
        description: 'Принимает refreshToken из httpOnly cookie или body и возвращает новый accessToken.',
        responses: {
          200: { description: 'Токены обновлены' },
          401: { description: 'Невалидный или истекший refresh токен' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        summary: 'Выход из системы',
        description: 'Сбрасывает refresh-токен в базе данных и очищает httpOnly cookie.',
        responses: {
          200: { description: 'Выход успешно выполнен' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        summary: 'Профиль текущего пользователя',
        description: 'Возвращает данные пользователя, текущую роль и список активных permissions.',
        responses: {
          200: { description: 'Данные профиля' },
          401: { description: 'Не авторизован' },
        },
      },
    },
    '/roles': {
      get: {
        tags: ['Dynamic RBAC'],
        security: [{ bearerAuth: [] }],
        summary: 'Получить список всех ролей',
        description: 'Требуется атомарное разрешение roles:manage.',
        responses: {
          200: { description: 'Список ролей с вложенными правами' },
          403: { description: 'Доступ запрещен' },
        },
      },
      post: {
        tags: ['Dynamic RBAC'],
        security: [{ bearerAuth: [] }],
        summary: 'Создать новую роль',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'mentor' },
                  description: { type: 'string', example: 'Куратор учебных групп' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Роль создана' },
        },
      },
    },
    '/permissions': {
      get: {
        tags: ['Dynamic RBAC'],
        security: [{ bearerAuth: [] }],
        summary: 'Получить список всех атомарных прав',
        responses: {
          200: { description: 'Список всех прав в системе' },
        },
      },
    },
    '/roles/{id}/permissions': {
      post: {
        tags: ['Dynamic RBAC'],
        security: [{ bearerAuth: [] }],
        summary: 'Динамически обновить права у роли',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  permission_slugs: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['courses:create', 'courses:edit'],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Права роли обновлены' },
        },
      },
    },
    '/users/{id}/role': {
      patch: {
        tags: ['Dynamic RBAC'],
        security: [{ bearerAuth: [] }],
        summary: 'Назначить роль пользователю',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role_name: { type: 'string', example: 'instructor' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Роль пользователя изменена' },
        },
      },
    },
    '/instructors': {
      get: {
        tags: ['Instructors'],
        summary: 'Список преподавателей',
        description: 'Публичный каталог преподавателей с рейтингом и курсами.',
        responses: {
          200: { description: 'Список преподавателей' },
        },
      },
      post: {
        tags: ['Instructors'],
        security: [{ bearerAuth: [] }],
        summary: 'Создать профиль преподавателя',
        description: 'Требуется разрешение instructors:manage.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user_id', 'specialization'],
                properties: {
                  user_id: { type: 'string', format: 'uuid' },
                  specialization: { type: 'string', example: 'DevOps & Cloud' },
                  bio: { type: 'string', example: '10 лет в разработке и архитектуре' },
                  rating: { type: 'number', example: 5.0 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Профиль преподавателя создан' },
        },
      },
    },
    '/instructors/{id}': {
      get: {
        tags: ['Instructors'],
        summary: 'Детальная информация о преподавателе',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Данные преподавателя' },
          404: { description: 'Преподаватель не найден' },
        },
      },
      put: {
        tags: ['Instructors'],
        security: [{ bearerAuth: [] }],
        summary: 'Обновить профиль преподавателя',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Профиль обновлен' },
        },
      },
    },
    '/courses': {
      get: {
        tags: ['Courses'],
        summary: 'Каталог курсов с фильтрацией и пагинацией',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'min_price', in: 'query', schema: { type: 'number' } },
          { name: 'max_price', in: 'query', schema: { type: 'number' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'instructor_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Список курсов' },
        },
      },
      post: {
        tags: ['Courses'],
        security: [{ bearerAuth: [] }],
        summary: 'Создать новый курс',
        description: 'Требуется разрешение courses:create.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'price', 'start_date', 'max_seats'],
                properties: {
                  title: { type: 'string', example: 'Архитектура безопасных систем' },
                  description: { type: 'string', example: 'Полный практический курс по стандартам OWASP' },
                  price: { type: 'number', example: 19900 },
                  start_date: { type: 'string', format: 'date-time', example: '2026-11-01T10:00:00Z' },
                  max_seats: { type: 'integer', example: 30 },
                  status: { type: 'string', enum: ['draft', 'published', 'archived'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Курс успешно создан' },
          403: { description: 'Недостаточно прав' },
        },
      },
    },
    '/courses/{id}': {
      get: {
        tags: ['Courses'],
        summary: 'Детальная информация о курсе',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Данные курса' },
          404: { description: 'Курс не найден' },
        },
      },
      put: {
        tags: ['Courses'],
        security: [{ bearerAuth: [] }],
        summary: 'Редактировать курс',
        description: 'Требуется разрешение courses:edit (владелец курса или админ).',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Курс обновлен' },
        },
      },
      delete: {
        tags: ['Courses'],
        security: [{ bearerAuth: [] }],
        summary: 'Удалить курс',
        description: 'Требуется разрешение courses:delete (нельзя удалить при наличии активных записей).',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Курс удален' },
          400: { description: 'Нельзя удалить курс с записями' },
        },
      },
    },
    '/enrollments': {
      post: {
        tags: ['Enrollments'],
        security: [{ bearerAuth: [] }],
        summary: 'Записаться на курс',
        description: 'Требуется разрешение enrollments:create. Проверяет наличие мест и декрементирует available_seats.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['course_id'],
                properties: {
                  course_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Запись создана со статусом pending_payment' },
          400: { description: 'Нет свободных мест' },
          409: { description: 'Пользователь уже записан' },
        },
      },
    },
    '/enrollments/my': {
      get: {
        tags: ['Enrollments'],
        security: [{ bearerAuth: [] }],
        summary: 'Мои записи на курсы',
        description: 'Возвращает список курсов, на которые записан текущий студент.',
        responses: {
          200: { description: 'Список записей студента' },
        },
      },
    },
    '/enrollments/instructor': {
      get: {
        tags: ['Enrollments'],
        security: [{ bearerAuth: [] }],
        summary: 'Записанные студенты (для преподавателя)',
        description: 'Требуется разрешение enrollments:view_instructor.',
        responses: {
          200: { description: 'Список студентов на курсах преподавателя' },
        },
      },
    },
    '/enrollments/{id}': {
      delete: {
        tags: ['Enrollments'],
        security: [{ bearerAuth: [] }],
        summary: 'Отменить запись на курс',
        description: 'Переводит запись в cancelled и освобождает место на курсе.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Запись отменена, место освобождено' },
        },
      },
    },
    '/cards': {
      get: {
        tags: ['Payment Cards (AES-256)'],
        security: [{ bearerAuth: [] }],
        summary: 'Список привязанных карт пользователя',
        description: 'Возвращает безопасные данные (last4, держатель, срок). Зашифрованный payload никогда не отдается в API.',
        responses: {
          200: { description: 'Список сохраненных карт' },
        },
      },
      post: {
        tags: ['Payment Cards (AES-256)'],
        security: [{ bearerAuth: [] }],
        summary: 'Привязать банковскую карту',
        description: 'Шифрует полный номер и CVV алгоритмом AES-256-GCM ключом из .env и сохраняет в базу данных.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['card_number', 'card_holder', 'exp_month', 'exp_year', 'cvv'],
                properties: {
                  card_number: { type: 'string', example: '4242424242424242' },
                  card_holder: { type: 'string', example: 'IVAN PETROV' },
                  exp_month: { type: 'integer', example: 12 },
                  exp_year: { type: 'integer', example: 2028 },
                  cvv: { type: 'string', example: '123' },
                  is_default: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Карта успешно зашифрована и сохранена' },
        },
      },
    },
    '/cards/{id}': {
      delete: {
        tags: ['Payment Cards (AES-256)'],
        security: [{ bearerAuth: [] }],
        summary: 'Удалить сохраненную карту',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Карта удалена' },
        },
      },
    },
    '/payments/checkout': {
      post: {
        tags: ['Payments'],
        security: [{ bearerAuth: [] }],
        summary: 'Оплата заявки на курс',
        description: 'Транзакционный перевод заявки в статус confirmed, генерация платежной транзакции и чека.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['enrollment_id'],
                properties: {
                  enrollment_id: { type: 'string', format: 'uuid' },
                  payment_method_id: { type: 'string', format: 'uuid', description: 'Опционально: ID сохраненной карты' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Оплата успешно завершена' },
          400: { description: 'Заявка уже оплачена или отменена' },
        },
      },
    },
    '/payments/my': {
      get: {
        tags: ['Payments'],
        security: [{ bearerAuth: [] }],
        summary: 'История платежей пользователя',
        responses: {
          200: { description: 'История платежей' },
        },
      },
    },
    '/system/health': {
      get: {
        tags: ['System & Monitoring'],
        summary: 'Проверка работоспособности системы (Health check)',
        description: 'Диагностика подключения к базе данных и времени работы сервера.',
        responses: {
          200: { description: 'Сервер и БД исправны' },
          503: { description: 'БД недоступна' },
        },
      },
    },
    '/system/metrics': {
      get: {
        tags: ['System & Monitoring'],
        summary: 'Системные метрики (ИПР №2 задел)',
        description: 'Метрики потребления памяти Node.js (RSS, Heap), количество запросов, аудит безопасности.',
        responses: {
          200: { description: 'Системные метрики' },
        },
      },
    },
  },
};
