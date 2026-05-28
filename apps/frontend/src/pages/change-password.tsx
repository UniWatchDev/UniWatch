import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { passwordSchema } from '@repo/schemas/auth';

import { redirectToLogin } from '@/auth/auth-redirect';
import { useCookieAuth } from '@/auth/use-cookie-auth';
import { SiteFooter } from '@/components/site-footer';

import { AuthPageShell } from './auth-page-shell';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { sessionUser, changePassword, error, status, clearFeedback } = useCookieAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionUser === null) {
      redirectToLogin(navigate, { replace: true });
    }
  }, [sessionUser, navigate]);

  if (sessionUser === null) {
    return null;
  }

  return (
    <>
      <AuthPageShell>
        <div className="card card-elevated" style={{ padding: 32 }}>
          <h1 className="display" style={{ fontSize: 26, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            Change password
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Enter your current password, then choose a new one. Other devices will be signed out.
          </p>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setLocalError(null);
              clearFeedback();
              if (newPassword !== confirmPassword) {
                setLocalError('New passwords do not match.');
                return;
              }
              const parsed = passwordSchema.safeParse(newPassword);
              if (!parsed.success) {
                const first = parsed.error.issues[0];
                setLocalError(first?.message ?? 'Invalid new password.');
                return;
              }
              void (async () => {
                const result = await changePassword({
                  currentPassword,
                  newPassword
                });
                if (result.ok) {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  void navigate('/', { replace: true });
                }
              })();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="change-current" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Current password
              </label>
              <input
                id="change-current"
                type="password"
                className="input"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  clearFeedback();
                  setCurrentPassword(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="change-new" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                New password
              </label>
              <input
                id="change-new"
                type="password"
                className="input"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  clearFeedback();
                  setNewPassword(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="change-confirm" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Confirm new password
              </label>
              <input
                id="change-confirm"
                type="password"
                className="input"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setLocalError(null);
                  setConfirmPassword(e.target.value);
                }}
              />
            </div>
            {localError !== null ? <p className="auth-feedback-error">{localError}</p> : null}
            {error !== null ? <p className="auth-feedback-error">{error}</p> : null}
            {status !== null ? <p className="auth-feedback-success">{status}</p> : null}
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              Update password
            </button>
          </form>

          <p style={{ marginTop: 20, marginBottom: 0, fontSize: 14 }}>
            <Link to="/" className="auth-link">
              Back to rooms
            </Link>
          </p>
        </div>
      </AuthPageShell>
      <SiteFooter />
    </>
  );
}
