import { sequelize } from '../config/database.js';
import { Role, Permission, RolePermission, User, Instructor, Course } from '../models/index.js';
import { AuthService } from './authService.js';
import { logger } from '../config/logger.js';

export const INITIAL_PERMISSIONS = [
  { slug: 'users:manage_roles', description: 'Управление ролями пользователей' },
  { slug: 'roles:manage', description: 'Создание и редактирование ролей' },
  { slug: 'permissions:view', description: 'Просмотр списка всех прав' },
  { slug: 'instructors:manage', description: 'Создание и редактирование профилей преподавателей' },
  { slug: 'courses:create', description: 'Создание новых курсов' },
  { slug: 'courses:edit', description: 'Редактирование собственных курсов' },
  { slug: 'courses:delete', description: 'Удаление курсов' },
  { slug: 'courses:view_all', description: 'Просмотр курсов в любом статусе' },
  { slug: 'enrollments:create', description: 'Запись на курс' },
  { slug: 'enrollments:view_my', description: 'Просмотр собственных записей студента' },
  { slug: 'enrollments:view_instructor', description: 'Просмотр записанных студентов для преподавателя' },
  { slug: 'enrollments:cancel', description: 'Отмена записи на курс' },
  { slug: 'cards:manage', description: 'Привязка и удаление банковских карт' },
  { slug: 'payments:create', description: 'Проведение оплаты за курс' },
  { slug: 'payments:view_my', description: 'Просмотр истории личных платежей' },
  { slug: 'system:monitor', description: 'Доступ к системным метрикам и мониторингу' },
];

export async function seedDatabase(): Promise<void> {
  try {
    await sequelize.sync();
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
        description: 'Полный доступ ко всей системе и администрированию прав',
      },
    });

    const [instructorRole] = await Role.findOrCreate({
      where: { name: 'instructor' },
      defaults: {
        name: 'instructor',
        description: 'Преподаватель / тренер с доступом к созданию курсов и просмотру учеников',
      },
    });

    const [studentRole] = await Role.findOrCreate({
      where: { name: 'student' },
      defaults: {
        name: 'student',
        description: 'Студент с доступом к каталогу, записи и оплате курсов',
      },
    });

    // 3. Assign Permissions to Roles
    // Admin gets all permissions
    for (const perm of permissionMap.values()) {
      await RolePermission.findOrCreate({
        where: { role_id: adminRole.id, permission_id: perm.id },
      });
    }

    // Instructor permissions
    const instructorSlugs = [
      'instructors:manage',
      'courses:create',
      'courses:edit',
      'courses:delete',
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

    // Instructor User
    const instructorPasswordHash = await AuthService.hashPassword('Instructor123!');
    const [instructorUser] = await User.findOrCreate({
      where: { email: 'alex.devops@course-platform.local' },
      defaults: {
        role_id: instructorRole.id,
        email: 'alex.devops@course-platform.local',
        password_hash: instructorPasswordHash,
        full_name: 'Алексей Смирнов',
      },
    });

    // Instructor Profile
    const [instructorProfile] = await Instructor.findOrCreate({
      where: { user_id: instructorUser.id },
      defaults: {
        user_id: instructorUser.id,
        bio: 'Senior DevOps & Cloud Architect с 10-летним стажем. Эксперт по безопасности инфраструктуры, Kubernetes и микросервисам.',
        specialization: 'DevOps & Cloud Security',
        rating: 4.95,
      },
    });

    // Student User
    const studentPasswordHash = await AuthService.hashPassword('StudentPassword123!');
    await User.findOrCreate({
      where: { email: 'student@course-platform.local' },
      defaults: {
        role_id: studentRole.id,
        email: 'student@course-platform.local',
        password_hash: studentPasswordHash,
        full_name: 'Иван Студентов',
      },
    });

    // 5. Seed Initial Courses
    const coursesCount = await Course.count();
    if (coursesCount === 0) {
      await Course.bulkCreate([
        {
          instructor_id: instructorProfile.id,
          title: 'Архитектура безопасных REST API и микросервисов',
          description: 'Глубокое погружение в OWASP Top 10, JWT, динамический RBAC, шифрование AES-256, аудит и защиту от брутфорса на Node.js / Express.',
          price: 18900.0,
          start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          max_seats: 25,
          available_seats: 24,
          status: 'published',
        },
        {
          instructor_id: instructorProfile.id,
          title: 'Продвинутый Kubernetes, CI/CD и GitOps для Production',
          description: 'Практический тренинг по развертыванию отказоустойчивых кластеров K8s, настройке GitHub Actions пайплайнов и мониторингу Prometheus/Grafana.',
          price: 24500.0,
          start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          max_seats: 20,
          available_seats: 19,
          status: 'published',
        },
        {
          instructor_id: instructorProfile.id,
          title: 'PostgreSQL: Проектирование, оптимизация и шардинг',
          description: 'Изучение нормализации БД, индексирования B-Tree/GIN, транзакционных изоляций, репликации и тонкой настройки производительности.',
          price: 15400.0,
          start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          max_seats: 30,
          available_seats: 30,
          status: 'published',
        },
      ]);
      logger.info('Sample courses seeded successfully.');
    }

    logger.info('Database seeded successfully with initial RBAC roles, users, and courses.');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}
