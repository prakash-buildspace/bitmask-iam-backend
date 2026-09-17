import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
} from 'sequelize-typescript';

@Table({
  tableName: 'bc_iam_bitmap_bit_sequence',
  timestamps: false,
})
export class BitSequence extends Model {
  @PrimaryKey
  @Column({
    type: DataType.STRING(50),
    field: 'sequence_name',
    comment: 'category or api_endpoint',
  })
  declare sequenceName: string;

  @Column({
    type: DataType.SMALLINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    field: 'next_bit_index',
  })
  declare nextBitIndex: number;
}
