export interface Song {
  id: string;
  title: string;
  artist_or_game: string;
  category: 'Genshin Impact' | 'Sky: CotL' | 'Anime & OST' | 'Classical' | 'Pop / Meme' | string;
  bpm: number;
  duration_seconds: number;
  note_count: number;
  recommended_transpose?: number;
  chords?: [number, string[]][];
  is_favorite?: boolean;
  is_custom?: boolean;
  difficulty?: 'Beginner' | 'Intermediate' | 'Expert' | 'Master';
  accuracy?: number;
}

export type ActiveNavTab = 'library' | 'lyre' | 'sky_harp' | 'mixer' | 'ai_hub' | 'settings';

export type CategoryFilter = 'all' | 'genshin' | 'sky' | 'anime' | 'classical' | 'pop' | 'favorites';

export type QuickFilterTag = 'all' | 'genshin' | 'sky' | 'fast' | 'beginner' | 'favorites';

export type InstrumentType = 'genshin' | 'sky' | 'sky_steam' | 'vintage';

export type PlaybackState = 'STOPPED' | 'PLAYING' | 'PAUSED';

export interface AiSessionInsight {
  songId: string;
  songTitle: string;
  artist: string;
  suggestedBpm: number;
  suggestedTranspose: number;
  practiceAccuracy: number;
  recentSessionsCount: number;
  contextText: string;
  detectedGame: string;
  targetBpm: number;
}
