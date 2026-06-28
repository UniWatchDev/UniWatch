import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { MovieRecord, type MovieDocument } from '@/movies/movie.schema';
import type { Env } from '@/utils/env.validation';

const LEGACY_GLOBAL_NAME_INDEX = 'name_1';

@Injectable()
export class MovieIndexSyncService implements OnModuleInit {
  private readonly logger = new Logger(MovieIndexSyncService.name);

  constructor(
    @InjectModel(MovieRecord.name) private readonly model: Model<MovieDocument>,
    private readonly config: ConfigService<Env, true>
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.dropLegacyGlobalNameIndex();
      await this.backfillCatalogEntryFlags();
      await this.model.syncIndexes();

      if (this.config.get('NODE_ENV', { infer: true }) === 'development') {
        const indexes = await this.model.collection.indexes();
        this.logger.log(
          `Movie indexes: ${indexes.map((index) => index.name).filter(Boolean).join(', ')}`
        );
      }
    } catch (error) {
      this.logger.error(
        error instanceof Error ? error.message : 'Failed to sync movie indexes'
      );
    }
  }

  private async dropLegacyGlobalNameIndex(): Promise<void> {
    const indexes = await this.model.collection.indexes();
    const hasLegacyIndex = indexes.some((index) => index.name === LEGACY_GLOBAL_NAME_INDEX);
    if (!hasLegacyIndex) {
      return;
    }

    await this.model.collection.dropIndex(LEGACY_GLOBAL_NAME_INDEX);
    this.logger.warn(`Dropped legacy global movie index "${LEGACY_GLOBAL_NAME_INDEX}"`);
  }

  /** Mark legacy seeded/published titles so hidden entries stay manageable in admin. */
  private async backfillCatalogEntryFlags(): Promise<void> {
    const result = await this.model.updateMany(
      {
        deleted_at: null,
        is_catalog_entry: { $ne: true },
        $or: [{ in_catalog: true }, { storage_key: { $regex: '^catalog/' } }]
      },
      { $set: { is_catalog_entry: true } }
    );
    if (result.modifiedCount > 0) {
      this.logger.log(
        `Backfilled is_catalog_entry on ${String(result.modifiedCount)} catalog movie(s)`
      );
    }
  }
}
