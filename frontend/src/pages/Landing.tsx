import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Film, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { recommendationsApi } from '@/lib/api';
import { JoinModal } from '@/components/JoinModal';
import { Avatar } from '@/components/Avatar';
import { Logo } from '@/components/Logo';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Features } from '@/components/landing/Features';
import { CtaSection } from '@/components/landing/CtaSection';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

interface RecommendedItem {
  content_id: number;
  title: string;
  genres: string[];
  poster_path: string | null;
  release_year: number | null;
}

export function Landing() {
  const [roomCode, setRoomCode] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRoomCode, setModalRoomCode] = useState<string | undefined>();
  const navigate = useNavigate();
  const { logout, user, isAuthenticated } = useAuth();

  // Блок "Рекомендуем": молча ничего не рендерим, если модель ещё не
  // обучена (503) или рекомендаций нет — это не ошибка, которую стоит
  // показывать пользователю на главной странице.
  const recommendationsQuery = useQuery({
    queryKey: ['home-recommendations', user?.id],
    queryFn: async (): Promise<RecommendedItem[]> => {
      const response = await recommendationsApi.get(`/recommendations/${user!.id}`, {
        params: { k: 10 },
      });
      return response.data.items;
    },
    enabled: !!user?.id,
    retry: false,
  });

  const handleRecommendationClick = (item: RecommendedItem) => {
    navigate('/create', {
      state: {
        preselected: {
          id: item.content_id,
          title: item.title,
          media_type: 'movie',
          genres: item.genres,
          poster_path: item.poster_path,
          release_year: item.release_year,
        },
      },
    });
  };

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

  const handleJoinAsGuest = () => {
    setModalRoomCode(undefined);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      {/* Top nav — not part of the Figma marketing mock, but auth/profile/logout
         is real working functionality carried over from the old HomePage and
         has to live somewhere. Kept minimal and styled with the new tokens. */}
      <header className="flex items-center justify-between px-6 py-5 md:px-16">
        <Logo size="sm" />
        {isAuthenticated ? (
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]"
              title="Мой профиль"
            >
              <Avatar username={user?.username || 'User'} size="sm" />
              <span className="hidden text-sm font-medium sm:inline">
                {user?.isGuest ? `🎭 ${user.username}` : user?.username}
              </span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setModalRoomCode(undefined);
                setModalOpen(true);
              }}
              className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]"
            >
              Войти
            </button>
            <Link
              to="/register"
              className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]"
            >
              Регистрация
            </Link>
          </div>
        )}
      </header>

      <Hero
        onCreateRoom={handleCreateRoom}
        roomCode={roomCode}
        onRoomCodeChange={setRoomCode}
        onJoin={handleJoin}
      />

      <HowItWorks />
      <Features />

      {/* Personalized recommendations — real functionality from the old HomePage,
         no equivalent block in the Figma marketing mock. Placed here so it reads
         as a natural continuation of the Features bento above it. */}
      {recommendationsQuery.data && recommendationsQuery.data.length > 0 && (
        <section className="bg-[var(--color-bg-surface)] px-6 py-16 md:px-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
              <Sparkles className="size-5 text-[var(--color-accent-cyan)]" />
              Рекомендуем
            </h2>
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
              {recommendationsQuery.data.map((item) => (
                <motion.button
                  key={item.content_id}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  onClick={() => handleRecommendationClick(item)}
                  className="group w-32 shrink-0 snap-start text-left"
                >
                  <div className="mb-2 h-48 w-32 overflow-hidden rounded-xl border border-white/10 bg-[var(--color-bg-elevated)]">
                    {item.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
                        alt={item.title}
                        className="size-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Film className="size-8 text-[var(--color-text-muted)]" />
                      </div>
                    )}
                  </div>
                  <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{item.title}</p>
                  {item.release_year && (
                    <p className="text-xs text-[var(--color-text-muted)]">{item.release_year}</p>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaSection onCreateRoom={handleCreateRoom} onJoinAsGuest={handleJoinAsGuest} />

      <JoinModal isOpen={modalOpen} onClose={() => setModalOpen(false)} roomCode={modalRoomCode} />
    </div>
  );
}
