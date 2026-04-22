import {
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import type { ZodError } from 'zod';
import {
  GENERIC_500_DETAIL,
  GENERIC_500_TITLE,
  VALIDATION_FAILED_DEV_DETAIL,
  VALIDATION_FAILED_PROD_DETAIL,
  VALIDATION_FAILED_TITLE,
  ZOD_SERIALIZATION_DEV_DETAIL
} from '@/consts/errors.consts';
import {
  PROBLEM_TYPE_HTTP_ERROR,
  PROBLEM_TYPE_INTERNAL_ERROR,
  PROBLEM_TYPE_VALIDATION_FAILED
} from '@/consts/problem-types.consts';
import { HttpExceptionFilter } from '@/filters/http-exception.filter';
import type { Env } from '@/utils/env.validation';

type CapturedResponse = {
  status: number;
  body: unknown;
  headersSent: boolean;
  ended: boolean;
};

type HostOptions = {
  method?: string;
  url?: string;
  originalUrl?: string;
  requestId?: string;
  headersSent?: boolean;
};

function makeHost(options: HostOptions = {}): {
  host: ArgumentsHost;
  captured: CapturedResponse;
} {
  const {
    method = 'GET',
    url = '/api/test',
    originalUrl = url,
    requestId,
    headersSent = false
  } = options;
  const captured: CapturedResponse = {
    status: 0,
    body: null,
    headersSent,
    ended: false
  };
  const response = {
    get headersSent() {
      return captured.headersSent;
    },
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
    end() {
      captured.ended = true;
      return this;
    }
  };
  const request: Record<string, unknown> = { method, url, originalUrl };
  if (requestId !== undefined) request['id'] = requestId;
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request
    })
  } as unknown as ArgumentsHost;
  return { host, captured };
}

function makeFilter(nodeEnv: Env['NODE_ENV']) {
  const config = {
    get: () => nodeEnv
  } as unknown as ConfigService<Env, true>;
  return new HttpExceptionFilter(config);
}

