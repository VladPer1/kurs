import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface InstructorAttributes {
  id: string;
  user_id: string;
  bio: string;
  specialization: string;
  rating: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface InstructorCreationAttributes
  extends Optional<InstructorAttributes, 'id' | 'bio' | 'specialization' | 'rating'> {}

export class Instructor
  extends Model<InstructorAttributes, InstructorCreationAttributes>
  implements InstructorAttributes
{
  declare id: string;
  declare user_id: string;
  declare bio: string;
  declare specialization: string;
  declare rating: number;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  declare user?: any;
  declare courses?: any[];
}

Instructor.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Общие курсы',
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 5.0,
    },
  },
  {
    sequelize,
    tableName: 'instructors',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
