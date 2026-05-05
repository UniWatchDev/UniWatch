/** Ensure Zod env validation passes when e2e boots `AppModule` (no real `.env` in CI). */
process.env['JWT_SECRET'] =
  process.env['JWT_SECRET'] ?? '01234567890123456789012345678901';
process.env['JWT_ACCESS_EXPIRES_IN'] =
  process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] =
  process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d';
