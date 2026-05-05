'use client';

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

const inputClass =
  'w-full border-b border-[color:var(--color-rule)] bg-transparent px-0 py-1 text-[12px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-mute)] focus:border-[color:var(--color-ink)] focus:outline-none';

export function AuthPanel() {
  const [userName, setUserName] = useState(() => `u${String(Date.now())}`);
  const [phoneNumber, setPhoneNumber] = useState(
    () => `05${String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0')}`
  );
  const [email, setEmail] = useState(
    () => `u${String(Date.now())}@example.com`
  );
  const [password, setPassword] = useState('Secret1a');
  const [loginIdentifier, setLoginIdentifier] = useState(
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
        `Registered as ${data.userName} (${data.email}). Log in when ready.`
      );
      setLoginIdentifier(data.email);
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
      if (!response.ok) {
        throw new Error(`login HTTP ${String(response.status)}`);
      }
      const user: LoginResponse = loginAuthContract.responseSchema.parse(
        await response.json()
      );
      setSessionUser(user);
      setStatus('Logged in — HttpOnly cookies set. Try Refresh or Me.');
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
      setStatus('Session refreshed.');
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
      setStatus('Logged out.');
    } catch (err) {
      setError(formatErr(err));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-baseline justify-between">
        <p className="mono small-caps text-[10px] text-[color:var(--color-accent)]">
          / Session
        </p>
      </div>
      <div className="mt-2 h-px w-full origin-left bg-[color:var(--color-ink)] rule-draw" />
      <p className="mono mt-2 text-[10px] leading-snug text-[color:var(--color-mute)]">
        Same contracts as the Vite client.{' '}
        <code className="text-[color:var(--color-ink)]">credentials: include</code>
        . API {API_BASE_URL}.
      </p>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 editorial-scroll">
        <div>
          <p className="mono small-caps text-[10px] text-[color:var(--color-mute)]">
            Register
          </p>
          <p className="mono mt-1 text-[10px] text-[color:var(--color-mute)]">
            Unique email and username; phone may repeat across accounts.
          </p>
          <div className="mt-2 grid gap-2 border-b border-dotted border-[color:var(--color-rule)] pb-2">
            <label className="grid gap-0.5">
              <span className="mono text-[9px] text-[color:var(--color-mute)]">
                userName
              </span>
              <input
                className={inputClass}
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                }}
              />
            </label>
            <label className="grid gap-0.5">
              <span className="mono text-[9px] text-[color:var(--color-mute)]">
                phone (IL mobile)
              </span>
              <input
                className={inputClass}
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                }}
              />
            </label>
            <label className="grid gap-0.5">
              <span className="mono text-[9px] text-[color:var(--color-mute)]">
                email
              </span>
              <input
                className={inputClass}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </label>
            <label className="grid gap-0.5">
              <span className="mono text-[9px] text-[color:var(--color-mute)]">
                password
              </span>
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
            </label>
            <button
              type="button"
              className="mono mt-1 w-fit border border-[color:var(--color-ink)] bg-[color:var(--color-ink)] px-3 py-1 text-[11px] text-[color:var(--color-paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
              onClick={() => {
                void register();
              }}
            >
              Register →
            </button>
          </div>
        </div>

        <div>
          <p className="mono small-caps text-[10px] text-[color:var(--color-mute)]">
            Login
          </p>
          <div className="mt-2 grid gap-2 border-b border-dotted border-[color:var(--color-rule)] pb-2">
            <label className="grid gap-0.5">
              <span className="mono text-[9px] text-[color:var(--color-mute)]">
                email or username
              </span>
              <input
                className={inputClass}
                value={loginIdentifier}
                onChange={(e) => {
                  setLoginIdentifier(e.target.value);
                }}
              />
            </label>
            <label className="grid gap-0.5">
              <span className="mono text-[9px] text-[color:var(--color-mute)]">
                password
              </span>
              <input
                type="password"
                className={inputClass}
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                }}
              />
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                className="mono border border-[color:var(--color-ink)] bg-[color:var(--color-ink)] px-2 py-1 text-[10px] text-[color:var(--color-paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
                onClick={() => {
                  void login();
                }}
              >
                Login →
              </button>
              <button
                type="button"
                className="mono border border-[color:var(--color-rule)] bg-transparent px-2 py-1 text-[10px] text-[color:var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
                onClick={() => {
                  void refreshSession();
                }}
              >
                Refresh
              </button>
              <button
                type="button"
                className="mono border border-[color:var(--color-rule)] bg-transparent px-2 py-1 text-[10px] text-[color:var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]"
                onClick={() => {
                  void loadMe();
                }}
              >
                Me
              </button>
              <button
                type="button"
                className="mono text-[10px] text-[color:var(--color-mute)] underline-offset-2 hover:text-[color:var(--color-ink)] hover:underline"
                onClick={() => {
                  void logout();
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>

        {error !== null ? (
          <p className="mono text-[10px] text-[color:var(--color-fail)]" role="alert">
            {error}
          </p>
        ) : null}
        {status !== null ? (
          <p className="mono text-[10px] text-[color:var(--color-ok)]">{status}</p>
        ) : null}
        {sessionUser !== null ? (
          <pre className="mono max-h-28 overflow-auto border border-[color:var(--color-rule)] bg-[color:var(--color-paper)] p-2 text-[10px] leading-relaxed text-[color:var(--color-ink)]">
            {JSON.stringify(sessionUser, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
