import { Injectable } from '@nestjs/common';

import type { PutObjectInput, StorageService, StoredObject } from '@/storage/storage.interface';

type StoredEntry = {
  body: Buffer;
  contentType: string;
};

@Injectable()
export class InMemoryStorageService implements StorageService {
  private readonly objects = new Map<string, StoredEntry>();

  async putObject(input: PutObjectInput): Promise<void> {
    if (Buffer.isBuffer(input.body)) {
      this.objects.set(input.key, {
        body: input.body,
        contentType: input.contentType
      });
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of input.body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    this.objects.set(input.key, {
      body: Buffer.concat(chunks),
      contentType: input.contentType
    });
  }

  deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  getPresignedGetUrl(key: string, expiresInSeconds: number): Promise<string> {
    void expiresInSeconds;
    if (!this.objects.has(key)) {
      throw new Error(`Object not found: ${key}`);
    }
    return Promise.resolve(`memory://${encodeURIComponent(key)}`);
  }

  getPresignedPutUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number
  ): Promise<string> {
    void key;
    void contentType;
    void expiresInSeconds;
    return Promise.reject(
      new Error('Presigned PUT uploads require STORAGE_DRIVER=s3 (Cloudflare R2).')
    );
  }

  getObject(key: string, range?: { start: number; end: number }): Promise<StoredObject | null> {
    const stored = this.objects.get(key);
    if (stored === undefined) {
      return Promise.resolve(null);
    }
    const contentLength = stored.body.length;
    if (range === undefined) {
      return Promise.resolve({
        body: stored.body,
        contentType: stored.contentType,
        contentLength
      });
    }
    const slice = stored.body.subarray(range.start, range.end + 1);
    return Promise.resolve({
      body: slice,
      contentType: stored.contentType,
      contentLength: slice.length
    });
  }
}
