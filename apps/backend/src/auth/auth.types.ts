/** JWT access token payload (signed claims). */
export type JwtAccessPayload = {
  sub: string;
  email: string;
};

declare global {
  // Express 5 @types: augment `Express.Request` (merged onto `Request` from 'express').
  // eslint-disable-next-line @typescript-eslint/no-namespace -- declaration merge requires `namespace Express`
  namespace Express {
    interface Request {
      /** Set by `JwtAuthGuard` after verifying the `access_token` cookie. */
      authPayload?: JwtAccessPayload;
    }
  }
}

export {};
