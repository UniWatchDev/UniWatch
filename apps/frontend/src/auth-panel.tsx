import { useState } from 'react';
import { API_BASE_URL } from '@repo/consts/api';
import {
  AUTH_FORGOT_PASSWORD_ENDPOINT,
  AUTH_LOGOUT_ENDPOINT,
  AUTH_RESEND_VERIFICATION_ENDPOINT,
  AUTH_RESET_PASSWORD_ENDPOINT,
  AUTH_VERIFY_EMAIL_ENDPOINT
} from '@repo/consts/auth';
import {
  getAuthMeContract,
  loginAuthContract,
  refreshAuthContract,
  registerAuthContract
} from '@repo/contracts/auth';
import type { LoginResponse } from '@repo/schemas/auth';
import {
  authNonEnumeratingAckSchema,
  forgotPasswordAckSchema,
  forgotPasswordBodySchema,
  resendVerificationBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
  verifyEmailResponseSchema
} from '@repo/schemas/auth';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

const FETCH_INIT = { credentials: 'include' as const };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function getEmailVerificationCode(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const debug = value['debug'];
  if (!isRecord(debug)) {
    return undefined;
  }
  const code = debug['emailVerificationCode'];
  return typeof code === 'string' ? code : undefined;
}

function getPasswordResetToken(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const debug = value['debug'];
  if (!isRecord(debug)) {
    return undefined;
  }
  const token = debug['passwordResetToken'];
  return typeof token === 'string' ? token : undefined;
}

function formatErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

async function readHttpErrorMessage(response: Response): Promise<string> {
  const raw = await response.text();
  if (raw.length === 0) {
    return `HTTP ${String(response.status)}`;
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (
      data !== null &&
      typeof data === 'object' &&
      'detail' in data &&
      typeof (data as { detail: unknown }).detail === 'string'
    ) {
      return (data as { detail: string }).detail;
    }
  } catch {
    /* ignore */
  }
  return `HTTP ${String(response.status)}`;
}

