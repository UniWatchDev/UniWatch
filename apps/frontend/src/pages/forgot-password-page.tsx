import { Link } from 'react-router-dom';

import { useCookieAuth } from '@/auth/use-cookie-auth';
import { SiteFooter } from '@/components/site-footer';

import { AuthPageShell } from './auth-page-shell';

export function ForgotPasswordPage() {
  const { forgotEmail, setForgotEmail, error, status, clearFeedback, requestPasswordReset } =
    useCookieAuth();

  return (
    <>
      <AuthPageShell>
        <div className="card card-elevated" style={{ padding: 32 }}>
          <h1 className="display" style={{ fontSize: 26, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            Reset password
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
            We will send instructions if an account exists for this email. You can also paste the reset
            token from the API response when delivery is disabled.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="forgot-email" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                className="input"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => {
                  clearFeedback();
                  setForgotEmail(e.target.value);
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
                void requestPasswordReset();
              }}
            >
              Request reset link
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
