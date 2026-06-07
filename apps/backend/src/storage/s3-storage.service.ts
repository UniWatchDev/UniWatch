import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  createS3Client,
  isCloudflareR2Endpoint,
  isR2PlaceholderEndpoint
} from '@/storage/create-s3-client';
import type { PutObjectInput, StorageService, StoredObject } from '@/storage/storage.interface';
import type { Env } from '@/utils/env.validation';

/** S3-compatible object storage (Cloudflare R2 in dev/prod). */
@Injectable()
export class S3StorageService implements StorageService, OnModuleInit {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.bucket = this.config.get('S3_BUCKET', { infer: true });
    this.endpoint = this.config.get('S3_ENDPOINT', { infer: true });
    this.client = createS3Client({
      region: this.config.get('S3_REGION', { infer: true }),
      endpoint: this.endpoint,
      accessKeyId: this.config.get('S3_ACCESS_KEY_ID', { infer: true }),
      secretAccessKey: this.config.get('S3_SECRET_ACCESS_KEY', { infer: true }),
      forcePathStyle: this.config.get('S3_FORCE_PATH_STYLE', { infer: true })
    });
  }

  async onModuleInit(): Promise<void> {
    if (isR2PlaceholderEndpoint(this.endpoint)) {
      return;
    }
    if (!isCloudflareR2Endpoint(this.endpoint)) {
      return;
    }

    try {
      await this.client.send(new ListBucketsCommand({}));
      this.logger.log(`R2 connectivity OK (bucket config: ${this.bucket})`);
    } catch (error) {
      const host = new URL(this.endpoint).hostname;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        [
          `R2 connectivity check failed for host "${host}".`,
          'Confirm S3_ENDPOINT uses your Cloudflare Account ID from R2 → Overview (not the API token access key).',
          'EU buckets may need https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com',
          `Underlying error: ${message}`
        ].join(' ')
      );
    }
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ...(input.contentLength !== undefined && { ContentLength: input.contentLength })
      })
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    );
  }

  async getPresignedGetUrl(key: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async getObject(key: string, range?: { start: number; end: number }): Promise<StoredObject | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ...(range !== undefined && { Range: `bytes=${String(range.start)}-${String(range.end)}` })
        })
      );
      if (response.Body === undefined) {
        return null;
      }
      const contentLength = response.ContentLength ?? 0;
      const contentType = response.ContentType ?? 'application/octet-stream';
      return {
        body: response.Body as StoredObject['body'],
        contentType,
        contentLength
      };
    } catch {
      return null;
    }
  }
}