export function AuthPanel() {
  const [userName, setUserName] = useState(() => `u${String(Date.now())}`);
  const [phoneNumber, setPhoneNumber] = useState(
    () => `05${String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0')}`
  );
  const [email, setEmail] = useState(() => `u${String(Date.now())}@example.com`);
  const [password, setPassword] = useState('Secret1a');
  const [loginIdentifier, setLoginIdentifier] = useState(() =>
    `u${String(Date.now())}@example.com`
  );
  const [loginPassword, setLoginPassword] = useState('Secret1a');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('Secret2b');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<LoginResponse | null>(null);

  function clearFeedback() {
    setError(null);
    setStatus(null);
  }

  async function register() {
    clearFeedback();
    try {
      const body = registerAuthContract.bodySchema.parse({
        userName,
        phoneNumber,
        email,
        password
      });
      const response = await fetch(
        `${API_BASE_URL}${registerAuthContract.path}`,
        {
          ...FETCH_INIT,
          method: registerAuthContract.method,
          headers: JSON_HEADERS,
          body: JSON.stringify(body)
        }
      );
      if (!response.ok) {
        throw new Error(await readHttpErrorMessage(response));
      }
      const data: unknown = registerAuthContract.responseSchema.parse(
        JSON.parse(await response.text()) as unknown
      );
      if (!isRecord(data)) {
        throw new Error('Register response was missing expected fields');
      }
      const registeredEmail = data['email'];
      const registeredUserName = data['userName'];
      if (typeof registeredEmail !== 'string' || typeof registeredUserName !== 'string') {
        throw new Error('Register response was missing expected fields');
      }
      setVerificationEmail(registeredEmail);
      setLoginIdentifier(registeredEmail);
      const verificationCodeFromResponse = getEmailVerificationCode(data);
      if (verificationCodeFromResponse !== undefined) {
        setVerificationCode(verificationCodeFromResponse);
      }
      setStatus(
        `Registered as ${registeredUserName}. Use the 6-digit code from JSON for ${registeredEmail}. Login stays blocked until verified.`
      );
    } catch (err) {
      setError(formatErr(err));
    }
  }

  async function verifyEmail() {
    clearFeedback();
    try {
      const body = verifyEmailBodySchema.parse({
        email: verificationEmail,
        code: verificationCode
      });
      const response = await fetch(
        `${API_BASE_URL}${AUTH_VERIFY_EMAIL_ENDPOINT}`,
        {
          ...FETCH_INIT,
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(body)
        }
      );
      if (!response.ok) {
        throw new Error(await readHttpErrorMessage(response));
      }
      verifyEmailResponseSchema.parse(
        JSON.parse(await response.text()) as unknown
      );
      setStatus('Email verified — you can log in now.');
    } catch (err) {
      setError(formatErr(err));
    }
  }

  async function resendVerification() {
    clearFeedback();
    try {
      const body = resendVerificationBodySchema.parse({
        email: verificationEmail
      });
      const response = await fetch(
        `${API_BASE_URL}${AUTH_RESEND_VERIFICATION_ENDPOINT}`,
        {
          ...FETCH_INIT,
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(body)
        }
      );
      if (!response.ok) {
        throw new Error(await readHttpErrorMessage(response));
      }
      const ack: unknown = authNonEnumeratingAckSchema.parse(
        JSON.parse(await response.text()) as unknown
      );
      const verificationCodeFromResponse = getEmailVerificationCode(ack);
      if (verificationCodeFromResponse !== undefined) {
        setVerificationCode(verificationCodeFromResponse);
      }
      if (!isRecord(ack) || typeof ack['message'] !== 'string') {
        throw new Error('Resend response was missing a message');
      }
      setStatus(ack['message']);
    } catch (err) {
      setError(formatErr(err));
    }
  }

  async function requestPasswordReset() {
    clearFeedback();
    try {
      const body = forgotPasswordBodySchema.parse({
        email: forgotEmail
      });
      const response = await fetch(
        `${API_BASE_URL}${AUTH_FORGOT_PASSWORD_ENDPOINT}`,
        {
          ...FETCH_INIT,
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(body)
        }
      );
      if (!response.ok) {
        throw new Error(await readHttpErrorMessage(response));
      }
      const ack: unknown = forgotPasswordAckSchema.parse(
        JSON.parse(await response.text()) as unknown
      );
      const resetTokenFromResponse = getPasswordResetToken(ack);
      if (resetTokenFromResponse !== undefined) {
        setResetToken(resetTokenFromResponse);
      }
      if (!isRecord(ack) || typeof ack['message'] !== 'string') {
        throw new Error('Forgot-password response was missing a message');
      }
      setStatus(ack['message']);
    } catch (err) {
      setError(formatErr(err));
    }
  }

  async function resetPasswordWithToken() {
    clearFeedback();
    try {
      const body = resetPasswordBodySchema.parse({
        token: resetToken,
        newPassword: resetNewPassword
      });
      const response = await fetch(
        `${API_BASE_URL}${AUTH_RESET_PASSWORD_ENDPOINT}`,
        {
          ...FETCH_INIT,
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(body)
        }
      );
      if (response.status !== 204) {
        throw new Error(await readHttpErrorMessage(response));
      }
      setSessionUser(null);
      setStatus(
        'Password updated — refresh sessions were revoked and old access tokens no longer work.'
      );
    } catch (err) {
      setError(formatErr(err));
    }
  }

  async function login() {
    clearFeedback();
    setSessionUser(null);
    try {
      const body = loginAuthContract.bodySchema.parse({
        identifier: loginIdentifier,
        password: loginPassword
      });
      const response = await fetch(`${API_BASE_URL}${loginAuthContract.path}`, {
        ...FETCH_INIT,
        method: loginAuthContract.method,
        headers: JSON_HEADERS,
        body: JSON.stringify(body)
      });
      const raw = await response.text();
      if (!response.ok) {
        let msg = `login HTTP ${String(response.status)}`;
        try {
          const data: unknown = JSON.parse(raw);
          if (
            data !== null &&
            typeof data === 'object' &&
            'detail' in data &&
            typeof (data as { detail: unknown }).detail === 'string'
          ) {
            msg = (data as { detail: string }).detail;
          }
        } catch {
          /* keep msg */
        }
        throw new Error(msg);
      }
      const user: LoginResponse = loginAuthContract.responseSchema.parse(
        JSON.parse(raw) as unknown
      );
      setSessionUser(user);
      setStatus('Logged in — cookies set. Try Refresh or Me.');
    } catch (err) {
      setError(formatErr(err));
    }
  }

  async function refreshSession() {
    clearFeedback();
    try {
      const response = await fetch(
        `${API_BASE_URL}${refreshAuthContract.path}`,
        {
          ...FETCH_INIT,
          method: refreshAuthContract.method,
          headers: { Accept: 'application/json' }
        }
      );
      if (!response.ok) {
        throw new Error(await readHttpErrorMessage(response));
      }
      const user: LoginResponse = refreshAuthContract.responseSchema.parse(
        await response.json()
      );
      setSessionUser(user);
      setStatus('Session refreshed (new access + refresh cookies).');
    } catch (err) {
      setError(formatErr(err));
    }
  }

  async function loadMe() {
    clearFeedback();
    try {
      const response = await fetch(`${API_BASE_URL}${getAuthMeContract.path}`, {
        ...FETCH_INIT,
        method: getAuthMeContract.method,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) {
        throw new Error(await readHttpErrorMessage(response));
      }
      const user: LoginResponse = getAuthMeContract.responseSchema.parse(
        await response.json()
      );
      setSessionUser(user);
      setStatus('GET /me succeeded.');
    } catch (err) {
      setError(formatErr(err));
    }
  }

  async function logout() {
    clearFeedback();
    setSessionUser(null);
    try {
      const response = await fetch(`${API_BASE_URL}${AUTH_LOGOUT_ENDPOINT}`, {
        ...FETCH_INIT,
        method: 'POST'
      });
      if (response.status !== 204) {
        throw new Error(`logout HTTP ${String(response.status)}`);
      }
      setStatus('Logged out — cookies cleared.');
    } catch (err) {
      setError(formatErr(err));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div>
        <p className="display text-[13px] font-semibold uppercase tracking-wider text-[color:var(--color-violet)]">
          Auth (cookie session)
        </p>
        <p className="mono mt-1 text-[11px] leading-snug text-[color:var(--color-mute)]">
          Uses <code className="text-[color:var(--color-ink)]">credentials: include</code>{' '}
          + shared contracts. Backend on {API_BASE_URL}. Login requires verified email.
        </p>
      </div>

      <div className="soft-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <p className="mono mb-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-mute)]">
            Register
          </p>
          <p className="mono mb-2 text-[10px] leading-snug text-[color:var(--color-mute)]">
            Email and username must be unique. Several accounts may use the same
            phone number.
          </p>
          <div className="grid gap-2">
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                userName
              </span>
              <input
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-[13px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                }}
              />
            </label>
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                phone (IL mobile)
              </span>
              <input
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-[13px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                }}
              />
            </label>
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                email
              </span>
              <input
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-[13px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </label>
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                password (8+, uppercase, digit)
              </span>
              <input
                type="password"
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-[13px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
            </label>
            <button
              type="button"
              className="lift mt-1 rounded-xl bg-gradient-to-r from-[color:var(--color-violet)] to-[color:var(--color-coral)] px-4 py-2.5 text-[13px] font-semibold text-white focus-visible:ring-2 focus-visible:ring-white/80"
              onClick={() => {
                void register();
              }}
            >
              Register
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <p className="mono mb-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-mute)]">
            Verify email
          </p>
          <p className="mono mb-2 text-[10px] leading-snug text-[color:var(--color-mute)]">
            The API returns the code in JSON and can also send email when real delivery is enabled. Paste the JSON code here or from your inbox.
          </p>
          <div className="grid gap-2">
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                email
              </span>
              <input
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-[13px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={verificationEmail}
                onChange={(e) => {
                  setVerificationEmail(e.target.value);
                }}
              />
            </label>
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                6-digit code
              </span>
              <input
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-[13px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value);
                }}
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
              />
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                className="lift rounded-xl bg-gradient-to-r from-[color:var(--color-violet)] to-[color:var(--color-coral)] px-4 py-2 text-[12px] font-semibold text-white focus-visible:ring-2 focus-visible:ring-white/80"
                onClick={() => {
                  void verifyEmail();
                }}
              >
                Verify email
              </button>
              <button
                type="button"
                className="lift rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-[12px] font-medium text-[color:var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                onClick={() => {
                  void resendVerification();
                }}
              >
                Resend code
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <p className="mono mb-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-mute)]">
            Forgot / reset password
          </p>
          <p className="mono mb-2 text-[10px] leading-snug text-[color:var(--color-mute)]">
            Non-enumerating flow. The API returns the reset token in JSON and can also send email when real delivery is enabled.
          </p>
          <div className="grid gap-2">
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                email (forgot)
              </span>
              <input
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-[13px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                }}
              />
            </label>
            <button
              type="button"
              className="lift rounded-xl bg-gradient-to-r from-[color:var(--color-violet)] to-[color:var(--color-coral)] px-4 py-2 text-[12px] font-semibold text-white focus-visible:ring-2 focus-visible:ring-white/80"
              onClick={() => {
                void requestPasswordReset();
              }}
            >
              Request reset link
            </button>
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                reset token
              </span>
              <input
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 font-mono text-[11px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={resetToken}
                onChange={(e) => {
                  setResetToken(e.target.value);
                }}
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                new password
              </span>
              <input
                type="password"
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-[13px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={resetNewPassword}
                onChange={(e) => {
                  setResetNewPassword(e.target.value);
                }}
              />
            </label>
            <button
              type="button"
              className="lift rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-[12px] font-medium text-[color:var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
              onClick={() => {
                void resetPasswordWithToken();
              }}
            >
              Apply new password
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <p className="mono mb-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-mute)]">
            Login / session
          </p>
          <div className="grid gap-2">
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                email or username
              </span>
              <input
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-[13px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={loginIdentifier}
                onChange={(e) => {
                  setLoginIdentifier(e.target.value);
                }}
              />
            </label>
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                password
              </span>
              <input
                type="password"
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-[13px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                }}
              />
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                className="lift rounded-xl bg-gradient-to-r from-[color:var(--color-violet)] to-[color:var(--color-coral)] px-4 py-2 text-[12px] font-semibold text-white focus-visible:ring-2 focus-visible:ring-white/80"
                onClick={() => {
                  void login();
                }}
              >
                Login
              </button>
              <button
                type="button"
                className="lift rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-[12px] font-medium text-[color:var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                onClick={() => {
                  void refreshSession();
                }}
              >
                Refresh
              </button>
              <button
                type="button"
                className="lift rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-[12px] font-medium text-[color:var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                onClick={() => {
                  void loadMe();
                }}
              >
                Me
              </button>
              <button
                type="button"
                className="lift rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-[12px] font-medium text-[color:var(--color-mute)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]"
                onClick={() => {
                  void logout();
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {error !== null ? (
          <p className="mono rounded-xl border border-red-200/60 bg-red-50/90 px-3 py-2 text-[12px] text-red-900">
            {error}
          </p>
        ) : null}
        {status !== null ? (
          <p className="mono rounded-xl border border-emerald-200/60 bg-emerald-50/90 px-3 py-2 text-[12px] text-emerald-900">
            {status}
          </p>
        ) : null}
        {sessionUser !== null ? (
          <pre className="mono soft-scroll max-h-32 overflow-auto rounded-xl border border-white/15 bg-black/30 p-3 text-[11px] leading-relaxed text-emerald-100/95">
            {JSON.stringify(sessionUser, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
