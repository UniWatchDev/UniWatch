import { S3Client } from '@aws-sdk/client-s3';

export type CreateS3ClientOptions = {
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export function isCloudflareR2Endpoint(endpoint: string): boolean {
  try {
    const { hostname } = new URL(endpoint);
    return (
      hostname.endsWith('.r2.cloudflarestorage.com') ||
      hostname.endsWith('.eu.r2.cloudflarestorage.com')
    );
  } catch {
    return false;
  }
}

export function isR2PlaceholderEndpoint(endpoint: string): boolean {
  return endpoint.includes('00000000000000000000000000000000.r2.cloudflarestorage.com');
}

/**
 * S3 client for Cloudflare R2 or other S3-compatible storage.
 * R2: always path-style (virtual-hosted bucket URLs break TLS on R2).
 */
export function createS3Client(options: CreateS3ClientOptions): S3Client {
  const isR2 = isCloudflareR2Endpoint(options.endpoint);

  return new S3Client({
    region: options.region,
    endpoint: options.endpoint,
    forcePathStyle: isR2 || options.forcePathStyle,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
  });
}
