import type { Readable } from 'node:stream';

export interface PutObjectInput {
  key: string;
  body: Buffer | Readable;
  contentType: string;
  contentLength?: number;
}

export interface StoredObject {
  body: Buffer | Readable;
  contentType: string;
  contentLength: number;
}

export interface StorageService {
  putObject(input: PutObjectInput): Promise<void>;
  deleteObject(key: string): Promise<void>;
  getPresignedGetUrl(key: string, expiresInSeconds: number): Promise<string>;
  /**
   * Short-lived presigned PUT URL for the legacy direct client → storage uploads.
   * Requires a real S3/R2 driver; the in-memory driver cannot satisfy it.
   */
  getPresignedPutUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number
  ): Promise<string>;
  getObject(key: string, range?: { start: number; end: number }): Promise<StoredObject | null>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
