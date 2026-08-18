import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film, Users, Zap, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { JoinModal } from '@/components/JoinModal';

export function HomePage() {
  const [roomCode, setRoomCode] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRoomCode, setModalRoomCode] = useState<string | undefined>();
  const navigate = useNavigate();
  const { logout, user, isAuthenticated } = useAuth();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim().length >= 4) {
      if (!isAuthenticated) {
        setModalRoomCode(roomCode.trim().toUpperCase());
        setModalOpen(true);
      } else {
        navigate(`/room/${roomCode.trim().toUpperCase()}`);
      }
    }
  };

  const handleCreateRoom = () => {
    if (!isAuthenticated) {
      setModalRoomCode(undefined);
      setModalOpen(true);
    } else {
      navigate('/create');
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Верхняя панель - на мобильном в потоке, на десктопе абсолютная */}
      <div className="w-full md:absolute md:top-4 md:right-4 z-20 flex items-center justify-between md:justify-end p-4 md:p-0">
        {isAuthenticated ? (
          <>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.isGuest ? `🎭 ${user.username}` : user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/30"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </>
        ) : (
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => { setModalRoomCode(undefined); setModalOpen(true); }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Войти
            </button>
            <Link
              to="/register"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-medium transition-colors"
            >
              Регистрация
            </Link>
          </div>
        )}
      </div>

      {/* Фоновые градиентные пятна */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-2xl mx-auto"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-white/10 mb-6"
        >
          <Film className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-muted-foreground">Совместный просмотр нового поколения</span>
        </motion.div>

        <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          CoWatch
        </h1>

        <p className="text-xl text-muted-foreground mb-10 max-w-lg mx-auto">
          Смотри фильмы и сериалы с друзьями в идеальной синхронизации.
          Создай комнату за секунду.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateRoom}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all"
          >
            Создать комнату <ArrowRight className="w-5 h-5" />
          </motion.button>

          <form onSubmit={handleJoin} className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="КОД"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="px-4 py-4 bg-muted border border-white/10 rounded-xl text-center uppercase tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-32"
              maxLength={6}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-semibold transition-colors"
            >
              Войти
            </motion.button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-8">
          {[
            { icon: Zap, title: "Мгновенный старт", desc: "Без регистрации — просто введи ник" },
            { icon: Users, title: "До 50 друзей", desc: "Масштабируемые комнаты для любых тусовок" },
            { icon: Film, title: "Любой источник", desc: "YouTube, Rutube или прямые ссылки на видео" }
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="p-4 rounded-xl bg-muted/50 border border-white/5"
            >
              <item.icon className="w-6 h-6 text-purple-400 mb-2" />
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 🔥 Модальное окно входа */}
      <JoinModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        roomCode={modalRoomCode}
      />
    </div>
  );
}