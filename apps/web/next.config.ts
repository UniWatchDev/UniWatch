import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['@repo/consts', '@repo/schemas', '@repo/contracts']
};

export default nextConfig;
