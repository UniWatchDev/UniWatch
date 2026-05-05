import { Route, Routes } from 'react-router-dom';

import HomePage from '@/home-page';
import { ProtectedAppPage } from '@/protected-app-page';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/app" element={<ProtectedAppPage />} />
    </Routes>
  );
}
