import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { RoomPage } from './pages/RoomPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { useAuth } from './contexts/AuthContext';
import { ProfilePage } from '@/pages/ProfilePage';
import { AboutPage } from '@/pages/AboutPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { CookieNotice } from '@/components/CookieNotice';
import { TelegramApp } from '@/telegram/TelegramApp';


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Site-only chrome: inside the Telegram Mini App there are no cookies to explain. */
function SiteChrome() {
  const { pathname } = useLocation();
  if (pathname === '/tg' || pathname.startsWith('/tg/')) return null;
  return <CookieNotice />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<Landing />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreateRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:code"
          element={
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          }
        />
        {/* Telegram Mini App: signs in with initData, no ProtectedRoute needed. */}
        <Route path="/tg/*" element={<TelegramApp />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <SiteChrome />
    </BrowserRouter>
  );
}

export default App;