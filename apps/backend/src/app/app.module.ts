import { join } from 'node:path';

import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AppController } from '@/app/app.controller';
import { AppService } from '@/app/app.service';
import { Env, validateEnv } from '@/utils/env.validation';
import { HealthModule } from '@/health/health.module';
import { NotesModule } from '@/notes/notes.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { HttpExceptionFilter } from '@/filters/http-exception.filter';
import { RequestIdMiddleware } from '@/middleware/request-id.middleware';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@/auth/auth.module';
import { MoviesModule } from '@/movies/movies.module';
import { RoomsModule } from '@/rooms/rooms.module';

const nodeEnv = process.env['NODE_ENV'] ?? 'development';
const backendRoot = process.cwd().endsWith('/apps/backend')
  ? process.cwd()
  : join(process.cwd(), 'apps/backend');
/** One file per mode: `apps/backend/.env.development` | `.env.production` | `.env.test` (gitignored except in CI via env vars). */
const envFilePath = [join(backendRoot, `.env.${nodeEnv}`)];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      validate: validateEnv
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<Env, true>) => ({
        uri: configService.get('MONGODB_URI')
      }),
      inject: [ConfigService<Env, true>]
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<Env, true>) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN') }
      }),
      inject: [ConfigService<Env, true>]
    }),
    HealthModule,
    NotesModule,
    RealtimeModule,
    AuthModule,
    MoviesModule,
    RoomsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('{*splat}');
  }
}
