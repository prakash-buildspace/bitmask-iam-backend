import { Module } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { databaseConfig } from '../config/database.config.js';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (db: ConfigType<typeof databaseConfig>) => ({
        dialect: 'mysql',
        host: db.host,
        port: db.port,
        username: db.user,
        password: db.pass,
        database: db.name,
        autoLoadModels: true,
        synchronize: db.sync,
        logging: db.logging ? console.log : false,
        pool: db.pool,
        retryAttempts: db.retry.attempts,
        retryDelay: db.retry.delay,
      }),
    }),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
