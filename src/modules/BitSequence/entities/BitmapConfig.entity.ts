import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'bc_iam_bitmap_config',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated',
})
export class BitmapConfig extends Model {
  @PrimaryKey
  @Column({
    type: DataType.TINYINT,
    defaultValue: 1,
  })
  declare id: number;

  @Column({
    type: DataType.SMALLINT.UNSIGNED,
    allowNull: false,
    defaultValue: 128,
    field: 'category_bitmap_bytes',
    comment: 'category bitmap byte length (128 bytes = 1024 bits)',
  })
  declare categoryBitmapBytes: number;

  @Column({
    type: DataType.SMALLINT.UNSIGNED,
    allowNull: false,
    defaultValue: 1536,
    field: 'api_bitmap_bytes',
    comment: 'api endpoint bitmap byte length (1536 bytes = 12288 bits)',
  })
  declare apiBitmapBytes: number;

  @Column({
    type: DataType.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
    field: 'bitmap_version',
  })
  declare bitmapVersion: number;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated',
  })
  declare updated: Date;
}
