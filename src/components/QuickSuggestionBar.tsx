import React, { useState } from 'react';
import { Sparkles, Play, Sliders, X } from 'lucide-react';
import { Song } from '../types';

interface QuickSuggestionBarProps {
  featuredSong: Song;
  onPractice: (song: Song) => void;
  onAutoTuneMajor: () => void;
}

export const QuickSuggestionBar: React.FC<QuickSuggestionBarProps> = React.memo(({
  featuredSong,
  onPractice,
  onAutoTuneMajor,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="w-full mb-3 px-3 py-1.5 rounded-lg bg-[#12131A] border border-white/[0.08] flex items-center justify-between gap-3 text-xs select-none">
      {/* Left: Suggestion Insight Text */}
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles size={13} className="text-[#00F2FE] shrink-0" />
        <span className="text-[11px] font-mono text-[#8E92A0] uppercase shrink-0">
          Gợi ý:
        </span>
        <span className="text-xs text-[#FFFFFF] font-medium truncate">
          {featuredSong.title}
        </span>
        <span className="text-[11px] font-mono text-[#8E92A0] shrink-0 hidden sm:inline">
          · {featuredSong.bpm} BPM · 88% Acc
        </span>
      </div>

      {/* Right: Quick Action Chips */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onPractice(featuredSong)}
          className="px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-[#FF4D6D]/15 hover:text-[#FF4D6D] border border-white/[0.08] text-[11px] font-medium text-[#FFFFFF] flex items-center gap-1 transition-all cursor-pointer"
        >
          <Play size={10} fill="currentColor" />
          <span>Luyện tập</span>
        </button>

        <button
          onClick={onAutoTuneMajor}
          className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] font-mono text-[#8E92A0] hover:text-[#FFFFFF] flex items-center gap-1 transition-all cursor-pointer hidden md:flex"
          title="Auto-Tune C Major"
        >
          <Sliders size={10} />
          <span>C Major</span>
        </button>

        <button
          onClick={() => setIsVisible(false)}
          className="w-5 h-5 rounded flex items-center justify-center text-[#5A5E70] hover:text-[#8E92A0] transition-colors"
          title="Đóng gợi ý"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
});
