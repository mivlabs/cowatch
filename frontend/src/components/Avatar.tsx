interface AvatarProps {
    username: string;
    size?: 'sm' | 'md' | 'lg';
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
        'bg-purple-500/20 text-purple-300 border-purple-500/30',
        'bg-blue-500/20 text-blue-300 border-blue-500/30',
        'bg-pink-500/20 text-pink-300 border-pink-500/30',
        'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        'bg-amber-500/20 text-amber-300 border-amber-500/30',
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
    };
  
    return (
      <div className={`flex items-center justify-center rounded-full font-bold border ${sizeClasses[size]} ${getColor(username)} shrink-0`}>
        {getInitials(username)}
      </div>
    );
  }