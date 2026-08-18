import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Film, Clock, Trophy, Star, 
  Calendar, Users, LogOut, Settings 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';

// Моковые данные (потом заменим на запрос к API)
const MOCK_HISTORY = [
  { id: 1, title: 'Интерстеллар', date: '17 авг 2026', duration: '2ч 49м', type: 'youtube' },
  { id: 2, title: 'Дюна: Часть вторая', date: '15 авг 2026', duration: '2ч 46м', type: 'rutube' },
  { id: 3, title: 'Матрица', date: '10 авг 2026', duration: '2ч 16м', type: 'youtube' },
];

const MOCK_ACHIEVEMENTS = [
  { id: 1, title: 'Первый шаг', desc: 'Посмотри свой первый фильм', icon: '🎬', unlocked: true, date: '10 авг 2026' },
  { id: 2, title: 'Ночной киноман', desc: 'Смотри фильм после 02:00', icon: '🦉', unlocked: true, date: '15 авг 2026' },
  { id: 3, title: 'Король вечеринок', desc: 'Создай 10 комнат', icon: '👑', unlocked: false, date: null },
  { id: 4, title: 'Кинокритик', desc: 'Посмотри 50 фильмов', icon: '🍿', unlocked: false, date: null },
];

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'achievements'>('profile');

  if (!user) {
    navigate('/');
    return null;
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

      {/* Шапка профиля */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-white/10 rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6"
      >
        <div className="relative">
          <Avatar username={user.username} size="lg" />
          {user.isGuest && (
            <span className="absolute -bottom-2 -right-2 bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full border border-white/10">
              Гость
            </span>
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold mb-2">{user.username}</h1>
          <p className="text-muted-foreground mb-4">{user.email || 'Гостевой аккаунт'}</p>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/5">
              <Film className="w-4 h-4 text-purple-400" />
              <span className="text-sm"><strong>12</strong> фильмов</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/5">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm"><strong>34ч</strong> просмотра</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/5">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-sm"><strong>5</strong> комнат</span>
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
                Активность
              </h3>
              <p className="text-muted-foreground text-sm">
                Ты присоединился к CoWatch недавно. Продолжай смотреть фильмы с друзьями, чтобы разблокировать больше статистики!
              </p>
            </div>
            <div className="p-6 bg-muted/30 border border-white/5 rounded-xl flex items-center justify-center">
              <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Settings className="w-4 h-4" />
                Настройки аккаунта (скоро)
              </button>
            </div>
          </div>
        )}

        {/* ТАБ: История */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {MOCK_HISTORY.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 bg-muted/20 border border-white/5 rounded-xl hover:bg-muted/40 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Film className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.date} • {item.duration}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-white/5 rounded-md uppercase tracking-wider">
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ТАБ: Ачивки */}
        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MOCK_ACHIEVEMENTS.map((ach) => (
              <div 
                key={ach.id} 
                className={`p-5 rounded-xl border transition-all ${
                  ach.unlocked 
                    ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20' 
                    : 'bg-muted/20 border-white/5 opacity-60 grayscale'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{ach.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold">{ach.title}</h4>
                      {ach.unlocked && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{ach.desc}</p>
                    {ach.unlocked && ach.date && (
                      <span className="text-[10px] text-yellow-500/80 uppercase tracking-wider">
                        Получено: {ach.date}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}