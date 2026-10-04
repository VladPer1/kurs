import { Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { ENV } from './env.js';
import { logger } from './logger.js';
import { sqliteDialectModule } from './sqliteBridge.js';

let sequelize: Sequelize;

if (ENV.DATABASE_URL && ENV.DATABASE_URL.startsWith('postgres')) {
  logger.info('Connecting to external PostgreSQL database via DATABASE_URL');
  sequelize = new Sequelize(ENV.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
    },
  });
} else {
  // Use persistent SQLite database with built-in node:sqlite engine
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const storagePath = path.join(dataDir, 'course_system.sqlite');
  logger.info(`Using SQLite database at ${storagePath}`);

  sequelize = new Sequelize({
    dialect: 'sqlite',
    dialectModule: sqliteDialectModule,
    storage: storagePath,
    logging: false,
    define: {
      underscored: true,
    },
  });
}

export { sequelize };
