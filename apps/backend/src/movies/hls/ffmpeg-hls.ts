import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

export interface HlsVariant {
  /** Vertical resolution, e.g. 1080. */
  height: number;
  /** Target video bitrate in kbps. */
  bitrateKbps: number;
}

export interface ProbeResult {
  width: number;
  height: number;
  durationSec: number | null;
  hasAudio: boolean;
}

/** Standard adaptive ladder; each maps a height to a reasonable video bitrate. */
const STANDARD_VARIANTS: readonly HlsVariant[] = [
  { height: 1080, bitrateKbps: 5000 },
  { height: 720, bitrateKbps: 2800 },
  { height: 480, bitrateKbps: 1400 }
] as const;

const AUDIO_BITRATE_KBPS = 128;
// Longer segments mean fewer playlist/segment requests, which matters on a
// rate-limited origin (the R2 r2.dev dev URL). Each segment still starts on a
// forced keyframe so it stays independently decodable and seekable.
const SEGMENT_SECONDS = 6;
/** Video bitrate used when the source is shorter than the smallest standard rung. */
const FALLBACK_BITRATE_KBPS = 1400;

/**
 * Pick variants no taller than the source to avoid upscaling. If the source is
 * shorter than the smallest rung, transcode a single variant at the source
 * height (clamped to an even number, which H.264 requires).
 */
export function selectVariants(sourceHeight: number): HlsVariant[] {
  const fitting = STANDARD_VARIANTS.filter((variant) => variant.height <= sourceHeight);
  if (fitting.length > 0) {
    return [...fitting];
  }
  const evenHeight = Math.max(2, sourceHeight - (sourceHeight % 2));
  return [{ height: evenHeight, bitrateKbps: FALLBACK_BITRATE_KBPS }];
}

export async function probeVideo(inputPath: string): Promise<ProbeResult> {
  const stdout = await runProcess(ffprobeStatic.path, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-show_entries',
    'format=duration',
    '-of',
    'json',
    inputPath
  ]);

  const parsed = JSON.parse(stdout) as {
    streams?: { width?: number; height?: number }[];
    format?: { duration?: string };
  };
  const stream = parsed.streams?.[0];
  const width = stream?.width;
  const height = stream?.height;
  if (typeof width !== 'number' || typeof height !== 'number') {
    throw new Error('Unable to read video dimensions from source file');
  }
  const durationRaw = parsed.format?.duration;
  const duration = durationRaw !== undefined ? Number.parseFloat(durationRaw) : NaN;
  return {
    width,
    height,
    durationSec: Number.isFinite(duration) ? duration : null,
    hasAudio: await probeHasAudio(inputPath)
  };
}

async function probeHasAudio(inputPath: string): Promise<boolean> {
  const stdout = await runProcess(ffprobeStatic.path, [
    '-v',
    'error',
    '-select_streams',
    'a',
    '-show_entries',
    'stream=index',
    '-of',
    'json',
    inputPath
  ]);
  const parsed = JSON.parse(stdout) as { streams?: unknown[] };
  return (parsed.streams?.length ?? 0) > 0;
}

/**
 * Transcode the source into an adaptive HLS ladder in a single ffmpeg pass:
 * the source is decoded once, split, and scaled into every variant. ffmpeg
 * writes the master playlist via `-var_stream_map`. Output layout under `outDir`:
 *   master.m3u8, {h}p/index.m3u8, {h}p/segment_000.ts ...
 *
 * One pass (vs. one process per rendition) avoids re-decoding heavy 4K/HDR
 * sources N times, and the encoder thread budget leaves a core free so the
 * in-process API stays responsive while a job runs.
 */
export async function transcodeToHls(
  inputPath: string,
  outDir: string,
  variants: HlsVariant[],
  hasAudio: boolean
): Promise<void> {
  const binary = ffmpegPath;
  if (binary === null) {
    throw new Error('ffmpeg-static did not provide a binary path');
  }

  for (const variant of variants) {
    await fs.mkdir(path.join(outDir, `${String(variant.height)}p`), { recursive: true });
  }

  await runProcess(binary, buildLadderArgs(inputPath, outDir, variants, hasAudio));
}

