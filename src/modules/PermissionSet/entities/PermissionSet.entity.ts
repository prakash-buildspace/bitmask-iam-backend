import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Unique,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'PermissionSet',
  timestamps: true,
  createdAt: 'created',
  updatedAt: 'updated',
})
export class PermissionSet extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    field: 'id',
  })
  declare id: number;

  @Unique('uq_permission_set_name')
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    field: 'PermissionSet_name',
  })
  declare permissionSetName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'PermissionSet_description',
  })
  declare permissionSetDescription: string | null;

  @Column({
    type: DataType.TINYINT,
    allowNull: false,
    defaultValue: 0,
    field: 'is_system_PermissionSet',
    comment: '1=predefined immutable, 0=custom tenant PermissionSet',
  })
  declare isSystemPermissionSet: number;

  @Column({
    type: DataType.TINYINT,
    allowNull: false,
    defaultValue: 1,
    field: 'status',
    comment: '1=active, 0=inactive',
  })
  declare status: number;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created',
  })
  declare created: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated',
  })
  declare updated: Date;
}
