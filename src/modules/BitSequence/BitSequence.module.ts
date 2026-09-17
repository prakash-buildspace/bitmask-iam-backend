import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BitmapConfig } from './entities/BitmapConfig.entity.js';
import { BitSequence } from './entities/BitSequence.entity.js';
import { BitSequenceService } from './services/BitSequence.service.js';

@Module({
  imports: [SequelizeModule.forFeature([BitSequence, BitmapConfig])],
  providers: [BitSequenceService],
  exports: [BitSequenceService, SequelizeModule],
})
export class BitSequenceModule {}