/** Per-encoder thread budget that keeps at least one core free for the API. */
function encoderThreadCount(variantCount: number): number {
  const budget = Math.max(1, os.cpus().length - 1);
  return Math.max(1, Math.floor(budget / Math.max(1, variantCount)));
}

export function hlsContentType(filename: string): string {
  if (filename.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (filename.endsWith('.ts')) return 'video/mp2t';
  return 'application/octet-stream';
}

/** Recursively list absolute file paths under `dir`. */
export async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

function buildLadderArgs(
  inputPath: string,
  outDir: string,
  variants: HlsVariant[],
  hasAudio: boolean
): string[] {
  const threads = encoderThreadCount(variants.length);
  const args = ['-y', '-i', inputPath, '-filter_complex', buildSplitScaleFilter(variants)];

  // Map every scaled video output, then one audio copy per variant (if any).
  variants.forEach((_, index) => {
    args.push('-map', `[vout${String(index)}]`);
  });
  if (hasAudio) {
    variants.forEach(() => {
      args.push('-map', '0:a:0');
    });
  }

  // Shared video encoder settings. `-pix_fmt yuv420p` forces 8-bit 4:2:0 so
  // 10-bit/HDR or 4:2:2 sources still encode under the `main` profile and play
  // in browsers (x264 `main` rejects bit depth 10). `-force_key_frames` +
  // `-sc_threshold 0` align keyframes to segment boundaries so HLS cuts cleanly
  // and ABR switching/seeking stays smooth.
  args.push(
    '-c:v',
    'libx264',
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'veryfast',
    '-force_key_frames',
    `expr:gte(t,n_forced*${String(SEGMENT_SECONDS)})`,
    '-sc_threshold',
    '0'
  );
  variants.forEach((variant, index) => {
    const bitrate = variant.bitrateKbps;
    args.push(
      `-b:v:${String(index)}`,
      `${String(bitrate)}k`,
      `-maxrate:v:${String(index)}`,
      `${String(Math.round(bitrate * 1.07))}k`,
      `-bufsize:v:${String(index)}`,
      `${String(Math.round(bitrate * 1.5))}k`,
      `-threads:v:${String(index)}`,
      String(threads)
    );
  });

  if (hasAudio) {
    args.push('-c:a', 'aac', '-b:a', `${String(AUDIO_BITRATE_KBPS)}k`, '-ac', '2');
  }

  args.push(
    '-f',
    'hls',
    '-hls_time',
    String(SEGMENT_SECONDS),
    '-hls_playlist_type',
    'vod',
    '-hls_flags',
    'independent_segments',
    '-master_pl_name',
    'master.m3u8',
    '-var_stream_map',
    buildVarStreamMap(variants, hasAudio),
    '-hls_segment_filename',
    path.join(outDir, '%v', 'segment_%03d.ts'),
    path.join(outDir, '%v', 'index.m3u8')
  );
  return args;
}

/** `[0:v]split=N[v0]...;[v0]scale=-2:1080[vout0];...` — one decode, N scales. */
function buildSplitScaleFilter(variants: HlsVariant[]): string {
  const labels = variants.map((_, index) => `[v${String(index)}]`).join('');
  const split = `[0:v]split=${String(variants.length)}${labels}`;
  const scales = variants.map(
    (variant, index) =>
      `[v${String(index)}]scale=-2:${String(variant.height)}[vout${String(index)}]`
  );
  return [split, ...scales].join(';');
}

/** `v:0,a:0,name:1080p v:1,a:1,name:720p ...` — names drive the `%v` subdirs. */
function buildVarStreamMap(variants: HlsVariant[], hasAudio: boolean): string {
  return variants
    .map((variant, index) => {
      const audio = hasAudio ? `,a:${String(index)}` : '';
      return `v:${String(index)}${audio},name:${String(variant.height)}p`;
    })
    .join(' ');
}

function runProcess(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      const tail = stderr.trim().split('\n').slice(-5).join('\n');
      reject(new Error(`${path.basename(command)} exited with code ${String(code)}: ${tail}`));
    });
  });
}
