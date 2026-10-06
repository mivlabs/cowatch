"""Все тексты бота в одном месте. HTML-разметка Telegram, пользовательские
строки (названия комнат, имена) экранируются через html.escape."""
from html import escape

BOT_NAME = "CoWatch"


def _plural(n: int, forms: tuple[str, str, str]) -> str:
    mod10, mod100 = n % 10, n % 100
    if mod10 == 1 and mod100 != 11:
        return forms[0]
    if 2 <= mod10 <= 4 and not 12 <= mod100 <= 14:
        return forms[1]
    return forms[2]


def _mention(bot_username: str | None) -> str:
    """@cowatchfun_bot в текстах; пока имя не известно — просто «@бот»."""
    name = (bot_username or "").strip().lstrip("@")
    return f"@{escape(name)}" if name else "@бот"


def welcome(first_name: str | None, bot_username: str | None = None) -> str:
    name = escape((first_name or "").strip()) or "друг"
    return (
        f"Привет, {name}! Это {BOT_NAME} — совместный просмотр видео с друзьями: "
        "общий плеер, синхронная перемотка, чат и реакции.\n\n"
        "Открой приложение кнопкой ниже, создай комнату и отправь друзьям код. "
        "Или прямо здесь: /new — новая комната, /join КОД — зайти по коду.\n\n"
        f"Подсказка: напиши в любом чате {_mention(bot_username)} и код комнаты, "
        "чтобы отправить приглашение."
    )


def help_text(bot_username: str | None = None) -> str:
    return (
        f"<b>Что умеет {BOT_NAME}</b>\n\n"
        "/new <i>название</i> — создать комнату и получить код\n"
        "/join <i>КОД</i> — открыть комнату по коду\n"
        "/profile — наклейки и часы в зале\n"
        "/app — открыть приложение\n\n"
        "Можно просто прислать код комнаты сообщением.\n"
        f"В любом чате: {_mention(bot_username)} КОД — отправить друзьям приглашение.\n\n"
        "Бот напишет, когда к тебе в комнату кто-то зайдёт и когда появится новая наклейка."
    )


def default_room_title(first_name: str | None) -> str:
    name = (first_name or "").strip()
    return f"Вечер с {name}"[:100] if name else "Вечер кино"


def room_card(room: dict, *, created: bool = False) -> str:
    title = escape(str(room.get("title") or "Комната"))
    code = escape(str(room.get("code") or ""))
    count = int(room.get("participants_count") or 0)
    limit = int(room.get("max_participants") or 0)
    head = "Комната готова" if created else "Комната найдена"
    lines = [f"<b>{head}</b>", "", f"🎬 {title}", f"Код: <code>{code}</code>"]
    if limit:
        lines.append(f"В зале {count} из {limit}")
    movie = (room.get("current_movie_title") or "").strip()
    if movie and movie != room.get("title"):
        lines.append(f"Сейчас: {escape(movie)}")
    lines.append("")
    lines.append(
        "Открой комнату и вставь ссылку на видео, а код отправь друзьям — они зайдут в один клик."
        if created
        else "Нажми «Открыть комнату», чтобы зайти."
    )
    return "\n".join(lines)


def room_not_found(code: str) -> str:
    return f"Комнаты с кодом <code>{escape(code)}</code> нет. Проверь код: в нём не бывает букв O и I и цифр 0 и 1."


def ask_for_code() -> str:
    return "Пришли код комнаты — шесть букв и цифр, например <code>ABC234</code>. Или /new, чтобы создать свою."


def unknown_text_hint() -> str:
    return (
        "Не нашла здесь кода комнаты. Пришли код из шести символов, "
        "или /new — создам новую комнату."
    )


def api_error() -> str:
    return "CoWatch сейчас не отвечает. Попробуй ещё раз через минуту."


def invite_message(room: dict, link: str) -> str:
    """Текст приглашения, которое уходит в чужой чат (inline-режим, кнопка «Пригласить»)."""
    title = escape(str(room.get("title") or "Комната"))
    code = escape(str(room.get("code") or ""))
    return (
        f"🎬 Зову смотреть вместе: <b>{title}</b>\n"
        f"Код комнаты: <code>{code}</code>\n"
        f"{escape(link)}"
    )


def invite_share_text(room: dict) -> str:
    """Короткий текст для t.me/share/url — там своя ссылка, разметки нет."""
    title = str(room.get("title") or "Комната")
    code = str(room.get("code") or "")
    return f"Зову смотреть вместе: {title}. Код комнаты {code}"


def joined_notification(room_title: str | None, code: str, guest_name: str, participants_count: int | None) -> str:
    where = f"«{escape(room_title)}»" if room_title else f"комнату {escape(code)}"
    text = f"👋 {escape(guest_name)} зашёл в {where}."
    if participants_count:
        text += f" В зале {participants_count} {_plural(participants_count, ('зритель', 'зрителя', 'зрителей'))}."
    return text


def achievement_notification(title: str | None, icon: str | None) -> str:
    sticker = escape(title or "новая наклейка")
    prefix = f"{icon} " if icon else ""
    return f"{prefix}Новая наклейка: <b>{sticker}</b>\nОна уже в твоём профиле."


def profile_summary(profile: dict) -> str:
    username = escape(str(profile.get("username") or ""))
    achievements = profile.get("achievements") or []
    earned = sum(1 for a in achievements if a.get("unlocked_at"))
    total = len(achievements)
    movies = int(profile.get("total_movies") or 0)
    hours = float(profile.get("total_hours") or 0)
    hours_text = f"{hours:g}".replace(".", ",")
    lines = [
        f"<b>{username}</b>",
        "",
        f"🎞 Посмотрено: {movies} {_plural(movies, ('фильм', 'фильма', 'фильмов'))}",
        f"🕰 Вместе в зале: {hours_text} ч",
        f"⭐ Наклейки: {earned} из {total}",
    ]
    recent = [a for a in achievements if a.get("unlocked_at")]
    recent.sort(key=lambda a: a["unlocked_at"], reverse=True)
    if recent:
        lines.append("")
        lines.append("Последние:")
        for sticker in recent[:3]:
            lines.append(f"{sticker.get('icon', '')} {escape(str(sticker.get('title', '')))}".strip())
    return "\n".join(lines)


def inline_hint_title() -> str:
    return "Введи код комнаты"


def inline_hint_description(bot_username: str | None = None) -> str:
    return f"Например: {_mention(bot_username)} ABC234 — отправлю приглашение в этот чат"


def inline_not_found_title(code: str) -> str:
    return f"Комнаты {code} нет"


def inline_invite_title(room: dict) -> str:
    return f"Пригласить в «{room.get('title') or 'комнату'}»"


def inline_invite_description(room: dict) -> str:
    code = room.get("code") or ""
    count = int(room.get("participants_count") or 0)
    limit = int(room.get("max_participants") or 0)
    return f"Код {code} · в зале {count} из {limit}" if limit else f"Код {code}"
