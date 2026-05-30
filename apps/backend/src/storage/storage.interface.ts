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
  getObject(key: string, range?: { start: number; end: number }): Promise<StoredObject | null>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
