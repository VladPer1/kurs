import { sequelize } from '../config/database.js';
import {
  Role,
  Permission,
  RolePermission,
  User,
  Instructor,
  Course,
  Enrollment,
  PaymentMethod,
  Payment,
} from '../models/index.js';
import { AuthService } from './authService.js';
import { encryptAES256GCM } from './cryptoService.js';
import { logger } from '../config/logger.js';
import { ensureSchemaCompatibility } from '../config/dbMigration.js';

export const INITIAL_PERMISSIONS = [
  // 1. Users
  { slug: 'users:view_all', description: 'Просмотр всех пользователей системы с их курсами и ролями (Только Администратор)' },
  { slug: 'users:manage_roles', description: 'Назначение и изменение ролей пользователей' },

  // 2. Roles & Permissions (Dynamic RBAC)
  { slug: 'roles:manage', description: 'Создание, редактирование ролей и привязка прав' },
  { slug: 'permissions:view', description: 'Просмотр справочника всех доступных прав системы' },

  // 3. Instructors
  { slug: 'instructors:manage', description: 'Создание и редактирование профилей преподавателей' },
  { slug: 'instructors:view_students', description: 'Просмотр списка студентов, обучающихся на курсах преподавателя' },

  // 4. Courses
  { slug: 'courses:create', description: 'Создание новых курсов' },
  { slug: 'courses:edit', description: 'Редактирование собственных курсов' },
  { slug: 'courses:delete', description: 'Удаление курсов' },
  { slug: 'courses:view_all', description: 'Просмотр всех курсов в любом статусе (включая черновики)' },
  { slug: 'courses:view_students', description: 'Просмотр списка студентов конкретного курса' },

  // 5. Enrollments
  { slug: 'enrollments:create', description: 'Запись на курс' },
  { slug: 'enrollments:view_my', description: 'Просмотр собственных записей студента' },
  { slug: 'enrollments:view_instructor', description: 'Просмотр записей студентов для преподавателя' },
  { slug: 'enrollments:cancel', description: 'Отмена записи на курс' },

  // 6. Payment Methods (Bank Cards)
  { slug: 'cards:manage', description: 'Привязка, просмотр и удаление сохраненных банковских карт' },

  // 7. Payments
  { slug: 'payments:create', description: 'Проведение оплаты за выбранный курс' },
  { slug: 'payments:view_my', description: 'Просмотр истории личных платежей' },
  { slug: 'payments:view_all', description: 'Просмотр реестра всех финансовых транзакций платформы (Только Администратор)' },

  // 8. System & Security Monitoring
  { slug: 'system:monitor', description: 'Доступ к системным метрикам и журналу безопасности' },
];

