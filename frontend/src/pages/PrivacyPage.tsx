import { StaticPage, PageSection } from '@/components/StaticPage';
import { CONTACT_EMAIL, CONTACT_TELEGRAM, CONTACT_TELEGRAM_URL } from '@/lib/contacts';

const TEXT_LINK = 'text-gold underline underline-offset-[3px] transition-colors hover:text-cream';

/** Which data the service keeps, where, for how long, and what the browser stores. Written to match the code. */
export function PrivacyPage() {
  return (
    <StaticPage
      label="Политика конфиденциальности · действует с 6 октября 2026"
      seed={152}
      title="Какие данные мы храним"
      lead="Коротко: минимум. Почта, имя и пароль при регистрации, история просмотров и наклейки. Сообщения чата на сервере не сохраняются. Cookies сайт не ставит, но хранит в браузере токен входа."
    >
      <PageSection label="Что и зачем" title="Какие данные собираются">
        <ul className="grid gap-3 pl-5 marker:text-cream-dim">
          <li>
            <strong>Аккаунт.</strong> Email, имя пользователя и пароль. Пароль хранится только в виде хеша, в открытом
            виде он не хранится и не передаётся. Нужны, чтобы вы могли войти и чтобы профиль был вашим.
          </li>
          <li>
            <strong>Гостевой вход.</strong> Только ник на время сессии. Аккаунт не создаётся, наклейки и история
            гостя не сохраняются.
          </li>
          <li>
            <strong>Комнаты.</strong> Название, код, ссылка на видео и его название, позиция плеера и кто сейчас в
            комнате. Без этого плеер не синхронизировать.
          </li>
          <li>
            <strong>Просмотры и активность.</strong> Название и ссылка досмотренного видео, длительность и время
            просмотра, а также счётчики созданных комнат, сообщений и реакций. Из них считаются наклейки, история в
            профиле и подборка «что посмотреть дальше».
          </li>
          <li>
            <strong>Чат и реакции.</strong> Передаются участникам комнаты в реальном времени и на сервере не
            сохраняются. Сохраняется только их количество, для наклеек.
          </li>
          <li>
            <strong>Технические данные.</strong> IP-адрес, тип браузера и время запросов попадают в логи
            хостинг-провайдеров, как у любого сайта. Отдельно мы их не собираем и не анализируем.
          </li>
        </ul>
      </PageSection>

      <PageSection label="Где" title="Где это хранится">
        <p>
          Базы данных и сервисы CoWatch работают у хостинг-провайдеров Railway и Vercel, их серверы находятся за
          пределами России. Доступ к базам есть только у администратора сервиса. Данные не продаются и не передаются
          для рекламы.
        </p>
      </PageSection>

      <PageSection label="Cookies" title="Cookies и хранилище браузера">
        <p>Сам CoWatch cookies не использует. В localStorage вашего браузера сохраняются:</p>
        <ul className="grid gap-2 pl-5 marker:text-cream-dim">
          <li>токен входа и данные профиля, чтобы не входить заново при каждом открытии;</li>
          <li>список наклеек, которые вы уже видели в профиле;</li>
          <li>отметка о том, что вы закрыли уведомление о cookies.</li>
        </ul>
        <p>Всё это стирается при выходе из аккаунта или при очистке данных сайта в браузере.</p>
        <p>
          Встроенные плееры YouTube и Rutube, шрифты Google Fonts и постеры с серверов TMDB загружаются вашим
          браузером напрямую с серверов этих компаний. Они могут ставить свои cookies и видеть ваш IP-адрес по своим
          правилам:{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
            Google и YouTube
          </a>
          ,{' '}
          <a href="https://rutube.ru/info/agreement/" target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
            Rutube
          </a>
          ,{' '}
          <a href="https://www.themoviedb.org/privacy-policy" target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
            TMDB
          </a>
          .
        </p>
      </PageSection>

      <PageSection label="Сроки" title="Сколько хранится и как удалить">
        <p>
          Данные аккаунта хранятся, пока существует аккаунт. Чтобы удалить аккаунт вместе с историей и наклейками,
          напишите на почту с адреса, указанного при регистрации. Удалим в течение 30 дней и ответим, когда всё
          готово. Гостевые данные исчезают при выходе из комнаты.
        </p>
        <p>
          Таким же письмом можно запросить копию своих данных или исправить email и имя.
        </p>
      </PageSection>

      <PageSection label="Возраст" title="Кому предназначен сервис">
        <p>
          CoWatch не предназначен для детей младше 14 лет, и мы сознательно не собираем их данные. Если вы узнали,
          что ребёнок зарегистрировался, напишите нам, и аккаунт будет удалён.
        </p>
      </PageSection>

      <PageSection label="Изменения" title="Если политика изменится">
        <p>
          Дата вверху страницы показывает, с какого дня действует текущая редакция. При существенных изменениях мы
          предупредим об этом на сайте.
        </p>
      </PageSection>

      <PageSection label="Контакты" title="Куда писать">
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
      </PageSection>
    </StaticPage>
  );
}
