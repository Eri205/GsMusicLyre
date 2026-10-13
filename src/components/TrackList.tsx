import React from 'react';
import { Song, PlaybackState } from '../types';
import { TrackStrip } from './TrackStrip';
import { QuickSuggestionBar } from './QuickSuggestionBar';
import { Disc3 } from 'lucide-react';

interface TrackListProps {
  songs: Song[];
  isLoading: boolean;
  currentSong: Song | null;
  playbackState: PlaybackState;
  onPlaySong: (song: Song) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onAddToQueue: (song: Song) => void;
  onDeleteSong: (id: string) => void;
  onPractice: (song: Song) => void;
  onAutoTuneMajor: () => void;
  featuredSong: Song;
}

export const TrackList: React.FC<TrackListProps> = React.memo(({
  songs,
  isLoading,
  currentSong,
  playbackState,
  onPlaySong,
  onToggleFavorite,
  onAddToQueue,
  onDeleteSong,
  onPractice,
  onAutoTuneMajor,
  featuredSong,
}) => {
  return (
    <main className="flex-1 h-full bg-[#090A0F] px-6 py-4 overflow-y-auto select-none flex flex-col">
      {/* Sleek Slim Quick Suggestion Bar Chip */}
      <QuickSuggestionBar
        featuredSong={featuredSong}
        onPractice={onPractice}
        onAutoTuneMajor={onAutoTuneMajor}
      />

      {/* Loading Skeleton Shimmer State */}
      {isLoading ? (
        <div className="flex flex-col gap-1 w-full">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="w-full h-[52px] rounded-lg px-3 flex items-center justify-between bg-[#12131A] skeleton-shimmer"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-md bg-white/[0.05]" />
                <div className="flex flex-col gap-1.5 flex-1 max-w-[220px]">
                  <div className="w-3/4 h-3 rounded bg-white/[0.08]" />
                  <div className="w-1/2 h-2.5 rounded bg-white/[0.04]" />
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <div className="w-16 h-3 rounded bg-white/[0.05]" />
                <div className="w-10 h-3 rounded bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      ) : songs.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-[#5A5E70]">
          <Disc3 size={32} className="stroke-1 mb-2 opacity-40 text-[#8E92A0]" />
          <p className="text-xs font-medium text-[#8E92A0]">Không tìm thấy bài hát phù hợp</p>
          <span className="text-[11px] text-[#5A5E70] mt-0.5">Nhấn phím / để tìm bài hát khác hoặc chọn danh mục khác</span>
        </div>
      ) : (
        /* Spotify / Linear Style List Row Cards */
        <div className="flex flex-col w-full pb-20">
          {songs.map((song, index) => (
            <TrackStrip
              key={song.id}
              song={song}
              index={index}
              isCurrentSong={currentSong?.id === song.id}
              playbackState={playbackState}
              onPlaySong={onPlaySong}
              onToggleFavorite={onToggleFavorite}
              onAddToQueue={onAddToQueue}
              onDeleteSong={onDeleteSong}
            />
          ))}
        </div>
      )}
    </main>
  );
});
