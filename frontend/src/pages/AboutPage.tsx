import { Link } from 'react-router-dom';
import { StaticPage, PageSection } from '@/components/StaticPage';
import { CatSticker } from '@/components/brand/CatSticker';
import { CONTACT_EMAIL, CONTACT_TELEGRAM, CONTACT_TELEGRAM_URL, GITHUB_URL } from '@/lib/contacts';

const TEXT_LINK = 'text-gold underline underline-offset-[3px] transition-colors hover:text-cream';

/** What CoWatch is, who makes it, how to help and where to write. */
export function AboutPage() {
  return (
    <StaticPage
      label="О проекте"
      seed={7}
      title="Одно кино на всех"
      lead="CoWatch — сервис для совместного просмотра видео: общая комната, синхронный плеер, чат и реакции. Без рекламы, без подписок, с открытым кодом."
    >
      <PageSection label="Как это работает" title="Комната, код, кино">
        <p>
          Хост создаёт комнату, вставляет ссылку на YouTube, Rutube или видеофайл и отправляет друзьям код из шести
          символов. Дальше плеер идёт у всех одновременно: пауза, перемотка и запуск у хоста повторяются у каждого
          зрителя.
        </p>
        <p>
          Чат и реакции живут поверх видео, чтобы не ставить фильм на паузу ради обсуждения. За просмотры и
          активность в комнатах выдаются наклейки, а в профиле копится история и подборка «что посмотреть дальше».
        </p>
        <p className="text-cream-dim">
          Видео у нас не хранится. Плеер показывает ролик с той площадки, ссылку на которую вставил хост, по её
          правилам и с её рекламой.
        </p>
      </PageSection>

      <PageSection label="Кто делает" title="Один человек и несколько котиков">
        <p>
          CoWatch делается одним человеком в свободное время. Код открыт на GitHub под лицензией MIT: можно
          посмотреть, как всё устроено, завести issue или прислать правку.
        </p>
        <p>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
            github.com/mivlabs/cowatch
          </a>
        </p>
      </PageSection>

      <PageSection label="Поддержать" title="Скоро здесь будет кнопка">
        <div className="grid gap-4 sm:grid-cols-[96px_1fr] sm:items-start">
          <CatSticker pose="wave" width={96} className="shrink-0" />
          <div className="grid gap-4">
            <p>
              Способ поддержать проект деньгами появится на этой странице позже. Пока лучшая помощь другая: позвать
              друзей в комнату, рассказать о сервисе и написать, что сломалось или чего не хватает.
            </p>
            <p className="text-cream-dim">
              Если хочется помочь кодом, загляните в{' '}
              <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
                issues на GitHub
              </a>
              .
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection label="Контакты" title="Написать автору">
        <p>Вопросы, идеи, баги и обращения правообладателей принимаются здесь:</p>
        <ul className="grid gap-2 font-mono text-[15px]">
          <li>
            <span className="cw-label mr-3">Почта</span>
            <a href={`mailto:${CONTACT_EMAIL}`} className={TEXT_LINK}>
              {CONTACT_EMAIL}
            </a>
          </li>
          <li>
            <span className="cw-label mr-3">Telegram</span>
            <a href={CONTACT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
              @{CONTACT_TELEGRAM}
            </a>
          </li>
        </ul>
        <p className="text-cream-dim">
          Если вы правообладатель и считаете, что ссылка в какой-то комнате нарушает ваши права, напишите на почту с
          кодом комнаты. Как мы обращаемся с данными, описано в{' '}
          <Link to="/privacy" className={TEXT_LINK}>
            политике конфиденциальности
          </Link>
          .
        </p>
      </PageSection>
    </StaticPage>
  );
}
