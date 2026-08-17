import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CreateRoomPage } from './pages/CreateRoomPage'; // 🔥 Добавь этот импорт
import { useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<HomePage />} />
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;