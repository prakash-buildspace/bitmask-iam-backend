import {
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';
import { ApiCategory } from '../../ApiCategory/entities/ApiCategory.entity.js';

@Table({
  tableName: 'ApiEndpoint',
  timestamps: true,
  createdAt: 'created',
  updatedAt: 'updated',
  indexes: [
    {
      name: 'idx_api_endpoint',
      fields: ['api_endpoint'],
    },
  ],
})
export class ApiEndpoint extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'id',
  })
  declare id: number;

  @ForeignKey(() => ApiCategory)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'api_category_id',
  })
  declare apiCategoryId: number;

  @BelongsTo(() => ApiCategory, {
    foreignKey: 'api_category_id',
  })
  declare apiCategory?: ApiCategory;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    field: 'api_endpoint',
  })
  declare apiEndpoint: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    defaultValue: 'GET',
    field: 'http_method',
    comment: 'HTTP method: GET, POST, PUT, PATCH, DELETE',
  })
  declare httpMethod: string;

  @Unique('uq_api_endpoint_tag')
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    field: 'endpoint_tag',
  })
  declare endpointTag: string;

  @Unique('uq_api_endpoint_bit_index')
  @Column({
    type: DataType.SMALLINT.UNSIGNED,
    allowNull: false,
    field: 'bit_index',
    comment: 'Stable bit position in api_bitmap; assigned once, never reused',
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
}
