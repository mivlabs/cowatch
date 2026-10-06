import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { recommendationsApi } from '@/lib/api';
import { JoinModal } from '@/components/JoinModal';
import { Avatar } from '@/components/Avatar';
import { Logo } from '@/components/Logo';
import { SiteFooter } from '@/components/SiteFooter';
import { CatSticker } from '@/components/brand/CatSticker';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Features } from '@/components/landing/Features';
import { CtaSection } from '@/components/landing/CtaSection';
import { PlateHeader } from '@/components/landing/PlateHeader';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

const NAV_LINK = 'font-mono text-xs font-medium uppercase tracking-[0.12em] text-cream transition-colors hover:text-gold';

interface RecommendedItem {
  content_id: number;
  title: string;
  media_type: 'movie' | 'tv' | null;
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

  // Блок "Для вас": молча ничего не рендерим, если модель ещё не
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
          media_type: item.media_type ?? 'movie',
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

  const openSignIn = () => {
    setModalRoomCode(undefined);
    setModalOpen(true);
  };

  const nav = (
    <nav aria-label="Главное меню" className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <Link to="/" aria-label="CoWatch, на главную" className="mr-auto">
        <Logo />
      </Link>
      {/* On phones the footer link is enough: a third item would wrap the nav under the logo. */}
      <Link to="/about" className={`hidden sm:inline ${NAV_LINK}`}>
        О проекте
      </Link>
      {isAuthenticated ? (
        <>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className={`flex items-center gap-2.5 ${NAV_LINK}`}
            title="Мой профиль"
          >
            <Avatar username={user?.username || 'User'} size="sm" />
            <span className="hidden sm:inline">
              {user?.username}
              {user?.isGuest && <span className="text-cream-dim"> · гость</span>}
            </span>
          </button>
          <button type="button" onClick={logout} className={NAV_LINK}>
            Выйти
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={openSignIn} className={NAV_LINK}>
            Войти
          </button>
          <Link to="/register" className={NAV_LINK}>
            Регистрация
          </Link>
        </>
      )}
    </nav>
  );

  const recommendations = recommendationsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-ink pb-24 text-cream">
      <Hero
        nav={nav}
        onCreateRoom={handleCreateRoom}
        roomCode={roomCode}
        onRoomCodeChange={setRoomCode}
        onJoin={handleJoin}
      />

      <main className="mx-auto mt-[88px] grid max-w-[1040px] gap-[88px] px-4">
        <HowItWorks />
        <Features />

        {recommendations.length > 0 && (
          <section className="grid gap-5 md:grid-cols-[220px_1fr] md:gap-8">
            <PlateHeader
              label="Для вас"
              title="Что посмотреть сегодня"
              note="Нажмите на фильм, чтобы собрать комнату с ним."
            />
            <div className="flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
              {recommendations.map((item) => (
                <button
                  key={item.content_id}
                  type="button"
                  onClick={() => handleRecommendationClick(item)}
                  className="group grid w-32 shrink-0 snap-start content-start gap-2 text-left"
                >
                  <div className="aspect-[2/3] w-32 overflow-hidden rounded border border-line bg-night">
                    {item.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid size-full place-items-center">
                        <CatSticker pose="sit" width={56} />
                      </div>
                    )}
                  </div>
                  <p className="truncate font-display text-xl italic leading-tight">{item.title}</p>
                  {item.release_year && <p className="font-mono text-xs text-cream-dim">{item.release_year}</p>}
                </button>
              ))}
            </div>
          </section>
        )}

        <CtaSection onCreateRoom={handleCreateRoom} onJoinAsGuest={openSignIn} />
      </main>

      <div className="mt-[88px]">
        <SiteFooter />
      </div>

      <JoinModal isOpen={modalOpen} onClose={() => setModalOpen(false)} roomCode={modalRoomCode} />
    </div>
  );
}
