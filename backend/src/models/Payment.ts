import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed';

export interface PaymentAttributes {
  id: string;
  enrollment_id: string;
  user_id: string;
  payment_method_id: string | null;
  amount: number;
  status: PaymentStatus;
  transaction_ref: string;
  paid_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface PaymentCreationAttributes
  extends Optional<PaymentAttributes, 'id' | 'payment_method_id' | 'status' | 'paid_at'> {}

export class Payment
  extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes
{
  declare id: string;
  declare enrollment_id: string;
  declare user_id: string;
  declare payment_method_id: string | null;
  declare amount: number;
  declare status: PaymentStatus;
  declare transaction_ref: string;
  declare paid_at: Date | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  declare enrollment?: any;
  declare user?: any;
  declare payment_method?: any;
}

Payment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    enrollment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'enrollments',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    payment_method_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'payment_methods',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'succeeded', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    transaction_ref: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
