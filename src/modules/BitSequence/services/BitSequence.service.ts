import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Transaction, Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ValidationException } from '../../../common/exceptions/app.exception.js';
import { BitmapConfig } from '../entities/BitmapConfig.entity.js';
import { BitSequence } from '../entities/BitSequence.entity.js';

@Injectable()
export class BitSequenceService {
  private readonly logger = new Logger(BitSequenceService.name);

  // in-memory cached dynamic capacities (initialized dynamically from DB, never static)
  private cachedCategoryMaxBits: number | null = null;
  private cachedApiMaxBits: number | null = null;
  private lastConfigFetchTime = 0;
  private readonly configCacheTtlMs: number = Number(
    process.env.BITMAP_CONFIG_CACHE_TTL_MS || 60000,
  );

  constructor(
    @InjectModel(BitSequence)
    private readonly bitSequenceModel: typeof BitSequence,
    @InjectModel(BitmapConfig)
    private readonly bitmapConfigModel: typeof BitmapConfig,
    @InjectConnection()
    private readonly sequelize: Sequelize,
  ) {}

  // dynamically get minimum bit index from the target table or schema default
  async getMinBitIndex(sequenceName: 'category' | 'api_endpoint'): Promise<number> {
    const tableName =
      sequenceName === 'category'
        ? 'bc_api_endpoints_category'
        : 'bc_api_endpoints';

    const [results] = (await this.sequelize.query(
      `SELECT MIN(bit_index) AS minBit FROM \`${tableName}\``,
    )) as Array<Array<{ minBit: number | null }>>;

    if (
      results[0]?.minBit !== null &&
      results[0]?.minBit !== undefined &&
      !isNaN(Number(results[0].minBit))
    ) {
      return Number(results[0].minBit);
    }

    // fallback: query column default from database schema dynamically
    const [colMeta] = (await this.sequelize.query(
      `SELECT COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bc_iam_bitmap_bit_sequence' AND COLUMN_NAME = 'next_bit_index'`,
    )) as Array<Array<{ COLUMN_DEFAULT: string | null }>>;

    return Number(
      colMeta[0]?.COLUMN_DEFAULT ??
        this.bitSequenceModel.rawAttributes.nextBitIndex?.defaultValue ??
        0,
    );
  }

  // dynamically get maximum category bit capacity from bc_iam_bitmap_config
  async getMaxCategoryBits(): Promise<number> {
    await this.refreshConfigIfNeeded();
    return this.cachedCategoryMaxBits!;
  }

  // dynamically get maximum api endpoint bit capacity from bc_iam_bitmap_config
  async getMaxApiBits(): Promise<number> {
    await this.refreshConfigIfNeeded();
    return this.cachedApiMaxBits!;
  }

  // allocate next category bit index atomically and validate against dynamic bitmap capacity
  async allocateCategoryBitIndex(transaction?: Transaction): Promise<number> {
    return this.allocateBit('category', transaction);
  }

  // allocate next api endpoint bit index atomically and validate against dynamic bitmap capacity
  async allocateApiBitIndex(transaction?: Transaction): Promise<number> {
    return this.allocateBit('api_endpoint', transaction);
  }

  // fetch dynamic configuration from database
  async getLatestBitmapConfig(): Promise<BitmapConfig> {
    let config = await this.bitmapConfigModel.findOne({
      order: [['id', 'DESC']],
    });

    if (!config) {
      // dynamically read column defaults from database information schema
      const [colMeta] = (await this.sequelize.query(
        `SELECT COLUMN_NAME, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bc_iam_bitmap_config'`,
      )) as Array<Array<{ COLUMN_NAME: string; COLUMN_DEFAULT: string | null }>>;

      const defaults = colMeta.reduce<Record<string, number>>((acc, row) => {
        if (row.COLUMN_DEFAULT !== null && !isNaN(Number(row.COLUMN_DEFAULT))) {
          acc[row.COLUMN_NAME] = Number(row.COLUMN_DEFAULT);
        }
        return acc;
      }, {});

      const catDefault = Number(
        defaults['category_bitmap_bytes'] ??
          this.bitmapConfigModel.rawAttributes.categoryBitmapBytes?.defaultValue,
      );
      const apiDefault = Number(
        defaults['api_bitmap_bytes'] ??
          this.bitmapConfigModel.rawAttributes.apiBitmapBytes?.defaultValue,
      );
      const verDefault = Number(
        defaults['bitmap_version'] ??
          this.bitmapConfigModel.rawAttributes.bitmapVersion?.defaultValue,
      );

      config = await this.bitmapConfigModel.create({
        categoryBitmapBytes: catDefault,
        apiBitmapBytes: apiDefault,
        bitmapVersion: verDefault,
      });
    }

    return config;
  }

