export const RecordStatus = {
  INACTIVE: 0,
  ACTIVE: 1,
  DELETED: 2,
} as const;

export type RecordStatus = (typeof RecordStatus)[keyof typeof RecordStatus];

export enum EntityStatus {
  INACTIVE = 0,
  ACTIVE = 1,
  DELETED = 2,
}
