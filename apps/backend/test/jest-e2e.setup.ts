/** Ensure Zod env validation passes when e2e boots `AppModule` (no real `.env` in CI). */
process.env['JWT_SECRET'] =
  process.env['JWT_SECRET'] ?? '01234567890123456789012345678901';
process.env['JWT_ACCESS_EXPIRES_IN'] =
  process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] =
  process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d';
process.env['AUTH_EMAIL_VERIFICATION_EXPIRES_IN'] =
  process.env['AUTH_EMAIL_VERIFICATION_EXPIRES_IN'] ?? '15m';
process.env['AUTH_PASSWORD_RESET_EXPIRES_IN'] =
  process.env['AUTH_PASSWORD_RESET_EXPIRES_IN'] ?? '1h';
process.env['AUTH_USE_REAL_EMAILS'] = process.env['AUTH_USE_REAL_EMAILS'] ?? 'false';
process.env['MONGODB_URI'] =
  process.env['MONGODB_URI'] ?? 'mongodb://127.0.0.1:27017/uniwatch_e2e';
