import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Film, Users, Lock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function CreateRoomPage() {
  const [title, setTitle] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [isPrivate, setIsPrivate] = useState(false);
  const navigate = useNavigate();

  const createRoomMutation = useMutation({
    mutationFn: async (data: { title: string; max_participants: number; is_private: boolean }) => {
      const response = await api.post('/rooms/', data);
      return response.data;
    },
    onSuccess: (data) => {
      navigate(`/room/${data.code}`);
    },
    onError: (err: any) => {
      console.error('Ошибка создания комнаты:', err);
      alert('Не удалось создать комнату');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createRoomMutation.mutate({
        title: title.trim(),
        max_participants: maxParticipants,
        is_private: isPrivate,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-muted/30 backdrop-blur-md border border-white/10 rounded-2xl p-8"
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        <h1 className="text-3xl font-bold mb-2">Создать комнату</h1>
        <p className="text-muted-foreground mb-6">Настрой параметры для совместного просмотра</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              <Film className="w-4 h-4 inline mr-2" />
              Название комнаты
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Вечер с друзьями"
              required
              maxLength={50}
              className="w-full px-4 py-3 bg-background border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Максимум участников: {maxParticipants}
            </label>
            <input
              type="range"
              min="2"
              max="50"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-background border border-white/10 rounded-xl">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Приватная комната</p>
                <p className="text-sm text-muted-foreground">Только по коду</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <button
            type="submit"
            disabled={createRoomMutation.isPending || !title.trim()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createRoomMutation.isPending ? 'Создаю...' : 'Создать комнату'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}