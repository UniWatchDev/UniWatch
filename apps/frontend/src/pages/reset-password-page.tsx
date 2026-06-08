import { Link, useNavigate } from 'react-router-dom';

import { useCookieAuth } from '@/auth/use-cookie-auth';
import { SiteFooter } from '@/components/site-footer';
import { PasswordInput } from '@/components/ui/password-input';

import { AuthPageShell } from './auth-page-shell';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const {
    resetToken,
    setResetToken,
    resetNewPassword,
    setResetNewPassword,
    error,
    status,
    clearFeedback,
    resetPasswordWithToken
  } = useCookieAuth();

  return (
    <>
      <AuthPageShell>
        <div className="card card-elevated" style={{ padding: 32 }}>
          <h1 className="display" style={{ fontSize: 26, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            Set a new password
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Paste the reset token from your email or the API debug payload, then choose a new password.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-token" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Reset token
              </label>
              <input
                id="reset-token"
                className="input mono"
                spellCheck={false}
                autoComplete="off"
                value={resetToken}
                onChange={(e) => {
                  clearFeedback();
                  setResetToken(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-new-password" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                New password
              </label>
              <PasswordInput
                id="reset-new-password"
                autoComplete="new-password"
                value={resetNewPassword}
                onChange={(e) => {
                  clearFeedback();
                  setResetNewPassword(e.target.value);
                }}
              />
            </div>
            {error !== null ? <p className="auth-feedback-error">{error}</p> : null}
            {status !== null ? <p className="auth-feedback-success">{status}</p> : null}
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={() => {
                void (async () => {
                  const result = await resetPasswordWithToken();
                  if (result.ok) {
                    void navigate('/login');
                  }
                })();
              }}
            >
              Apply new password
            </button>
            <p style={{ margin: 0, fontSize: 14 }}>
              <Link to="/login" className="auth-link">
                Back to Sign In
              </Link>
            </p>
          </div>
        </div>
      </AuthPageShell>
      <SiteFooter />
    </>
  );
}
