import { createReadStream, watch, type FSWatcher, promises as fs } from 'node:fs';
import path from 'node:path';

import { hlsContentType, listFilesRecursive } from '@/movies/hls/ffmpeg-hls';
import type { StorageService } from '@/storage/storage.interface';

type FileStamp = {
  size: number;
  mtimeMs: number;
};

type HlsSegmentPublisherOptions = {
  storage: StorageService;
  prefix: string;
  debounceMs: number;
};

const FILE_ORDER = ['segment_', 'index.m3u8', 'master.m3u8'] as const;

export class HlsSegmentPublisher {
  private readonly storage: StorageService;
  private readonly prefix: string;
  private readonly debounceMs: number;
  private readonly published = new Map<string, FileStamp>();
  private readonly watchers: FSWatcher[] = [];
  private outDir: string | null = null;
  private scanTimer: ReturnType<typeof setTimeout> | null = null;
  private scanning = false;
  private scanQueued = false;
  private stopped = false;

  constructor({ storage, prefix, debounceMs }: HlsSegmentPublisherOptions) {
    this.storage = storage;
    this.prefix = prefix.replace(/\/+$/u, '');
    this.debounceMs = debounceMs;
  }

  start(outDir: string, variantHeights: readonly number[]): void {
    this.outDir = outDir;
    this.stopped = false;

    this.watchDir(outDir);
    for (const height of variantHeights) {
      this.watchDir(path.join(outDir, `${String(height)}p`));
    }

    this.scheduleScan();
  }

  async flush(): Promise<void> {
    if (this.outDir === null || this.stopped) {
      return;
    }
    await this.scanAndPublish();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.scanTimer !== null) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers.length = 0;
    await this.flush();
  }

  private watchDir(dir: string): void {
    try {
      const watcher = watch(dir, { persistent: false }, () => {
        this.scheduleScan();
      });
      watcher.on('error', () => {
        this.scheduleScan();
      });
      this.watchers.push(watcher);
    } catch {
      this.scheduleScan();
    }
  }

  private scheduleScan(): void {
    if (this.stopped) return;
    if (this.scanTimer !== null) {
      clearTimeout(this.scanTimer);
    }
    this.scanTimer = setTimeout(() => {
      this.scanTimer = null;
      void this.scanAndPublish();
    }, this.debounceMs);
  }

  private async scanAndPublish(): Promise<void> {
    if (this.stopped || this.outDir === null) {
      return;
    }
    if (this.scanning) {
      this.scanQueued = true;
      return;
    }

    this.scanning = true;
    try {
      const files = await listFilesRecursive(this.outDir);
      const orderedFiles = files.sort((a, b) => this.comparePaths(a, b));
      for (const file of orderedFiles) {
        const relative = path.relative(this.outDir, file).split(path.sep).join('/');
        let stats;
        try {
          stats = await fs.stat(file);
        } catch {
          continue;
        }
        const stamp = { size: stats.size, mtimeMs: stats.mtimeMs };
        const previous = this.published.get(relative);
        if (previous !== undefined && previous.size === stamp.size && previous.mtimeMs === stamp.mtimeMs) {
          continue;
        }

        await this.storage.putObject({
          key: `${this.prefix}/${relative}`,
          body: createReadStream(file),
          contentType: hlsContentType(file),
          contentLength: stats.size
        });
        this.published.set(relative, stamp);
      }
    } finally {
      this.scanning = false;
      if (this.scanQueued) {
        this.scanQueued = false;
        await this.scanAndPublish();
      }
    }
  }

  private comparePaths(left: string, right: string): number {
    const leftWeight = this.fileWeight(left);
    const rightWeight = this.fileWeight(right);
    if (leftWeight !== rightWeight) {
      return leftWeight - rightWeight;
    }
    return left.localeCompare(right);
  }

  private fileWeight(filePath: string): number {
    const normalized = filePath.split(path.sep).join('/');
    if (normalized.endsWith('master.m3u8')) return 2;
    if (normalized.endsWith('index.m3u8')) return 1;
    if (normalized.includes('/segment_')) return 0;
    return FILE_ORDER.length;
  }
}
