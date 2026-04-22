interface VerifyResult {
  ok: boolean;
  source: string;
}

export function verifyPackage(): VerifyResult {
  return { ok: true, source: '@repo/example' };
}
