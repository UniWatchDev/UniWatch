import { Module } from '@nestjs/common';

import { AdminCatalogController } from '@/admin/admin-catalog.controller';
import { AuthModule } from '@/auth/auth.module';
import { MoviesModule } from '@/movies/movies.module';

@Module({
  imports: [AuthModule, MoviesModule],
  controllers: [AdminCatalogController]
})
export class AdminModule {}
