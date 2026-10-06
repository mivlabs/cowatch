import { Link } from 'react-router-dom';
import { miniAppLink, TELEGRAM_BOT_USERNAME } from '@/lib/telegramBot';
import { TgStatusScreen } from '../components/TgStatusScreen';

/** /tg opened in a normal browser: there is no initData to sign in with. */
export function TgOutside() {
  const botLink = miniAppLink();
  return (
    <TgStatusScreen
      pose="sleep"
      title="Это версия для Telegram"
      text="Приложение открывается внутри Telegram и само узнаёт, кто вы. В браузере работает обычный сайт."
    >
      <div className="grid w-full gap-3">
        {botLink && (
          <a href={botLink} className="cw-btn cw-btn-primary">
            Открыть в Telegram
          </a>
        )}
        <Link to="/" className="cw-btn cw-btn-line">
          На сайт CoWatch
        </Link>
        {TELEGRAM_BOT_USERNAME && (
          <p className="font-mono text-xs text-cream-dim">Бот: @{TELEGRAM_BOT_USERNAME}</p>
        )}
      </div>
    </TgStatusScreen>
  );
}
