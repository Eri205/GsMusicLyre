import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Heart, 
  MoreVertical, 
  ListPlus, 
  Trash2, 
  Music,
  Sliders,
  Check
} from 'lucide-react';
import { Song, PlaybackState } from '../types';

interface TrackStripProps {
  song: Song;
  index: number;
  isCurrentSong: boolean;
  playbackState: PlaybackState;
  onPlaySong: (song: Song) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onAddToQueue: (song: Song) => void;
  onDeleteSong: (id: string) => void;
}

export const TrackStrip: React.FC<TrackStripProps> = React.memo(({
  song,
  index,
  isCurrentSong,
  playbackState,
  onPlaySong,
  onToggleFavorite,
  onAddToQueue,
  onDeleteSong,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showQueuedNotice, setShowQueuedNotice] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPlaying = isCurrentSong && playbackState === 'PLAYING';

  // Format duration mm:ss
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Close context menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(true);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsMenuOpen(false);
      }}
      onContextMenu={handleContextMenu}
      onClick={() => onPlaySong(song)}
      className={`group relative w-full h-[52px] px-3 rounded-lg flex items-center justify-between transition-all duration-150 cursor-pointer select-none mb-0.5 ${
        isCurrentSong
          ? 'bg-white/[0.08] text-[#FFFFFF] border-l-2 border-[#FF4D6D] pl-3'
          : isHovered
          ? 'bg-white/[0.04] text-[#FFFFFF] border-l-2 border-transparent pl-3'
          : 'bg-transparent text-[#8E92A0] border-l-2 border-transparent pl-3'
      }`}
    >
      {/* Tactical Active Rounded Pill Indicator */}
      {isCurrentSong && (
        <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-[#FF4D6D] rounded-r-full" />
      )}

      {/* Left: Cover/Icon + Title + Artist */}
      <div className="flex items-center gap-3 min-w-0 pr-4 flex-1">
        {/* Cover / Play Swap Icon Box */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onPlaySong(song);
          }}
          className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-all border ${
            isCurrentSong
              ? 'bg-[#FF4D6D]/15 border-[#FF4D6D]/30 text-[#FF4D6D]'
              : 'bg-[#161822] border-white/[0.06] text-[#8E92A0] group-hover:border-white/20 group-hover:text-[#FFFFFF]'
          }`}
        >
          {isPlaying ? (
            isHovered ? (
              <Pause size={14} fill="currentColor" />
            ) : (
              /* Mini Equalizer Waveform Animation (3 bars jumping) */
              <div className="flex items-end justify-center gap-[2.5px] h-3.5" title="Đang phát nhạc">
                <span className="w-[2.5px] bg-[#FF4D6D] rounded-full animate-eq-1" />
                <span className="w-[2.5px] bg-[#FF4D6D] rounded-full animate-eq-2" />
                <span className="w-[2.5px] bg-[#FF4D6D] rounded-full animate-eq-3" />
              </div>
            )
          ) : isHovered ? (
            <Play size={14} fill="currentColor" className="ml-0.5 text-white" />
          ) : isCurrentSong ? (
            <Play size={14} fill="currentColor" className="ml-0.5 text-[#FF4D6D]" />
          ) : (
            <>
              <Music size={15} strokeWidth={1.8} className="group-hover:hidden text-[#8E92A0]" />
              <Play size={14} fill="currentColor" className="hidden group-hover:block ml-0.5 text-white" />
            </>
          )}
        </div>

        {/* Title and Artist/Game subtitle */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs md:text-sm font-semibold truncate ${
              isCurrentSong ? 'text-[#FFFFFF]' : 'text-[#FFFFFF] group-hover:text-[#FFFFFF]'
            }`}>
              {song.title}
            </span>
            {/* Live Waveform Equalizer Next to Title for Active Track */}
            {isCurrentSong && (
              <div className="flex items-end gap-[2px] h-3 shrink-0" title={isPlaying ? "Đang phát nhạc" : "Đang chọn bài này"}>
                <span className={`w-[2px] bg-[#FF4D6D] rounded-full ${isPlaying ? 'animate-eq-1' : 'h-1.5 opacity-80'}`} />
                <span className={`w-[2px] bg-[#FF4D6D] rounded-full ${isPlaying ? 'animate-eq-2' : 'h-3 opacity-100'}`} />
                <span className={`w-[2px] bg-[#FF4D6D] rounded-full ${isPlaying ? 'animate-eq-3' : 'h-2 opacity-80'}`} />
              </div>
            )}
          </div>
          <span className="text-[11px] text-[#8E92A0] truncate">
            {song.artist_or_game}
          </span>
        </div>
      </div>

      {/* Right: BPM & Key Tag + Duration + Heart + Context Menu 3-Dots */}
      <div className="flex items-center gap-3 shrink-0">
        {/* BPM & Key Tag Mỏng with enhanced text-zinc-200 contrast */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-zinc-200 font-medium tracking-tight">
            {song.bpm} BPM
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-zinc-200 font-medium tracking-tight hidden md:inline">
            {song.category}
          </span>
        </div>

        {/* Duration */}
        <span className="w-11 text-right text-[11px] font-mono text-zinc-400">
          {formatDuration(song.duration_seconds)}
        </span>

        {/* Heart Icon with Spring Micro-interaction (Hidden by default when not favorite, subtle on hover) */}
        <motion.button
          whileTap={{ scale: 0.8 }}
          animate={{ scale: song.is_favorite ? [1, 1.3, 1] : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          onClick={(e) => onToggleFavorite(song.id, e)}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
            song.is_favorite
              ? 'text-[#FF4D6D] opacity-100'
              : 'opacity-0 group-hover:opacity-40 hover:!opacity-100 text-[#8E92A0] hover:!text-[#FFFFFF]'
          }`}
          title={song.is_favorite ? 'Bỏ thích' : 'Yêu thích'}
        >
          <Heart 
            size={15} 
            fill={song.is_favorite ? '#FF4D6D' : 'none'} 
            strokeWidth={1.8} 
          />
        </motion.button>

        {/* 3-Dots Menu Trigger */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(prev => !prev);
            }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#8E92A0] hover:text-[#FFFFFF] hover:bg-white/[0.08] transition-all cursor-pointer opacity-0 group-hover:opacity-100"
            title="Tùy chọn khác"
          >
            <MoreVertical size={14} />
          </button>

          {/* Floating Context Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.1 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-8 w-44 bg-[#141620] border border-white/[0.1] rounded-lg shadow-2xl p-1 z-50 flex flex-col gap-0.5 text-xs select-none"
              >
                <button
                  onClick={() => {
                    onAddToQueue(song);
                    setShowQueuedNotice(true);
                    setTimeout(() => {
                      setShowQueuedNotice(false);
                      setIsMenuOpen(false);
                    }, 1200);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[#FFFFFF] hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                >
                  {showQueuedNotice ? (
                    <>
                      <Check size={13} className="text-[#00F2FE]" />
                      <span className="text-[#00F2FE]">Đã thêm vào hàng đợi</span>
                    </>
                  ) : (
                    <>
                      <ListPlus size={13} className="text-[#8E92A0]" />
                      <span>Thêm vào hàng đợi</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onPlaySong(song);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[#FFFFFF] hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                >
                  <Play size={13} className="text-[#8E92A0]" />
                  <span>Phát ngay</span>
                </button>

                <div className="h-[1px] bg-white/[0.06] my-0.5" />

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDeleteSong(song.id);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[#FF8A9E] hover:bg-[#FF4D6D]/15 transition-colors cursor-pointer text-left"
                >
                  <Trash2 size={13} />
                  <span>Xóa khỏi thư viện</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});
