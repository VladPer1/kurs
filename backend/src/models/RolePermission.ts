import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface RolePermissionAttributes {
  role_id: string;
  permission_id: string;
}

export class RolePermission extends Model<RolePermissionAttributes> implements RolePermissionAttributes {
  declare role_id: string;
  declare permission_id: string;
}

RolePermission.init(
  {
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'roles',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    permission_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'permissions',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'role_permissions',
    timestamps: false,
  }
);
