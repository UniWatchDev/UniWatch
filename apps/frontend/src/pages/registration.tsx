import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { passwordSchema } from '@repo/schemas/auth';

import { rememberFirstNameFromRegistration } from '@/auth/profile-local';
import { useCookieAuth } from '@/auth/use-cookie-auth';
import { SiteFooter } from '@/components/site-footer';

import { AuthPageShell } from './auth-page-shell';

export function Registration() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bio, setBio] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
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
    error,
    status,
    clearFeedback,
    register
  } = useCookieAuth();

  useEffect(() => {
    return () => {
      if (photoPreviewUrl !== null) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  function onPhotoChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (photoPreviewUrl !== null) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    if (file === undefined) {
      setPhotoPreviewUrl(null);
      return;
    }
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  return (
    <>
      <AuthPageShell maxWidth={480}>
        <div
          className="card card-elevated soft-scroll"
          style={{ padding: 32, maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }}
        >
          <h1
            className="display"
            style={{ fontSize: 28, margin: '0 0 8px', color: 'var(--text-primary)' }}
          >
            Create account
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Join the co-watching experience
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: '2px solid var(--border-medium)',
                background: 'var(--bg-input)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {photoPreviewUrl !== null ? (
                <img
                  src={photoPreviewUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span className="display" style={{ fontSize: 28, color: 'var(--text-muted)' }}>
                  ?
                </span>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  onPhotoChange(e.target.files);
                }}
              />
              <button
                type="button"
                className="btn-ghost"
                style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                onClick={() => {
                  fileInputRef.current?.click();
                }}
              >
                Upload photo
              </button>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                Preview only - not sent to the server.
              </p>
            </div>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setLocalError(null);
              clearFeedback();
              if (password !== confirmPassword) {
                setLocalError('Passwords do not match.');
                return;
              }
              if (firstName.trim().length === 0) {
                setLocalError('First name is required.');
                return;
              }
              const pwdCheck = passwordSchema.safeParse(password);
              if (!pwdCheck.success) {
                const first = pwdCheck.error.issues[0];
                setLocalError(first?.message ?? 'Invalid password.');
                return;
              }
              void (async () => {
                const result = await register();
                if (result.ok) {
                  rememberFirstNameFromRegistration(result.firstName, result.email);
                  void navigate('/verify-email', { state: { email: result.email } });
                }
              })();
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="registration-first-name" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  First name <span style={{ color: 'var(--accent)' }} aria-hidden>*</span>
                </label>
                <input
                  id="registration-first-name"
                  className="input"
                  autoComplete="given-name"
                  placeholder="Alex"
                  required
                  value={firstName}
                  onChange={(e) => {
                    clearFeedback();
                    setFirstName(e.target.value);
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="registration-last-name" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Last name <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input
                  id="registration-last-name"
                  className="input"
                  autoComplete="family-name"
                  placeholder="Rivera"
                  value={lastName}
                  onChange={(e) => {
                    clearFeedback();
                    setLastName(e.target.value);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="registration-username" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Username
              </label>
              <input
                id="registration-username"
                className="input"
                autoComplete="username"
                placeholder="handle"
                value={userName}
                onChange={(e) => {
                  clearFeedback();
                  setUserName(e.target.value);
                }}
              />
            </div>
            <p style={{ margin: '-8px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              First name is required for your account and the nav greeting. Username is your public handle.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="registration-email" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                id="registration-email"
                type="email"
                className="input"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  clearFeedback();
                  setEmail(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="registration-phone" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Phone number
              </label>
              <input
                id="registration-phone"
                type="tel"
                className="input"
                autoComplete="tel"
                placeholder="05XXXXXXXX or +9725XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => {
                  clearFeedback();
                  setPhoneNumber(e.target.value);
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Israeli mobile format (required by the API).
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="registration-password" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input
                id="registration-password"
                type="password"
                className="input"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  clearFeedback();
                  setPassword(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="registration-confirm" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Confirm password
              </label>
              <input
                id="registration-confirm"
                type="password"
                className="input"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setLocalError(null);
                  setConfirmPassword(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="registration-bio" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Bio (optional)
              </label>
              <textarea
                id="registration-bio"
                className="input"
                rows={3}
                placeholder="Tell others a bit about yourself…"
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Not sent to the server - UI placeholder only.
              </span>
            </div>

            {localError !== null ? <p className="auth-feedback-error">{localError}</p> : null}
            {error !== null ? <p className="auth-feedback-error">{error}</p> : null}
            {status !== null ? <p className="auth-feedback-success">{status}</p> : null}

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 4 }}>
              Create Account
            </button>
          </form>

          <p
            style={{
              marginTop: 24,
              marginBottom: 0,
              textAlign: 'center',
              fontSize: 14,
              color: 'var(--text-secondary)',
            }}
          >
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </AuthPageShell>
      <SiteFooter />
    </>
  );
}
