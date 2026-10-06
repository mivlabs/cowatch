import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { TelegramProvider } from './TelegramProvider';
import { useTelegram } from './useTelegram';
import { parseStartParam } from '@/lib/roomCode';
import { TgStatusScreen } from './components/TgStatusScreen';
import { TgHome } from './pages/TgHome';
import { TgRoom } from './pages/TgRoom';
import { TgProfile } from './pages/TgProfile';
import { TgOutside } from './pages/TgOutside';

/** Everything under /tg: the CoWatch Mini App that opens inside Telegram. */
export function TelegramApp() {
  return (
    <TelegramProvider>
      <TelegramGate />
    </TelegramProvider>
  );
}

function TelegramGate() {
  const { status, error, retry } = useTelegram();

  if (status === 'loading' || status === 'authenticating') {
    return <TgStatusScreen pose="stretch" title="Открываем зал" progress />;
  }
  if (status === 'outside') {
    return <TgOutside />;
  }
  if (status === 'error') {
    return (
      <TgStatusScreen pose="sit" title="Не пустили" text={error ?? 'Попробуйте открыть приложение заново.'}>
        <button type="button" onClick={retry} className="cw-btn cw-btn-primary">
          Попробовать ещё раз
        </button>
      </TgStatusScreen>
    );
  }
  return <TelegramRoutes />;
}

function TelegramRoutes() {
  const { startParam } = useTelegram();
  const navigate = useNavigate();
  const handledStartParam = useRef(false);

  // t.me/<bot>?startapp=ABC234 lands on /tg; jump into the room once.
  useEffect(() => {
    if (handledStartParam.current) return;
    handledStartParam.current = true;
    const code = parseStartParam(startParam);
    if (code) navigate(`/tg/room/${code}`, { replace: true });
  }, [startParam, navigate]);

  return (
    <Routes>
      <Route index element={<TgHome />} />
      <Route path="room/:code" element={<TgRoom />} />
      <Route path="profile" element={<TgProfile />} />
      <Route path="*" element={<Navigate to="/tg" replace />} />
    </Routes>
  );
}
