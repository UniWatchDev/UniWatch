import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@repo/consts/api';
import {
  AUTH_FORGOT_PASSWORD_ENDPOINT,
  AUTH_LOGOUT_ENDPOINT,
  AUTH_RESEND_VERIFICATION_ENDPOINT,
  AUTH_RESET_PASSWORD_ENDPOINT,
  AUTH_VERIFY_EMAIL_ENDPOINT
} from '@repo/consts/auth';
import {
  changePasswordAuthContract,
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

import {
  formatErr,
  getEmailVerificationCode,
  getPasswordResetToken,
  isRecord,
  readHttpErrorMessage
} from '@/auth/auth-fetch-helpers';
import { recordLoginForGreeting, rememberFirstNameFromRegistration } from '@/auth/profile-local';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

const FETCH_INIT = { credentials: 'include' as const };

export function useCookieAuthModel() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<LoginResponse | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}${getAuthMeContract.path}`, {
      credentials: 'include' as const,
      headers: { Accept: 'application/json' }
    })
      .then(async (res) => {
        if (!res.ok) return;
        const user: LoginResponse = getAuthMeContract.responseSchema.parse(await res.json());
        rememberFirstNameFromRegistration(user.firstName, user.email);
        setSessionUser(user);
      })
      .catch(() => undefined)
      .finally(() => { setAuthInitialized(true); });
  }, []);

  function clearFeedback() {
    setError(null);
    setStatus(null);
  }

  async function register(): Promise<
    | { ok: true; email: string; userName: string; firstName: string }
    | { ok: false }
  > {
    clearFeedback();
    try {
      const body = registerAuthContract.bodySchema.parse({
        firstName,
        lastName: lastName.trim() === '' ? undefined : lastName,
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
      const registeredFirstName = data['firstName'];
      if (
        typeof registeredFirstName !== 'string' ||
        registeredFirstName.trim().length === 0
      ) {
        throw new Error('Register response was missing expected fields');
      }
      setVerificationEmail(registeredEmail);
      setLoginIdentifier(registeredEmail);
      const verificationCodeFromResponse = getEmailVerificationCode(data);
      if (verificationCodeFromResponse !== undefined) {
        setVerificationCode(verificationCodeFromResponse);
      }
      setStatus(
        `Registered as ${registeredUserName}. Use the 6-digit code from JSON or your email. Login stays blocked until verified.`
      );
      return {
        ok: true,
        email: registeredEmail,
        userName: registeredUserName,
        firstName: registeredFirstName
      };
    } catch (err) {
      setError(formatErr(err));
      return { ok: false };
    }
  }

  async function verifyEmail(): Promise<{ ok: true } | { ok: false }> {
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
      return { ok: true };
    } catch (err) {
      setError(formatErr(err));
      return { ok: false };
    }
  }

  async function resendVerification(): Promise<{ ok: true } | { ok: false }> {
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
      return { ok: true };
    } catch (err) {
      setError(formatErr(err));
      return { ok: false };
    }
  }

  async function requestPasswordReset(): Promise<{ ok: true } | { ok: false }> {
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
      return { ok: true };
    } catch (err) {
      setError(formatErr(err));
      return { ok: false };
    }
  }

  async function resetPasswordWithToken(): Promise<{ ok: true } | { ok: false }> {
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
      return { ok: true };
    } catch (err) {
      setError(formatErr(err));
      return { ok: false };
    }
  }

  async function login(): Promise<{ ok: true; user: LoginResponse } | { ok: false }> {
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
      rememberFirstNameFromRegistration(user.firstName, user.email);
      void recordLoginForGreeting();
      setSessionUser(user);
      setStatus('Signed in — session cookies set.');
      return { ok: true, user };
    } catch (err) {
      setError(formatErr(err));
      return { ok: false };
    }
  }

  async function refreshSession(): Promise<{ ok: true } | { ok: false }> {
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
      rememberFirstNameFromRegistration(user.firstName, user.email);
      setSessionUser(user);
      setStatus('Session refreshed (new access + refresh cookies).');
      return { ok: true };
    } catch (err) {
      setError(formatErr(err));
      return { ok: false };
    }
  }

  async function loadMe(): Promise<{ ok: true; user: LoginResponse } | { ok: false }> {
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
      rememberFirstNameFromRegistration(user.firstName, user.email);
      setSessionUser(user);
      setStatus('Profile loaded.');
      return { ok: true, user };
    } catch (err) {
      setError(formatErr(err));
      return { ok: false };
    }
  }

  async function logout(): Promise<{ ok: true } | { ok: false }> {
    clearFeedback();
    try {
      const response = await fetch(`${API_BASE_URL}${AUTH_LOGOUT_ENDPOINT}`, {
        ...FETCH_INIT,
        method: 'POST'
      });
      if (response.status !== 204) {
        throw new Error(`logout HTTP ${String(response.status)}`);
      }
      setStatus('Signed out — cookies cleared.');
      return { ok: true };
    } catch (err) {
      setError(formatErr(err));
      return { ok: false };
    } finally {
      setSessionUser(null);
    }
  }

  async function changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ ok: true } | { ok: false }> {
    clearFeedback();
    try {
      const body = changePasswordAuthContract.bodySchema.parse(input);
      const response = await fetch(
        `${API_BASE_URL}${changePasswordAuthContract.path}`,
        {
          ...FETCH_INIT,
          method: changePasswordAuthContract.method,
          headers: JSON_HEADERS,
          body: JSON.stringify(body)
        }
      );
      const raw = await response.text();
      if (!response.ok) {
        throw new Error(await readHttpErrorMessage(response));
      }
      const user: LoginResponse = changePasswordAuthContract.responseSchema.parse(
        JSON.parse(raw) as unknown
      );
      rememberFirstNameFromRegistration(user.firstName, user.email);
      setSessionUser(user);
      setStatus('Password updated — you are still signed in.');
      return { ok: true };
    } catch (err) {
      setError(formatErr(err));
      return { ok: false };
    }
  }

  return {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    userName,
    setUserName,
    phoneNumber,
    setPhoneNumber,
    email,
    setEmail,
    password,
    setPassword,
    loginIdentifier,
    setLoginIdentifier,
    loginPassword,
    setLoginPassword,
    verificationEmail,
    setVerificationEmail,
    verificationCode,
    setVerificationCode,
    forgotEmail,
    setForgotEmail,
    resetToken,
    setResetToken,
    resetNewPassword,
    setResetNewPassword,
    status,
    setStatus,
    error,
    setError,
    sessionUser,
    setSessionUser,
    authInitialized,
    clearFeedback,
    register,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPasswordWithToken,
    login,
    refreshSession,
    loadMe,
    logout,
    changePassword
  };
}

export type CookieAuthModel = ReturnType<typeof useCookieAuthModel>;
