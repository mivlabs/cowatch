import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Film, Clock, Trophy, Star, 
  Calendar, Users, LogOut 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { Avatar } from '@/components/Avatar';

// Типы данных, которые приходят с бэкенда
interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
}

interface HistoryItem {
  id: number;
  movie_title: string;
  movie_url: string;
  watched_at: string;
}

interface ProfileData {
  username: string;
  email: string | null;
  total_movies: number;
  total_hours: number;
  achievements: Achievement[];
  history: HistoryItem[];
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'achievements'>('profile');

  if (!user) {
    navigate('/');
    return null;
  }

  // 🔥 ЗАПРОС К РЕАЛЬНОМУ БЭКЕНДУ
  const { data: profile, isLoading, error } = useQuery<ProfileData>({
    queryKey: ['profile', user.id],
    queryFn: async () => {
      const response = await authApi.get(`/auth/profile/${user.id}`);
      return response.data;
    },
    enabled: !!user.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Загружаем твой профиль...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h2 className="text-2xl font-bold mb-4 text-red-400">Не удалось загрузить профиль</h2>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary rounded-xl font-semibold">
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-4xl mx-auto">
      {/* Навигация */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>На главную</span>
        </button>
        <button 
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>

      {/* Шапка профиля с реальными данными */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-white/10 rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6"
      >
        <div className="relative">
          <Avatar username={profile.username} size="lg" />
          {user.isGuest && (
            <span className="absolute -bottom-2 -right-2 bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full border border-white/10">
              Гость
            </span>
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold mb-2">{profile.username}</h1>
          <p className="text-muted-foreground mb-4">{profile.email || 'Гостевой аккаунт'}</p>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/5">
              <Film className="w-4 h-4 text-purple-400" />
              <span className="text-sm"><strong>{profile.total_movies}</strong> фильмов</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/5">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm"><strong>{profile.total_hours.toFixed(1)}ч</strong> просмотра</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/5">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-sm"><strong>{profile.achievements.length}</strong> ачивок</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Табы */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-1 overflow-x-auto">
        {[
          { id: 'profile', label: 'Статистика', icon: Star },
          { id: 'history', label: 'История', icon: Clock },
          { id: 'achievements', label: 'Ачивки', icon: Trophy },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Контент табов */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* ТАБ: Статистика */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-muted/30 border border-white/5 rounded-xl">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Добро пожаловать в CoWatch!
              </h3>
              <p className="text-muted-foreground text-sm">
                Ты уже посмотрел <strong>{profile.total_movies}</strong> фильмов и провел за просмотром <strong>{profile.total_hours.toFixed(1)} часов</strong>. 
                Продолжай смотреть с друзьями, чтобы разблокировать новые достижения!
              </p>
            </div>
          </div>
        )}

        {/* ТАБ: История */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {profile.history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>История просмотров пуста. Самое время создать комнату!</p>
              </div>
            ) : (
              profile.history.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-muted/20 border border-white/5 rounded-xl hover:bg-muted/40 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Film className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{item.movie_title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.watched_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ТАБ: Ачивки */}
        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile.achievements.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>У тебя пока нет ачивок. Зарегистрируйся или посмотри первый фильм!</p>
              </div>
            ) : (
              profile.achievements.map((ach) => (
                <div 
                  key={ach.id} 
                  className="p-5 rounded-xl border bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{ach.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold">{ach.title}</h4>
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{ach.description}</p>
                      <span className="text-[10px] text-yellow-500/80 uppercase tracking-wider">
                        Получено: {new Date(ach.unlocked_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}