export async function seedDatabase(): Promise<void> {
  try {
    // 0. Ensure schema compatibility for databases created before snake_case migration
    await ensureSchemaCompatibility(sequelize);

    try {
      await sequelize.sync({ alter: true });
    } catch (alterErr: any) {
      logger.warn(`sequelize.sync({ alter: true }) notice: ${alterErr.message}. Falling back to standard sync.`);
      await sequelize.sync();
    }
    logger.info('Database tables synchronized successfully.');

    // 1. Seed Permissions
    const permissionMap = new Map<string, Permission>();
    for (const p of INITIAL_PERMISSIONS) {
      const [perm] = await Permission.findOrCreate({
        where: { slug: p.slug },
        defaults: p,
      });
      permissionMap.set(p.slug, perm);
    }

    // 2. Seed Roles
    const [adminRole] = await Role.findOrCreate({
      where: { name: 'admin' },
      defaults: {
        name: 'admin',
        description: 'Полный доступ ко всей системе, пользователям, ролям и финансовым реестрам',
      },
    });

    const [instructorRole] = await Role.findOrCreate({
      where: { name: 'instructor' },
      defaults: {
        name: 'instructor',
        description: 'Преподаватель / эксперт с доступом к созданию курсов и просмотру своих студентов',
      },
    });

    const [studentRole] = await Role.findOrCreate({
      where: { name: 'student' },
      defaults: {
        name: 'student',
        description: 'Студент с доступом к каталогу, записи, привязке карт и оплате курсов',
      },
    });

    const [managerRole] = await Role.findOrCreate({
      where: { name: 'manager' },
      defaults: {
        name: 'manager',
        description: 'Менеджер образовательных программ и модерации курсов',
      },
    });

    // 3. Assign Permissions to Roles (Dynamic RBAC)
    // Admin gets ALL permissions (including users:view_all and payments:view_all)
    for (const perm of permissionMap.values()) {
      await RolePermission.findOrCreate({
        where: { role_id: adminRole.id, permission_id: perm.id },
      });
    }

    // Manager permissions
    const managerSlugs = [
      'courses:view_all',
      'courses:create',
      'courses:edit',
      'courses:view_students',
      'instructors:manage',
      'instructors:view_students',
      'enrollments:view_instructor',
      'enrollments:cancel',
      'permissions:view',
      'users:view_all',
      'cards:manage',
    ];
    for (const slug of managerSlugs) {
      const perm = permissionMap.get(slug);
      if (perm) {
        await RolePermission.findOrCreate({
          where: { role_id: managerRole.id, permission_id: perm.id },
        });
      }
    }

    // Instructor permissions
    const instructorSlugs = [
      'instructors:manage',
      'instructors:view_students',
      'courses:create',
      'courses:edit',
      'courses:delete',
      'courses:view_students',
      'enrollments:view_instructor',
      'cards:manage',
      'payments:view_my',
    ];
    for (const slug of instructorSlugs) {
      const perm = permissionMap.get(slug);
      if (perm) {
        await RolePermission.findOrCreate({
          where: { role_id: instructorRole.id, permission_id: perm.id },
        });
      }
    }

    // Student permissions
    const studentSlugs = [
      'enrollments:create',
      'enrollments:view_my',
      'enrollments:cancel',
      'cards:manage',
      'payments:create',
      'payments:view_my',
    ];
    for (const slug of studentSlugs) {
      const perm = permissionMap.get(slug);
      if (perm) {
        await RolePermission.findOrCreate({
          where: { role_id: studentRole.id, permission_id: perm.id },
        });
      }
    }

    // 4. Seed Users
    // Admin User
    const adminPasswordHash = await AuthService.hashPassword('AdminPassword123!');
    const [adminUser] = await User.findOrCreate({
      where: { email: 'admin@course-platform.local' },
      defaults: {
        role_id: adminRole.id,
        email: 'admin@course-platform.local',
        password_hash: adminPasswordHash,
        full_name: 'Главный Администратор',
      },
    });

    // Instructor 1: Алексей Смирнов (DevOps)
    const instructorPasswordHash = await AuthService.hashPassword('Instructor123!');
    const [alexUser] = await User.findOrCreate({
      where: { email: 'alex.devops@course-platform.local' },
      defaults: {
        role_id: instructorRole.id,
        email: 'alex.devops@course-platform.local',
        password_hash: instructorPasswordHash,
        full_name: 'Алексей Смирнов',
      },
    });

    // Instructor 2: Елена Васильева (Frontend)
    const [elenaUser] = await User.findOrCreate({
      where: { email: 'elena.frontend@course-platform.local' },
      defaults: {
        role_id: instructorRole.id,
        email: 'elena.frontend@course-platform.local',
        password_hash: instructorPasswordHash,
        full_name: 'Елена Васильева',
      },
    });

    // Student 1: Иван Студентов
    const studentPasswordHash = await AuthService.hashPassword('StudentPassword123!');
    const [ivanUser] = await User.findOrCreate({
      where: { email: 'student@course-platform.local' },
      defaults: {
        role_id: studentRole.id,
        email: 'student@course-platform.local',
        password_hash: studentPasswordHash,
        full_name: 'Иван Студентов',
      },
    });

    // Student 2: Анна Кузнецова
    const [annaUser] = await User.findOrCreate({
      where: { email: 'anna.kuznetsova@course-platform.local' },
      defaults: {
        role_id: studentRole.id,
        email: 'anna.kuznetsova@course-platform.local',
        password_hash: studentPasswordHash,
        full_name: 'Анна Кузнецова',
      },
    });

    // Student 3: Михаил Морозов
    const [mikhailUser] = await User.findOrCreate({
      where: { email: 'mikhail.morozov@course-platform.local' },
      defaults: {
        role_id: studentRole.id,
        email: 'mikhail.morozov@course-platform.local',
        password_hash: studentPasswordHash,
        full_name: 'Михаил Морозов',
      },
    });

    // Manager: Мария Менеджерова
    const managerPasswordHash = await AuthService.hashPassword('ManagerPassword123!');
    const [managerUser] = await User.findOrCreate({
      where: { email: 'manager@course-platform.local' },
      defaults: {
        role_id: managerRole.id,
        email: 'manager@course-platform.local',
        password_hash: managerPasswordHash,
        full_name: 'Мария Менеджерова',
      },
    });

    // 5. Seed Instructor Profiles
    const [alexProfile] = await Instructor.findOrCreate({
      where: { user_id: alexUser.id },
      defaults: {
        user_id: alexUser.id,
        bio: 'Senior DevOps & Cloud Architect с 10-летним стажем. Эксперт по безопасности инфраструктуры, Kubernetes и микросервисам.',
        specialization: 'DevOps, Cloud Security & Kubernetes',
        rating: 4.95,
      },
    });

    const [elenaProfile] = await Instructor.findOrCreate({
      where: { user_id: elenaUser.id },
      defaults: {
        user_id: elenaUser.id,
        bio: 'Lead Frontend Architect & Tech Lead. Специализируется на высоконагруженных React/TypeScript SPA, микрофронтендах и UI/UX архитектуре.',
        specialization: 'Frontend Architecture, React & Web Performance',
        rating: 4.90,
      },
    });

    // 6. Seed Courses
    const [courseApi] = await Course.findOrCreate({
      where: { title: 'Архитектура безопасных REST API и микросервисов' },
      defaults: {
        instructor_id: alexProfile.id,
        title: 'Архитектура безопасных REST API и микросервисов',
        description: 'Глубокое погружение в OWASP Top 10, JWT, динамический RBAC, шифрование AES-256, аудит и защиту от брутфорса на Node.js / Express.',
        price: 18900.0,
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        max_seats: 25,
        available_seats: 23,
        status: 'published',
      },
    });

    const [courseK8s] = await Course.findOrCreate({
      where: { title: 'Продвинутый Kubernetes, CI/CD и GitOps для Production' },
      defaults: {
        instructor_id: alexProfile.id,
        title: 'Продвинутый Kubernetes, CI/CD и GitOps для Production',
        description: 'Практический тренинг по развертыванию отказоустойчивых кластеров K8s, настройке GitHub Actions пайплайнов и мониторингу Prometheus/Grafana.',
        price: 24500.0,
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        max_seats: 20,
        available_seats: 19,
        status: 'published',
      },
    });

    const [coursePg] = await Course.findOrCreate({
      where: { title: 'PostgreSQL: Проектирование, оптимизация и шардинг' },
      defaults: {
        instructor_id: alexProfile.id,
        title: 'PostgreSQL: Проектирование, оптимизация и шардинг',
        description: 'Изучение нормализации БД, индексирования B-Tree/GIN, транзакционных изоляций, репликации и тонкой настройки производительности.',
        price: 15400.0,
        start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        max_seats: 30,
        available_seats: 29,
        status: 'published',
      },
    });

    const [courseReact] = await Course.findOrCreate({
      where: { title: 'React 19, TypeScript и современные микрофронтенды' },
      defaults: {
        instructor_id: elenaProfile.id,
        title: 'React 19, TypeScript и современные микрофронтенды',
        description: 'Разработка масштабируемых веб-приложений с Server Components, Suspense, Tailwind CSS и компонентной архитектурой промышленного уровня.',
        price: 16800.0,
        start_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        max_seats: 20,
        available_seats: 18,
        status: 'published',
      },
    });

    // 7. Seed Payment Methods (Saved Bank Cards with AES-256-GCM encryption)
    const ivanCardPayload = encryptAES256GCM(JSON.stringify({ cardNumber: '4242424242424242', cvv: '123' }));
    const [ivanCard] = await PaymentMethod.findOrCreate({
      where: { user_id: ivanUser.id, last4: '4242' },
      defaults: {
        user_id: ivanUser.id,
        card_holder: 'IVAN STUDENTOV',
        last4: '4242',
        exp_month: 12,
        exp_year: 2028,
        encrypted_payload: ivanCardPayload,
        is_default: true,
      },
    });

    const annaCardPayload = encryptAES256GCM(JSON.stringify({ cardNumber: '5555555555555555', cvv: '456' }));
    const [annaCard] = await PaymentMethod.findOrCreate({
      where: { user_id: annaUser.id, last4: '5555' },
      defaults: {
        user_id: annaUser.id,
        card_holder: 'ANNA KUZNETSOVA',
        last4: '5555',
        exp_month: 8,
        exp_year: 2027,
        encrypted_payload: annaCardPayload,
        is_default: true,
      },
    });

    const mikhailCardPayload = encryptAES256GCM(JSON.stringify({ cardNumber: '2200111122228888', cvv: '789' }));
    const [mikhailCard] = await PaymentMethod.findOrCreate({
      where: { user_id: mikhailUser.id, last4: '8888' },
      defaults: {
        user_id: mikhailUser.id,
        card_holder: 'MIKHAIL MOROZOV',
        last4: '8888',
        exp_month: 10,
        exp_year: 2029,
        encrypted_payload: mikhailCardPayload,
        is_default: true,
      },
    });

    // 8. Seed Enrollments
    // Ivan -> Course API (Confirmed)
    const [enrollmentIvanApi] = await Enrollment.findOrCreate({
      where: { user_id: ivanUser.id, course_id: courseApi.id },
      defaults: {
        user_id: ivanUser.id,
        course_id: courseApi.id,
        status: 'confirmed',
        enrolled_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    });

    // Ivan -> Course K8s (Pending Payment)
    await Enrollment.findOrCreate({
      where: { user_id: ivanUser.id, course_id: courseK8s.id },
      defaults: {
        user_id: ivanUser.id,
        course_id: courseK8s.id,
        status: 'pending_payment',
        enrolled_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });

    // Anna -> Course API (Confirmed)
    const [enrollmentAnnaApi] = await Enrollment.findOrCreate({
      where: { user_id: annaUser.id, course_id: courseApi.id },
      defaults: {
        user_id: annaUser.id,
        course_id: courseApi.id,
        status: 'confirmed',
        enrolled_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });

    // Anna -> Course React (Confirmed)
    const [enrollmentAnnaReact] = await Enrollment.findOrCreate({
      where: { user_id: annaUser.id, course_id: courseReact.id },
      defaults: {
        user_id: annaUser.id,
        course_id: courseReact.id,
        status: 'confirmed',
        enrolled_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    // Mikhail -> Course PostgreSQL (Confirmed)
    const [enrollmentMikhailPg] = await Enrollment.findOrCreate({
      where: { user_id: mikhailUser.id, course_id: coursePg.id },
      defaults: {
        user_id: mikhailUser.id,
        course_id: coursePg.id,
        status: 'confirmed',
        enrolled_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    });

    // Mikhail -> Course React (Confirmed)
    const [enrollmentMikhailReact] = await Enrollment.findOrCreate({
      where: { user_id: mikhailUser.id, course_id: courseReact.id },
      defaults: {
        user_id: mikhailUser.id,
        course_id: courseReact.id,
        status: 'confirmed',
        enrolled_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });

    // 9. Seed Payments (Completed transactions)
    // Ivan -> Course API Payment
    await Payment.findOrCreate({
      where: { transaction_ref: 'tx_seed_ivan_api01' },
      defaults: {
        enrollment_id: enrollmentIvanApi.id,
        user_id: ivanUser.id,
        payment_method_id: ivanCard.id,
        amount: courseApi.price,
        status: 'succeeded',
        transaction_ref: 'tx_seed_ivan_api01',
        paid_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    });

    // Anna -> Course API Payment
    await Payment.findOrCreate({
      where: { transaction_ref: 'tx_seed_anna_api01' },
      defaults: {
        enrollment_id: enrollmentAnnaApi.id,
        user_id: annaUser.id,
        payment_method_id: annaCard.id,
        amount: courseApi.price,
        status: 'succeeded',
        transaction_ref: 'tx_seed_anna_api01',
        paid_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });

    // Anna -> Course React Payment
    await Payment.findOrCreate({
      where: { transaction_ref: 'tx_seed_anna_react01' },
      defaults: {
        enrollment_id: enrollmentAnnaReact.id,
        user_id: annaUser.id,
        payment_method_id: annaCard.id,
        amount: courseReact.price,
        status: 'succeeded',
        transaction_ref: 'tx_seed_anna_react01',
        paid_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    // Mikhail -> Course PostgreSQL Payment
    await Payment.findOrCreate({
      where: { transaction_ref: 'tx_seed_mikhail_pg01' },
      defaults: {
        enrollment_id: enrollmentMikhailPg.id,
        user_id: mikhailUser.id,
        payment_method_id: mikhailCard.id,
        amount: coursePg.price,
        status: 'succeeded',
        transaction_ref: 'tx_seed_mikhail_pg01',
        paid_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info('Database seeded successfully with all 9 tables populated with consistent, linked data.');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}
