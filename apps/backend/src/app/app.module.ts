import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
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

const nodeEnv = process.env['NODE_ENV'] ?? 'development';
const envFilePath = [
  `.env.${nodeEnv}.local`,
  nodeEnv === 'test' ? undefined : '.env.local',
  `.env.${nodeEnv}`,
  '.env'
].filter((value): value is string => Boolean(value));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      validate: validateEnv
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
    AuthModule
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
