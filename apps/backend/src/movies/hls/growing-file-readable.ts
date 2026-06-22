import { promises as fs } from 'node:fs';
import { Readable } from 'node:stream';

export class GrowingFileReadable extends Readable {
  private fileHandle: fs.FileHandle | null = null;
  private readonly pollMs: number;
  private readonly filePath: string;
  private readonly chunkSize = 64 * 1024;
  private offset = 0;
  private done = false;
  private pumping = false;
  private isClosed = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(filePath: string, pollMs = 200) {
    super();
    this.filePath = filePath;
    this.pollMs = pollMs;
  }

  markDone(): void {
    this.done = true;
    void this.pump();
  }

  override _construct(callback: (error?: Error | null) => void): void {
    fs.open(this.filePath, 'r')
      .then((handle) => {
        this.fileHandle = handle;
        this.timer = setInterval(() => {
          void this.pump();
        }, this.pollMs);
        callback();
      })
      .catch((error: unknown) => {
        callback(error instanceof Error ? error : new Error('Failed to open growing upload file'));
      });
  }

  override _read(): void {
    void this.pump();
  }

  override _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    void this.cleanup().then(
      () => {
        callback(error);
      },
      (cleanupError: unknown) => {
        callback(cleanupError instanceof Error ? cleanupError : error);
      }
    );
  }

  private async pump(): Promise<void> {
    if (this.isClosed || this.pumping || this.fileHandle === null) {
      return;
    }

    this.pumping = true;
    try {
      for (;;) {
        const stats = await this.fileHandle.stat();
        if (this.offset >= stats.size) {
          break;
        }

        const size = Math.min(this.chunkSize, stats.size - this.offset);
        const buffer = Buffer.allocUnsafe(size);
        const result = await this.fileHandle.read(buffer, 0, size, this.offset);
        if (result.bytesRead <= 0) {
          break;
        }
        this.offset += result.bytesRead;
        if (!this.push(buffer.subarray(0, result.bytesRead))) {
          break;
        }
      }

      if (this.done) {
        const stats = await this.fileHandle.stat();
        if (this.offset >= stats.size) {
          this.push(null);
          await this.cleanup();
        }
      }
    } catch (error: unknown) {
      this.destroy(error instanceof Error ? error : new Error('Failed to read growing upload file'));
    } finally {
      this.pumping = false;
    }
  }

  private async cleanup(): Promise<void> {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.fileHandle !== null) {
      await this.fileHandle.close().catch(() => undefined);
      this.fileHandle = null;
    }
  }
}
