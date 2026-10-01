import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export type EnrollmentStatus = 'pending_payment' | 'confirmed' | 'cancelled';

export interface EnrollmentAttributes {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  enrolled_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface EnrollmentCreationAttributes
  extends Optional<EnrollmentAttributes, 'id' | 'status' | 'enrolled_at'> {}

export class Enrollment
  extends Model<EnrollmentAttributes, EnrollmentCreationAttributes>
  implements EnrollmentAttributes
{
  declare id: string;
  declare user_id: string;
  declare course_id: string;
  declare status: EnrollmentStatus;
  declare enrolled_at: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  declare user?: any;
  declare course?: any;
  declare payments?: any[];
}

Enrollment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    course_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    status: {
      type: DataTypes.ENUM('pending_payment', 'confirmed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending_payment',
    },
    enrolled_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'enrollments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
