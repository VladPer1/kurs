import { Role } from './Role.js';
import { Permission } from './Permission.js';
import { RolePermission } from './RolePermission.js';
import { User } from './User.js';
import { Instructor } from './Instructor.js';
import { Course } from './Course.js';
import { Enrollment } from './Enrollment.js';
import { PaymentMethod } from './PaymentMethod.js';
import { Payment } from './Payment.js';

// Setup Associations

// 1. Roles & Permissions (M:M)
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  as: 'permissions',
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permission_id',
  otherKey: 'role_id',
  as: 'roles',
});

// 2. Users & Roles (N:1)
Role.hasMany(User, {
  foreignKey: 'role_id',
  as: 'users',
  onDelete: 'RESTRICT',
});
User.belongsTo(Role, {
  foreignKey: 'role_id',
  as: 'role',
});

// 3. User & Instructor (1:1)
User.hasOne(Instructor, {
  foreignKey: 'user_id',
  as: 'instructor_profile',
  onDelete: 'CASCADE',
});
Instructor.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// 4. Instructor & Courses (1:N)
Instructor.hasMany(Course, {
  foreignKey: 'instructor_id',
  as: 'courses',
  onDelete: 'RESTRICT',
});
Course.belongsTo(Instructor, {
  foreignKey: 'instructor_id',
  as: 'instructor',
});

// 5. Course & Enrollments (1:N)
Course.hasMany(Enrollment, {
  foreignKey: 'course_id',
  as: 'enrollments',
  onDelete: 'RESTRICT',
});
Enrollment.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course',
});

// 6. User & Enrollments (1:N)
User.hasMany(Enrollment, {
  foreignKey: 'user_id',
  as: 'enrollments',
  onDelete: 'CASCADE',
});
Enrollment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// 7. User & PaymentMethods (1:N)
User.hasMany(PaymentMethod, {
  foreignKey: 'user_id',
  as: 'payment_methods',
  onDelete: 'CASCADE',
});
PaymentMethod.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// 8. Enrollments & Payments (1:N)
Enrollment.hasMany(Payment, {
  foreignKey: 'enrollment_id',
  as: 'payments',
  onDelete: 'RESTRICT',
});
Payment.belongsTo(Enrollment, {
  foreignKey: 'enrollment_id',
  as: 'enrollment',
});

// 9. User & Payments (1:N)
User.hasMany(Payment, {
  foreignKey: 'user_id',
  as: 'payments',
  onDelete: 'RESTRICT',
});
Payment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// 10. PaymentMethod & Payments (1:N)
PaymentMethod.hasMany(Payment, {
  foreignKey: 'payment_method_id',
  as: 'payments',
  onDelete: 'SET NULL',
});
Payment.belongsTo(PaymentMethod, {
  foreignKey: 'payment_method_id',
  as: 'payment_method',
});

export {
  Role,
  Permission,
  RolePermission,
  User,
  Instructor,
  Course,
  Enrollment,
  PaymentMethod,
  Payment,
};
