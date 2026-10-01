import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface UserAttributes {
  id: string;
  role_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  failed_login_attempts: number;
  lock_until: Date | null;
  refresh_token: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserCreationAttributes
  extends Optional<UserAttributes, 'id' | 'failed_login_attempts' | 'lock_until' | 'refresh_token'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare role_id: string;
  declare email: string;
  declare password_hash: string;
  declare full_name: string;
  declare failed_login_attempts: number;
  declare lock_until: Date | null;
  declare refresh_token: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  // Associations typing
  declare role?: any;
  declare instructor_profile?: any;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lock_until: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
