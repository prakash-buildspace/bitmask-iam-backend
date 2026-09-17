import {
  AutoIncrement,
  Column,
  CreatedAt,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';
import { ApiEndpoint } from '../../ApiEndpoint/entities/ApiEndpoint.entity.js';

@Table({
  tableName: 'ApiCategory',
  timestamps: true,
  createdAt: 'created',
  updatedAt: 'updated',
})
export class ApiCategory extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'id',
  })
  declare id: number;

  @Unique('uq_api_category_name')
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    field: 'category_name',
  })
  declare categoryName: string;

  @Unique('uq_api_category_tag')
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'category_tag',
  })
  declare categoryTag: string | null;

  @Unique('uq_api_category_bit_index')
  @Column({
    type: DataType.SMALLINT.UNSIGNED,
    allowNull: false,
    field: 'bit_index',
    comment:
      'Stable bit position in category_bitmap; assigned once, never reused',
  })
  declare bitIndex: number;

  @Column({
    type: DataType.TINYINT,
    allowNull: false,
    defaultValue: 1,
    comment: '1=active, 0=inactive, 2=deleted',
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

  @HasMany(() => ApiEndpoint, { foreignKey: 'api_category_id' })
  declare apiEndpoints?: ApiEndpoint[];
}