describe('HttpExceptionFilter', () => {
  describe('ZodValidationException', () => {
    it('emits 400 + issues array + Validation failed title in dev', () => {
      const filter = makeFilter('development');
      const zodError = z.object({ id: z.uuid() }).safeParse({ id: 'nope' })
        .error as ZodError;
      const exception = new ZodValidationException(zodError);
      const { host, captured } = makeHost({
        method: 'POST',
        url: '/api/notes'
      });

      filter.catch(exception, host);

      expect(captured.status).toBe(HttpStatus.BAD_REQUEST);
      expect(captured.body).toMatchObject({
        type: PROBLEM_TYPE_VALIDATION_FAILED,
        title: VALIDATION_FAILED_TITLE,
        status: HttpStatus.BAD_REQUEST,
        detail: VALIDATION_FAILED_DEV_DETAIL,
        instance: '/api/notes'
      });
      expect((captured.body as { errors: unknown[] }).errors).toHaveLength(1);
    });

    it('redacts issues and uses generic detail in production', () => {
      const filter = makeFilter('production');
      const zodError = z.object({ id: z.uuid() }).safeParse({ id: 'nope' })
        .error as ZodError;
      const exception = new ZodValidationException(zodError);
      const { host, captured } = makeHost({
        method: 'POST',
        url: '/api/notes'
      });

      filter.catch(exception, host);

      expect(captured.status).toBe(HttpStatus.BAD_REQUEST);
      expect(captured.body).toMatchObject({
        type: PROBLEM_TYPE_VALIDATION_FAILED,
        title: VALIDATION_FAILED_TITLE,
        status: HttpStatus.BAD_REQUEST,
        detail: VALIDATION_FAILED_PROD_DETAIL,
        instance: '/api/notes'
      });
      expect(captured.body).not.toHaveProperty('errors');
    });
  });

  describe('ZodSerializationException', () => {
    it('returns generic 500 with server-side schema validation detail in dev', () => {
      const filter = makeFilter('development');
      const zodError = z.object({ id: z.string() }).safeParse({ id: 1 })
        .error as ZodError;
      const exception = new ZodSerializationException(zodError);
      const { host, captured } = makeHost({
        method: 'GET',
        url: '/api/notes/1'
      });

      filter.catch(exception, host);

      expect(captured.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(captured.body).toMatchObject({
        type: PROBLEM_TYPE_INTERNAL_ERROR,
        title: GENERIC_500_TITLE,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: ZOD_SERIALIZATION_DEV_DETAIL,
        instance: '/api/notes/1'
      });
    });

    it('redacts detail in production', () => {
      const filter = makeFilter('production');
      const zodError = z.object({ id: z.string() }).safeParse({ id: 1 })
        .error as ZodError;
      const exception = new ZodSerializationException(zodError);
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect(captured.body).toMatchObject({
        type: PROBLEM_TYPE_INTERNAL_ERROR,
        title: GENERIC_500_TITLE,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: GENERIC_500_DETAIL
      });
    });
  });

  describe('HttpException', () => {
    it('preserves status + title + detail from a NestJS HttpException', () => {
      const filter = makeFilter('development');
      const exception = new NotFoundException('Note with id "x" not found');
      const { host, captured } = makeHost({
        method: 'GET',
        url: '/api/notes/x'
      });

      filter.catch(exception, host);

      expect(captured.status).toBe(HttpStatus.NOT_FOUND);
      expect(captured.body).toMatchObject({
        type: PROBLEM_TYPE_HTTP_ERROR,
        title: 'Not Found',
        status: HttpStatus.NOT_FOUND,
        detail: 'Note with id "x" not found',
        instance: '/api/notes/x'
      });
    });

    it('preserves 4xx HttpException detail in production (app-authored messages are safe)', () => {
      const filter = makeFilter('production');
      const exception = new BadRequestException('missing field: title');
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect(captured.status).toBe(HttpStatus.BAD_REQUEST);
      expect(captured.body).toMatchObject({
        title: 'Bad Request',
        detail: 'missing field: title'
      });
    });

    it('redacts 5xx HttpException detail in production', () => {
      const filter = makeFilter('production');
      const exception = new InternalServerErrorException(
        'DB connection to orders-primary failed'
      );
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect(captured.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(captured.body).toMatchObject({
        title: GENERIC_500_TITLE,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: GENERIC_500_DETAIL
      });
    });

    it('redacts a custom 5xx HttpException title in production', () => {
      const filter = makeFilter('production');
      const exception = new HttpException(
        { error: 'Postgres: secret_table_xyz', message: 'leaky' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect(captured.body).toMatchObject({
        title: GENERIC_500_TITLE,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: GENERIC_500_DETAIL
      });
      expect((captured.body as { title: string }).title).not.toContain(
        'Postgres'
      );
    });

    it('keeps the canonical status title for non-500 5xx in production', () => {
      const filter = makeFilter('production');
      const exception = new HttpException(
        { error: 'Upstream: secret-service-name', message: 'down' },
        HttpStatus.SERVICE_UNAVAILABLE
      );
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect(captured.body).toMatchObject({
        title: 'Service Unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
        detail: GENERIC_500_DETAIL
      });
    });

    it('preserves a custom 5xx HttpException title in dev', () => {
      const filter = makeFilter('development');
      const exception = new HttpException(
        { error: 'Postgres: db-primary', message: 'connection refused' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect((captured.body as { title: string }).title).toBe(
        'Postgres: db-primary'
      );
    });

    it('preserves 5xx HttpException detail in dev', () => {
      const filter = makeFilter('development');
      const exception = new InternalServerErrorException(
        'DB connection to orders-primary failed'
      );
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect(captured.body).toMatchObject({
        detail: 'DB connection to orders-primary failed'
      });
    });

    it('strips errors array from HttpException response in production', () => {
      const filter = makeFilter('production');
      const exception = new BadRequestException({
        message: ['title is required', 'content is required'],
        error: 'Bad Request',
        statusCode: 400
      });
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect(captured.body).not.toHaveProperty('errors');
    });

    it('includes errors array from HttpException in dev', () => {
      const filter = makeFilter('development');
      const exception = new BadRequestException({
        message: ['title is required', 'content is required'],
        error: 'Bad Request',
        statusCode: 400
      });
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect((captured.body as { errors: unknown[] }).errors).toEqual([
        'title is required',
        'content is required'
      ]);
    });
  });

  describe('unknown exception', () => {
    it('returns the real error message in dev', () => {
      const filter = makeFilter('development');
      const exception = new Error('database is on fire');
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect(captured.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(captured.body).toMatchObject({
        type: PROBLEM_TYPE_INTERNAL_ERROR,
        title: GENERIC_500_TITLE,
        detail: 'database is on fire'
      });
    });

    it('redacts the error message in production', () => {
      const filter = makeFilter('production');
      const exception = new Error('internal: secret table name');
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect(captured.body).toMatchObject({
        title: GENERIC_500_TITLE,
        detail: GENERIC_500_DETAIL
      });
    });

    it('handles non-Error throwables via safeStringify', () => {
      const filter = makeFilter('development');
      const { host, captured } = makeHost();

      filter.catch({ weird: 'object' }, host);

      expect(captured.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect((captured.body as { detail: string }).detail).toBe(
        '{"weird":"object"}'
      );
    });
  });

  describe('instance', () => {
    it('strips the query string from the instance field', () => {
      const filter = makeFilter('production');
      const exception = new NotFoundException();
      const { host, captured } = makeHost({
        url: '/api/notes?token=secret&page=1'
      });

      filter.catch(exception, host);

      expect((captured.body as { instance: string }).instance).toBe(
        '/api/notes'
      );
    });
  });

  describe('traceId', () => {
    it('includes traceId when request.id is set', () => {
      const filter = makeFilter('development');
      const exception = new NotFoundException();
      const { host, captured } = makeHost({ requestId: 'req-abc-123' });

      filter.catch(exception, host);

      expect((captured.body as { traceId: string }).traceId).toBe(
        'req-abc-123'
      );
    });

    it('omits traceId when request.id is missing', () => {
      const filter = makeFilter('development');
      const exception = new NotFoundException();
      const { host, captured } = makeHost();

      filter.catch(exception, host);

      expect(captured.body).not.toHaveProperty('traceId');
    });
  });

  describe('headersSent guard', () => {
    it('does not write a body when headers already sent', () => {
      const filter = makeFilter('development');
      const exception = new NotFoundException();
      const { host, captured } = makeHost({ headersSent: true });

      filter.catch(exception, host);

      expect(captured.body).toBeNull();
      expect(captured.status).toBe(0);
      expect(captured.ended).toBe(true);
    });
  });
});