  // refresh dynamic bitmap limits from database with TTL cache
  private async refreshConfigIfNeeded(): Promise<void> {
    const now = Date.now();
    if (
      this.cachedCategoryMaxBits !== null &&
      this.cachedApiMaxBits !== null &&
      now - this.lastConfigFetchTime < this.configCacheTtlMs
    ) {
      return;
    }

    try {
      const config = await this.getLatestBitmapConfig();
      const BITS_PER_BYTE = 8;
      this.cachedCategoryMaxBits = Number(config.categoryBitmapBytes) * BITS_PER_BYTE;
      this.cachedApiMaxBits = Number(config.apiBitmapBytes) * BITS_PER_BYTE;
      this.lastConfigFetchTime = now;
    } catch (error) {
      this.logger.error(
        `Failed to query BitmapConfig dynamically from database: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  private async allocateBit(
    sequenceName: 'category' | 'api_endpoint',
    externalTx?: Transaction,
  ): Promise<number> {
    const executeAllocation = async (tx: Transaction): Promise<number> => {
      let seq = await this.bitSequenceModel.findOne({
        where: {
          sequenceName: {
            [Op.in]: [sequenceName, `${sequenceName}_bit`],
          },
        },
        lock: tx.LOCK.UPDATE,
        transaction: tx,
      });

      // dynamically determine max capacity under lock
      const maxBits =
        sequenceName === 'category'
          ? await this.getMaxCategoryBits()
          : await this.getMaxApiBits();

      if (!seq) {
        // compute fallback initial sequence index dynamically from existing table rows or schema default
        const tableName =
          sequenceName === 'category'
            ? 'bc_api_endpoints_category'
            : 'bc_api_endpoints';

        const [results] = (await this.sequelize.query(
          `SELECT MAX(bit_index) AS maxBit, MIN(bit_index) AS minBit FROM \`${tableName}\``,
          { transaction: tx },
        )) as Array<Array<{ maxBit: number | null; minBit: number | null }>>;

        const maxBit = results[0]?.maxBit;
        let initialBit: number;

        if (maxBit !== null && maxBit !== undefined && !isNaN(Number(maxBit))) {
          initialBit = Number(maxBit) + 1;
        } else {
          // derive default minimum starting index dynamically from column definition
          const [colDefault] = (await this.sequelize.query(
            `SELECT COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bc_iam_bitmap_bit_sequence' AND COLUMN_NAME = 'next_bit_index'`,
            { transaction: tx },
          )) as Array<Array<{ COLUMN_DEFAULT: string | null }>>;

          initialBit = Number(
            colDefault[0]?.COLUMN_DEFAULT ??
              this.bitSequenceModel.rawAttributes.nextBitIndex?.defaultValue ??
              0,
          );
        }

        if (initialBit >= maxBits) {
          throw new ValidationException(
            `Maximum ${sequenceName === 'category' ? 'API category' : 'API endpoint'} bitmap capacity reached (${maxBits} max)`,
          );
        }

        seq = await this.bitSequenceModel.create(
          {
            sequenceName,
            nextBitIndex: initialBit + 1,
          },
          { transaction: tx },
        );
        return initialBit;
      }

      const allocatedIndex = Number(seq.nextBitIndex);

      // check capacity under lock before incrementing and saving
      if (allocatedIndex >= maxBits) {
        throw new ValidationException(
          `Maximum ${sequenceName === 'category' ? 'API category' : 'API endpoint'} bitmap capacity reached (${maxBits} max)`,
        );
      }

      seq.nextBitIndex = allocatedIndex + 1;
      await seq.save({ transaction: tx });

      this.logger.log(
        `Allocated bit index ${allocatedIndex} for sequence "${seq.sequenceName}"`,
      );
      return allocatedIndex;
    };

    if (externalTx) {
      return executeAllocation(externalTx);
    }

    return this.sequelize.transaction(async (tx) => {
      return executeAllocation(tx);
    });
  }
}
