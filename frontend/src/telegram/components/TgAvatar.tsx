import { Avatar } from '@/components/Avatar';
import { cn } from '@/lib/utils';
import type { TelegramWebAppUser } from '@/lib/telegram';

interface TgAvatarProps {
  tgUser: TelegramWebAppUser | null;
  /** Falls back to initials of this name when Telegram gives no photo. */
  fallbackName: string;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASS = { md: 'size-10', lg: 'size-12', xl: 'size-[72px]' } as const;

/** Telegram profile photo when available, otherwise the site's initials avatar. */
export function TgAvatar({ tgUser, fallbackName, size = 'md', className }: TgAvatarProps) {
  if (tgUser?.photo_url) {
    return (
      <img
        src={tgUser.photo_url}
        alt=""
        referrerPolicy="no-referrer"
        className={cn('shrink-0 rounded-full border border-line object-cover', SIZE_CLASS[size], className)}
      />
    );
  }
  return (
    <div className={className}>
      <Avatar username={tgUser?.first_name || fallbackName} size={size} />
    </div>
  );
}
