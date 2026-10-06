import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '@/lib/api';
import { normalizeRoomCode } from '@/lib/roomCode';
import type { Room } from '@/types/room';
import { useAuth } from '@/contexts/AuthContext';
import { CatSticker } from '@/components/brand/CatSticker';
import { useTelegram, useTelegramBackButton } from '../useTelegram';
import { useRecentRooms } from '../recentRooms';
import { TgScreen } from '../components/TgScreen';
import { TgAvatar } from '../components/TgAvatar';

/** Home of the Mini App: start a room, enter a code, or go back to a recent room. */
export function TgHome() {
  const navigate = useNavigate();
  const { tgUser, webApp, haptic } = useTelegram();
  const { user } = useAuth();
  const { rooms: recentRooms, forget } = useRecentRooms(webApp);
  useTelegramBackButton(null);

  const firstName = tgUser?.first_name || user?.username || 'друг';
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const createRoom = useMutation({
    mutationFn: async (roomTitle: string) => {
      const response = await api.post<Room>('/rooms/', {
        title: roomTitle,
        is_private: true,
        max_participants: 10,
      });
      return response.data;
    },
    onSuccess: (room) => {
      haptic('success');
      navigate(`/tg/room/${room.code}`);
    },
    onError: () => haptic('error'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const roomTitle = title.trim() || `Вечер с ${firstName}`;
    createRoom.mutate(roomTitle.slice(0, 100));
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeRoomCode(code);
    if (!normalized) {
      haptic('error');
      setJoinError('Код состоит из шести букв и цифр.');
      return;
    }
    setJoining(true);
    setJoinError('');
    try {
      await api.get(`/rooms/${normalized}`);
      haptic('success');
      navigate(`/tg/room/${normalized}`);
    } catch (err) {
      haptic('error');
      setJoinError(
        isAxiosError(err) && err.response?.status === 404
          ? 'Такой комнаты нет. Проверьте код.'
          : 'Не получилось проверить код. Попробуйте ещё раз.',
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <TgScreen seed={9}>
      <header className="flex items-center gap-3 px-4 pt-4">
        <TgAvatar tgUser={tgUser} fallbackName={firstName} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[28px] font-medium italic leading-none">Привет, {firstName}</p>
          <p className="truncate font-mono text-xs text-cream-dim">
            {tgUser?.username ? `@${tgUser.username}` : 'CoWatch в Telegram'}
          </p>
        </div>
        <Link to="/tg/profile" className="cw-btn cw-btn-line px-3 py-2 text-[11px]" onClick={() => haptic('tap')}>
          Профиль
        </Link>
      </header>

      <main className="grid gap-5 px-4 pb-8 pt-6">
        <form onSubmit={handleCreate} className="grid gap-3 rounded border border-line bg-night/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <span className="cw-label">Новая комната</span>
              <h1 className="font-display text-[30px] font-medium italic leading-none">Новый сеанс</h1>
            </div>
            <CatSticker pose="wave" width={64} className="-mt-1 shrink-0" />
          </div>
          <input
            id="tg-room-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Вечер с ${firstName}`}
            maxLength={100}
            autoComplete="off"
            aria-label="Название комнаты"
            className="cw-field"
          />
          {createRoom.isError && (
            <p className="text-sm text-coral">Не получилось создать комнату. Попробуйте ещё раз.</p>
          )}
          <button type="submit" disabled={createRoom.isPending} className="cw-btn cw-btn-primary w-full">
            {createRoom.isPending ? 'Создаём…' : 'Создать комнату'}
          </button>
        </form>

        <form onSubmit={handleJoin} className="grid gap-3 rounded border border-line bg-night/80 p-4">
          <div className="grid gap-1">
            <span className="cw-label">По приглашению</span>
            <h2 className="font-display text-[30px] font-medium italic leading-none">Зайти по коду</h2>
          </div>
          <div className="flex gap-2">
            <input
              id="tg-room-code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setJoinError('');
              }}
              placeholder="ABC234"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-label="Код комнаты"
              className="cw-code-input flex-1"
            />
            <button type="submit" disabled={joining || code.length < 6} className="cw-btn cw-btn-primary px-5">
              {joining ? '…' : 'Войти'}
            </button>
          </div>
          {joinError && <p className="text-sm text-coral">{joinError}</p>}
        </form>

        {recentRooms.length > 0 && (
          <section className="grid gap-2">
            <h2 className="cw-label px-1">Недавние комнаты</h2>
            <ul className="grid gap-2">
              {recentRooms.map((room) => (
                <li key={room.code} className="flex items-center gap-3 rounded border border-line bg-night/80 p-3">
                  <button
                    type="button"
                    onClick={() => {
                      haptic('tap');
                      navigate(`/tg/room/${room.code}`);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate font-display text-xl italic leading-tight">{room.title}</p>
                    <p className="font-mono text-xs tracking-[0.2em] text-gold">{room.code}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => forget(room.code)}
                    aria-label={`Убрать комнату ${room.code} из недавних`}
                    className="cw-btn cw-btn-ghost text-cream-dim"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="px-1 text-center font-mono text-[11px] text-cream-dim">
          Плеер, чат и реакции синхронизируются со всеми, кто в комнате: с телефона, с сайта, откуда угодно.
        </p>
      </main>
    </TgScreen>
  );
}
