import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Sliders
} from 'lucide-react';
import { Song, PlaybackState, InstrumentType } from '../types';

interface BottomPlayerBarProps {
  currentSong: Song | null;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  speed: number;
  transpose: number;
  volume: number;
  isMuted: boolean;
  instrument: InstrumentType;
  isLooping: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onTransposeChange: (transpose: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleLoop: () => void;
  onInstrumentChange: (inst: InstrumentType) => void;
}

export const BottomPlayerBar: React.FC<BottomPlayerBarProps> = React.memo(({
  currentSong,
  playbackState,
  currentTime,
  duration,
  speed,
  transpose,
  volume,
  isMuted,
  instrument,
  isLooping,
  onPlayPause,
  onStop,
  onPrev,
  onNext,
  onSeek,
  onSpeedChange,
  onTransposeChange,
  onVolumeChange,
  onToggleMute,
  onToggleLoop,
  onInstrumentChange,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isPlaying = playbackState === 'PLAYING';
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPercent = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(newPercent * duration);
  };

  // Live waveform micro-visualizer
  const [visualizerBars, setVisualizerBars] = useState<number[]>([2, 3, 2, 4, 3, 5, 2]);

  useEffect(() => {
    if (!isPlaying) {
      setVisualizerBars([2, 2, 2, 2, 2, 2, 2]);
      return;
    }
    const interval = setInterval(() => {
      setVisualizerBars(prev => prev.map(() => Math.floor(Math.random() * 10) + 2));
    }, 110);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <footer className="h-[72px] min-h-[72px] bg-[#12131A] border-t border-white/[0.08] px-5 flex flex-col justify-between select-none relative z-40">
      {/* Top Thin Seekbar */}
      <div 
        ref={progressBarRef}
        onClick={handleProgressBarClick}
        className="absolute -top-[2px] left-0 right-0 h-[3px] hover:h-[5px] cursor-pointer group z-50 bg-transparent transition-all"
      >
        <div className="w-full h-full bg-[#181A24] relative overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#00F2FE] to-[#FF4D6D] transition-all duration-75 relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Main Bar Content: Symmetrical 3-Column Layout */}
      <div className="w-full h-full flex items-center justify-between gap-6 pt-1">
        {/* Left Section: Track Info (~240px) */}
        <div className="flex items-center gap-3 w-[240px] min-w-0 shrink-0">
          {/* Animated Waveform Bars */}
          <div 
            className="w-8 h-8 rounded-md bg-[#181A24] border border-white/[0.06] flex items-center justify-center gap-[1.5px] px-1 shrink-0"
            title="Frequency Visualizer"
          >
            {visualizerBars.map((height, idx) => (
              <span
                key={idx}
                className={`w-[2px] rounded-full transition-all duration-100 ${
                  isPlaying ? 'bg-[#FF4D6D]' : 'bg-[#5A5E70]'
                }`}
                style={{ height: `${height * 1.8}px` }}
              />
            ))}
          </div>

          {/* Title & Artist */}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-[#FFFFFF] truncate">
              {currentSong ? currentSong.title : 'Ready to Play'}
            </span>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#8E92A0]">
              <span className="truncate">{currentSong ? currentSong.artist_or_game : 'GsMusicLyre OLED'}</span>
              {currentSong && (
                <span className="text-[10px] text-[#00F2FE] shrink-0 font-mono">
                  {currentSong.bpm}BPM
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center Section: Symmetrical Playback Controls */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="flex items-center gap-3">
            {/* Loop Toggle */}
            <button
              onClick={onToggleLoop}
              className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
                isLooping ? 'text-[#00F2FE]' : 'text-[#5A5E70] hover:text-[#FFFFFF]'
              }`}
              title={`Loop: ${isLooping ? 'BẬT' : 'TẮT'}`}
            >
              <Repeat size={13} />
            </button>

            {/* Prev Track */}
            <button
              onClick={onPrev}
              className="w-7 h-7 rounded flex items-center justify-center text-[#8E92A0] hover:text-[#FFFFFF] transition-colors cursor-pointer"
              title="Bài trước"
            >
              <SkipBack size={15} />
            </button>

            {/* Play / Pause Tactile Pill */}
            <button
              onClick={onPlayPause}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                isPlaying
                  ? 'bg-[#FF4D6D] text-[#FFFFFF] hover:bg-[#FF6B85]'
                  : 'bg-[#FFFFFF] text-[#090A0F] hover:bg-white/90'
              }`}
              title={isPlaying ? 'Tạm dừng' : 'Phát'}
            >
              {isPlaying ? (
                <Pause size={15} fill="currentColor" />
              ) : (
                <Play size={15} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            {/* Stop Track */}
            <button
              onClick={onStop}
              className="w-7 h-7 rounded flex items-center justify-center text-[#8E92A0] hover:text-[#FF4D6D] transition-colors cursor-pointer"
              title="Dừng phát (F10)"
            >
              <Square size={13} fill="currentColor" />
            </button>

            {/* Next Track */}
            <button
              onClick={onNext}
              className="w-7 h-7 rounded flex items-center justify-center text-[#8E92A0] hover:text-[#FFFFFF] transition-colors cursor-pointer"
              title="Bài tiếp theo"
            >
              <SkipForward size={15} />
            </button>
          </div>

          {/* Time Metrics readout */}
          <div className="text-[10px] font-mono text-[#8E92A0] tracking-tight">
            <span>{formatTime(currentTime)}</span>
            <span className="text-[#5A5E70] mx-1">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Section: Transpose, Speed, Volume (~260px) */}
        <div className="flex items-center justify-end gap-2.5 w-[260px] shrink-0">
          {/* Target Instrument Toggle Pill */}
          <button
            onClick={() => {
              if (instrument === 'genshin') onInstrumentChange('sky');
              else if (instrument === 'sky') onInstrumentChange('sky_steam');
              else onInstrumentChange('genshin');
            }}
            className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-md bg-[#181A24] border border-white/[0.08] hover:border-white/20 text-[10px] font-mono transition-colors cursor-pointer"
            title="Đổi loại nhạc cụ mục tiêu: Genshin (21K) / Sky CotL (15K) / Sky Steam"
          >
            <span className={instrument.startsWith('sky') ? 'text-[#00F2FE]' : 'text-[#FF4D6D]'}>
              {instrument === 'genshin' ? 'Genshin 21K' : instrument === 'sky' ? 'Sky 15K' : 'Sky Steam'}
            </span>
          </button>

          {/* Pitch Transpose (-12 to +12) */}
          <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-[#181A24] border border-white/[0.08] text-[11px] font-mono">
            <span className="text-[#8E92A0] flex items-center gap-1 text-[10px]">
              <Sliders size={11} /> Pitch:
            </span>
            <button 
              onClick={() => onTransposeChange(Math.max(-12, transpose - 1))}
              className="w-4 h-4 rounded text-center text-[#8E92A0] hover:text-white cursor-pointer"
            >
              -
            </button>
            <span className={`w-5 text-center font-semibold ${transpose !== 0 ? 'text-[#00F2FE]' : 'text-[#FFFFFF]'}`}>
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
            <button 
              onClick={() => onTransposeChange(Math.min(12, transpose + 1))}
              className="w-4 h-4 rounded text-center text-[#8E92A0] hover:text-white cursor-pointer"
            >
              +
            </button>
          </div>

          {/* Playback Speed Chips */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono">
            {[0.8, 1.0, 1.2].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  speed === s
                    ? 'bg-[#181A24] border border-white/20 text-[#00F2FE]'
                    : 'text-[#8E92A0] hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Volume Slider & Mute Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="text-[#8E92A0] hover:text-[#FFFFFF] transition-colors cursor-pointer"
              title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
            >
              {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-[#181A24] rounded-lg appearance-none cursor-pointer accent-[#FF4D6D]"
            />
          </div>
        </div>
      </div>
    </footer>
  );
});
