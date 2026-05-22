import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useCookieAuth } from '@/auth/use-cookie-auth';
import { SiteFooter } from '@/components/site-footer';

import { AuthPageShell } from './auth-page-shell';

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authRequired = searchParams.get('auth') === 'required';
  const {
    loginIdentifier,
    setLoginIdentifier,
    loginPassword,
    setLoginPassword,
    error,
    status,
    clearFeedback,
    login
  } = useCookieAuth();

  return (
    <>
      <AuthPageShell>
        <div className="card card-elevated" style={{ padding: 32 }}>
          <h1 className="display" style={{ fontSize: 28, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            Welcome back
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Sign in to join or create a watch room
          </p>

          {authRequired ? (
            <p className="auth-feedback-info" style={{ marginBottom: 20 }}>
              Oops — log in first.
            </p>
          ) : null}

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void (async () => {
                const result = await login();
                if (result.ok) {
                  void navigate('/');
                }
              })();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-identifier" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Email or username
              </label>
              <input
                id="login-identifier"
                className="input"
                autoComplete="username"
                placeholder="you@example.com or your_handle"
                value={loginIdentifier}
                onChange={(e) => {
                  clearFeedback();
                  setLoginIdentifier(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="input"
                autoComplete="current-password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => {
                  clearFeedback();
                  setLoginPassword(e.target.value);
                }}
              />
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="auth-link" style={{ fontSize: 13 }}>
                Forgot password?
              </Link>
            </div>
            {error !== null ? <p className="auth-feedback-error">{error}</p> : null}
            {status !== null ? <p className="auth-feedback-success">{status}</p> : null}
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 4 }}>
              Sign In
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
            No account?{' '}
            <Link to="/register" className="auth-link">
              Sign Up
            </Link>
          </p>
        </div>
      </AuthPageShell>
      <SiteFooter />
    </>
  );
}
