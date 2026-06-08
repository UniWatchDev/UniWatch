import { Route, Routes, useLocation } from 'react-router-dom';

import { ThemeProvider } from '@/theme/theme-provider';

import { CookieAuthProvider } from '@/auth/cookie-auth-provider';
import { RequireAuth } from '@/auth/require-auth';
import { NavBar } from '@/nav/nav-bar';
import { SiteFooter } from '@/components/site-footer';
import { shouldShowFooter } from '@/nav/nav-paths';
import { ProtectedAppPage } from '@/protected-app-page';
import { ChangePasswordPage } from '@/pages/change-password';
import { CreateRoom } from '@/pages/create-room';
import { EditRoom } from '@/pages/edit-room';
import { ForgotPasswordPage } from '@/pages/forgot-password-page';
import { LandingPage } from '@/pages/landing-page';
import { Lobby } from '@/pages/lobby';
import { Login } from '@/pages/login';
import { Registration } from '@/pages/registration';
import { ResetPasswordPage } from '@/pages/reset-password-page';
import { RoomPage } from '@/pages/room';
import { VerifyEmailPage } from '@/pages/verify-email-page';
import { ProfilePage } from '@/profile/profile-page';
import { ProfileRedirect } from '@/profile/profile-redirect';
import { AboutPage } from '@/pages/about';
import { PrivacyPolicyPage } from '@/pages/privacy-policy';

function AppShell() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      {pathname !== '/' && <NavBar />}
      <div className="flex min-h-0 flex-1 flex-col">
        <Routes>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/app" element={<ProtectedAppPage />} />
          <Route path="/profile" element={<ProfileRedirect />} />
          <Route path="/u/:userName" element={<ProfilePage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/rooms" element={<RequireAuth><Lobby /></RequireAuth>} />
          <Route path="/room/:id" element={<RequireAuth><RoomPage /></RequireAuth>} />
          <Route path="/rooms/new" element={<RequireAuth><CreateRoom /></RequireAuth>} />
          <Route path="/rooms/:id/edit" element={<RequireAuth><EditRoom /></RequireAuth>} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
        </Routes>
      </div>
      {shouldShowFooter(pathname) && <SiteFooter />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CookieAuthProvider>
        <AppShell />
      </CookieAuthProvider>
    </ThemeProvider>
  );
}
