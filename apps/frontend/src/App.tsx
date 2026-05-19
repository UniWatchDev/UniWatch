import { Navigate, Route, Routes } from 'react-router-dom';

import { CookieAuthProvider } from '@/auth/cookie-auth-provider';
import { NavBar } from '@/components/nav-bar';
import { ProtectedAppPage } from '@/protected-app-page';
import { ChangePasswordPage } from '@/pages/change-password';
import { CreateRoom } from '@/pages/create-room';
import { EditRoom } from '@/pages/edit-room';
import { ForgotPasswordPage } from '@/pages/forgot-password-page';
import { Lobby } from '@/pages/lobby';
import { Login } from '@/pages/login';
import { Registration } from '@/pages/registration';
import { ResetPasswordPage } from '@/pages/reset-password-page';
import { RoomPage } from '@/pages/room';
import { VerifyEmailPage } from '@/pages/verify-email-page';

export default function App() {
  return (
    <CookieAuthProvider>
      <div className="flex min-h-dvh flex-1 flex-col">
        <NavBar />
        <div className="flex min-h-0 flex-1 flex-col">
          <Routes>
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Registration />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/app" element={<ProtectedAppPage />} />
            <Route path="/" element={<Navigate to="/rooms" replace />} />
            <Route path="/rooms" element={<Lobby />} />
            <Route path="/room/:id" element={<RoomPage />} />
            <Route path="/rooms/new" element={<CreateRoom />} />
            <Route path="/rooms/:id/edit" element={<EditRoom />} />
          </Routes>
        </div>
      </div>
    </CookieAuthProvider>
  );
}
