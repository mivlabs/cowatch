export interface Room {
    id: string;
    code: string;
    host_id: number;
    title: string;
    is_private: boolean;
    max_participants: number;
    current_movie_url: string | null;
    current_movie_title: string | null;
    current_position: number;
    is_playing: boolean;
    created_at: string;
    participants_count: number;
  }
  
  export interface RoomCreate {
    title: string;
    is_private: boolean;
    max_participants: number;
  }