import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useCookieAuth } from '@/auth/use-cookie-auth';
import { SiteFooter } from '@/components/site-footer';

import { AuthPageShell } from './auth-page-shell';

type VerifyLocationState = { email?: string } | null;

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    verificationEmail,
    setVerificationEmail,
    verificationCode,
    setVerificationCode,
    error,
    status,
    clearFeedback,
    verifyEmail,
    resendVerification
  } = useCookieAuth();

  useEffect(() => {
    const state = location.state as VerifyLocationState;
    const fromNav = state?.email;
    if (typeof fromNav === 'string' && fromNav.length > 0) {
      setVerificationEmail(fromNav);
    }
  }, [location.state, setVerificationEmail]);

  return (
    <>
      <AuthPageShell>
        <div className="card card-elevated" style={{ padding: 32 }}>
          <h1 className="display" style={{ fontSize: 26, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            Verify your email
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Enter the 6-digit code from your email or the API response when email delivery is disabled.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="verify-email" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                id="verify-email"
                type="email"
                className="input"
                autoComplete="email"
                value={verificationEmail}
                onChange={(e) => {
                  clearFeedback();
                  setVerificationEmail(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="verify-code" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                6-digit code
              </label>
              <input
                id="verify-code"
                className="input"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(e) => {
                  clearFeedback();
                  setVerificationCode(e.target.value);
                }}
              />
            </div>
            {error !== null ? <p className="auth-feedback-error">{error}</p> : null}
            {status !== null ? <p className="auth-feedback-success">{status}</p> : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  void (async () => {
                    const result = await verifyEmail();
                    if (result.ok) {
                      void navigate('/login');
                    }
                  })();
                }}
              >
                Verify email
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  void resendVerification();
                }}
              >
                Resend code
              </button>
            </div>
          </div>

          <p style={{ marginTop: 24, marginBottom: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
            <Link to="/login" className="auth-link">
              Back to Sign In
            </Link>
          </p>
        </div>
      </AuthPageShell>
      <SiteFooter />
    </>
  );
}
