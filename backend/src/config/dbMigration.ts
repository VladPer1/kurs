import { Sequelize, QueryTypes } from 'sequelize';
import { logger } from './logger.js';

interface ColumnMapping {
  oldCol: string;
  newCol: string;
}

const TABLES_TO_MIGRATE: Record<string, ColumnMapping[]> = {
  permissions: [
    { oldCol: 'createdAt', newCol: 'created_at' },
    { oldCol: 'updatedAt', newCol: 'updated_at' },
  ],
  roles: [
    { oldCol: 'createdAt', newCol: 'created_at' },
    { oldCol: 'updatedAt', newCol: 'updated_at' },
  ],
  role_permissions: [
    { oldCol: 'roleId', newCol: 'role_id' },
    { oldCol: 'permissionId', newCol: 'permission_id' },
    { oldCol: 'createdAt', newCol: 'created_at' },
    { oldCol: 'updatedAt', newCol: 'updated_at' },
  ],
  users: [
    { oldCol: 'roleId', newCol: 'role_id' },
    { oldCol: 'passwordHash', newCol: 'password_hash' },
    { oldCol: 'fullName', newCol: 'full_name' },
    { oldCol: 'failedLoginAttempts', newCol: 'failed_login_attempts' },
    { oldCol: 'lockUntil', newCol: 'lock_until' },
    { oldCol: 'refreshToken', newCol: 'refresh_token' },
    { oldCol: 'createdAt', newCol: 'created_at' },
    { oldCol: 'updatedAt', newCol: 'updated_at' },
  ],
  instructors: [
    { oldCol: 'userId', newCol: 'user_id' },
    { oldCol: 'createdAt', newCol: 'created_at' },
    { oldCol: 'updatedAt', newCol: 'updated_at' },
  ],
  courses: [
    { oldCol: 'instructorId', newCol: 'instructor_id' },
    { oldCol: 'startDate', newCol: 'start_date' },
    { oldCol: 'maxSeats', newCol: 'max_seats' },
    { oldCol: 'availableSeats', newCol: 'available_seats' },
    { oldCol: 'createdAt', newCol: 'created_at' },
    { oldCol: 'updatedAt', newCol: 'updated_at' },
  ],
  enrollments: [
    { oldCol: 'userId', newCol: 'user_id' },
    { oldCol: 'courseId', newCol: 'course_id' },
    { oldCol: 'enrolledAt', newCol: 'enrolled_at' },
    { oldCol: 'createdAt', newCol: 'created_at' },
    { oldCol: 'updatedAt', newCol: 'updated_at' },
  ],
  payment_methods: [
    { oldCol: 'userId', newCol: 'user_id' },
    { oldCol: 'cardHolder', newCol: 'card_holder' },
    { oldCol: 'expMonth', newCol: 'exp_month' },
    { oldCol: 'expYear', newCol: 'exp_year' },
    { oldCol: 'encryptedPayload', newCol: 'encrypted_payload' },
    { oldCol: 'isDefault', newCol: 'is_default' },
    { oldCol: 'createdAt', newCol: 'created_at' },
    { oldCol: 'updatedAt', newCol: 'updated_at' },
  ],
  payments: [
    { oldCol: 'enrollmentId', newCol: 'enrollment_id' },
    { oldCol: 'userId', newCol: 'user_id' },
    { oldCol: 'paymentMethodId', newCol: 'payment_method_id' },
    { oldCol: 'transactionRef', newCol: 'transaction_ref' },
    { oldCol: 'paidAt', newCol: 'paid_at' },
    { oldCol: 'createdAt', newCol: 'created_at' },
    { oldCol: 'updatedAt', newCol: 'updated_at' },
  ],
};

const TABLE_RENAME_MAP: Record<string, string> = {
  RolePermissions: 'role_permissions',
  PaymentMethods: 'payment_methods',
};

/**
 * Ensures existing databases created before the snake_case migration
 * are automatically and safely migrated without losing data.
 */
export async function ensureSchemaCompatibility(sequelize: Sequelize): Promise<void> {
  const dialect = sequelize.getDialect();
  logger.info(`Running automated schema compatibility check for dialect: ${dialect}`);

  try {
    if (dialect === 'postgres') {
      // 1. Check table renames
      const tablesResult: any[] = await sequelize.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`,
        { type: QueryTypes.SELECT }
      );
      const existingTables = new Set(tablesResult.map((t) => t.table_name || t.TABLE_NAME));

      for (const [oldName, newName] of Object.entries(TABLE_RENAME_MAP)) {
        if (existingTables.has(oldName) && !existingTables.has(newName)) {
          logger.info(`Migrating table name "${oldName}" -> "${newName}"`);
          await sequelize.query(`ALTER TABLE "${oldName}" RENAME TO "${newName}";`);
          existingTables.delete(oldName);
          existingTables.add(newName);
        }
      }

      // 2. Check column renames for each table
      for (const [tableName, mappings] of Object.entries(TABLES_TO_MIGRATE)) {
        if (!existingTables.has(tableName)) continue;

        const columnsResult: any[] = await sequelize.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = :tableName AND table_schema = 'public';`,
          {
            replacements: { tableName },
            type: QueryTypes.SELECT,
          }
        );
        const existingColumns = new Set(columnsResult.map((c) => c.column_name || c.COLUMN_NAME));

        for (const mapping of mappings) {
          if (existingColumns.has(mapping.oldCol) && !existingColumns.has(mapping.newCol)) {
            logger.info(`Migrating column "${tableName}"."${mapping.oldCol}" -> "${mapping.newCol}"`);
            await sequelize.query(
              `ALTER TABLE "${tableName}" RENAME COLUMN "${mapping.oldCol}" TO "${mapping.newCol}";`
            );
            existingColumns.delete(mapping.oldCol);
            existingColumns.add(mapping.newCol);
          }
        }
      }
    } else if (dialect === 'sqlite') {
      const tablesResult: any[] = await sequelize.query(
        `SELECT name FROM sqlite_master WHERE type='table';`,
        { type: QueryTypes.SELECT }
      );
      const existingTables = new Set(tablesResult.map((t) => t.name));

      for (const [tableName, mappings] of Object.entries(TABLES_TO_MIGRATE)) {
        if (!existingTables.has(tableName)) continue;

        const columnsResult: any[] = await sequelize.query(
          `PRAGMA table_info("${tableName}");`,
          { type: QueryTypes.SELECT }
        );
        const existingColumns = new Set(columnsResult.map((c) => c.name));

        for (const mapping of mappings) {
          if (existingColumns.has(mapping.oldCol) && !existingColumns.has(mapping.newCol)) {
            try {
              logger.info(`Migrating SQLite column "${tableName}"."${mapping.oldCol}" -> "${mapping.newCol}"`);
              await sequelize.query(
                `ALTER TABLE "${tableName}" RENAME COLUMN "${mapping.oldCol}" TO "${mapping.newCol}";`
              );
              existingColumns.delete(mapping.oldCol);
              existingColumns.add(mapping.newCol);
            } catch (err: any) {
              logger.warn(`Could not rename column ${tableName}.${mapping.oldCol}: ${err.message}`);
            }
          }
        }
      }
    }

    logger.info('Schema compatibility check completed successfully.');
  } catch (err: any) {
    logger.warn(`Schema compatibility warning (continuing sync): ${err.message}`);
  }
}
