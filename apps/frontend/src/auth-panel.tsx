import { useState } from 'react';
import { API_BASE_URL } from '@repo/consts/api';
import { AUTH_LOGOUT_ENDPOINT } from '@repo/consts/auth';
import {
  getAuthMeContract,
  loginAuthContract,
  refreshAuthContract,
  registerAuthContract
} from '@repo/contracts/auth';
import type { LoginResponse, RegisterResponse } from '@repo/schemas/auth';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

const FETCH_INIT = { credentials: 'include' as const };

function formatErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export function AuthPanel() {
  const [userName, setUserName] = useState(() => `u${String(Date.now())}`);
  const [phoneNumber, setPhoneNumber] = useState(
    () => `05${String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0')}`
  );
  const [email, setEmail] = useState(
    () => `u${String(Date.now())}@example.com`
  );
  const [password, setPassword] = useState('Secret1a');
  const [loginEmail, setLoginEmail] = useState(
    () => `u${String(Date.now())}@example.com`
  );
  const [loginPassword, setLoginPassword] = useState('Secret1a');
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
        throw new Error(`register HTTP ${String(response.status)}`);
      }
      const data: RegisterResponse = registerAuthContract.responseSchema.parse(
        await response.json()
      );
      setStatus(
        `Registered as ${data.userName} (${data.email}). You can log in next.`
      );
      setLoginEmail(data.email);
    } catch (err) {
      setError(formatErr(err));
    }
  }

  async function login() {
    clearFeedback();
    setSessionUser(null);
    try {
      const body = loginAuthContract.bodySchema.parse({
        email: loginEmail,
        password: loginPassword
      });
      const response = await fetch(`${API_BASE_URL}${loginAuthContract.path}`, {
        ...FETCH_INIT,
        method: loginAuthContract.method,
        headers: JSON_HEADERS,
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        throw new Error(`login HTTP ${String(response.status)}`);
      }
      const user: LoginResponse = loginAuthContract.responseSchema.parse(
        await response.json()
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
        throw new Error(`refresh HTTP ${String(response.status)}`);
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
        throw new Error(`me HTTP ${String(response.status)}`);
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
          + shared contracts. Backend on {API_BASE_URL}.
        </p>
      </div>

      <div className="soft-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <p className="mono mb-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-mute)]">
            Register
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
            Login / session
          </p>
          <div className="grid gap-2">
            <label className="grid gap-0.5">
              <span className="mono text-[10px] text-[color:var(--color-mute)]">
                email
              </span>
              <input
                className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-[13px] text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-violet)]"
                value={loginEmail}
                onChange={(e) => {
                  setLoginEmail(e.target.value);
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
