interface AvatarProps {
    username: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }
  
  export function Avatar({ username, size = 'md' }: AvatarProps) {
    // Получаем инициалы (первые 2 буквы)
    const getInitials = (name: string) => {
      const cleanName = name.split('@')[0]; // Убираем домен почты, если есть
      return cleanName.substring(0, 2).toUpperCase();
    };
  
    // Генерируем детерминированный цвет на основе имени (чтобы у "traqmaris" всегда был один цвет)
    const getColor = (name: string) => {
      const colors = [
        'bg-gold/15 text-gold border-gold/40',
        'bg-cream/10 text-cream border-cream/30',
        'bg-ultra/60 text-cream border-ultra',
      ];
      
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };
  
    const sizeClasses = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
      xl: 'w-[72px] h-[72px] text-xl',
    };
  
    return (
      <div className={`flex items-center justify-center rounded-full font-mono font-medium border ${sizeClasses[size]} ${getColor(username)} shrink-0`}>
        {getInitials(username)}
      </div>
    );
  }