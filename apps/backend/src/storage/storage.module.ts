import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { InMemoryStorageService } from '@/storage/in-memory-storage.service';
import { S3StorageService } from '@/storage/s3-storage.service';
import { STORAGE_SERVICE } from '@/storage/storage.interface';
import type { Env } from '@/utils/env.validation';

@Module({
  imports: [ConfigModule],
  providers: [
    S3StorageService,
    InMemoryStorageService,
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService, S3StorageService, InMemoryStorageService],
      useFactory: (
        config: ConfigService<Env, true>,
        s3: S3StorageService,
        memory: InMemoryStorageService
      ) => {
        const driver = config.get('STORAGE_DRIVER', { infer: true });
        if (driver === 's3') return s3;
        if (driver === 'memory') return memory;
        return config.get('NODE_ENV', { infer: true }) === 'production' ? s3 : memory;
      }
    }
  ],
  exports: [STORAGE_SERVICE]
})
export class StorageModule {}
