import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface PaymentMethodAttributes {
  id: string;
  user_id: string;
  card_holder: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  encrypted_payload: string;
  is_default: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface PaymentMethodCreationAttributes
  extends Optional<PaymentMethodAttributes, 'id' | 'is_default'> {}

export class PaymentMethod
  extends Model<PaymentMethodAttributes, PaymentMethodCreationAttributes>
  implements PaymentMethodAttributes
{
  declare id: string;
  declare user_id: string;
  declare card_holder: string;
  declare last4: string;
  declare exp_month: number;
  declare exp_year: number;
  declare encrypted_payload: string;
  declare is_default: boolean;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  declare user?: any;
}

PaymentMethod.init(
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
    card_holder: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last4: {
      type: DataTypes.STRING(4),
      allowNull: false,
    },
    exp_month: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    exp_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    encrypted_payload: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'payment_methods',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
