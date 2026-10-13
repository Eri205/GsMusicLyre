import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Play, Sliders, Layers, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Song } from '../types';

interface AiSessionBannerProps {
  onContinuePractice: (song: Song) => void;
  onAutoTuneMajor: () => void;
  onToggleOverlay: () => void;
  featuredSong: Song;
}

export const AiSessionBanner: React.FC<AiSessionBannerProps> = React.memo(({
  onContinuePractice,
  onAutoTuneMajor,
  onToggleOverlay,
  featuredSong,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isTuned, setIsTuned] = React.useState(false);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full mb-4 p-4 rounded-lg bg-[#11131A] border border-white/[0.08] relative overflow-hidden select-none"
      >
        {/* Subtle hairline tactical indicator on left */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#00F2FE] to-[#FF5376]" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Analysis Info */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-[#171922] border border-white/[0.08] flex items-center justify-center text-[#00F2FE] shrink-0 mt-0.5">
              <Sparkles size={16} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold tracking-wider text-[#00F2FE] uppercase">
                  AI SESSION ASSISTANT
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#090A0F] border border-white/[0.06] text-[#8E92A4]">
                  HABIT ANALYSIS
                </span>
              </div>

              <p className="text-xs text-[#F1F3F9] mt-0.5 font-normal leading-relaxed">
                Bạn thường luyện tập <span className="font-semibold text-[#FF5376]">&apos;{featuredSong.title}&apos;</span> ở{' '}
                <span className="font-mono text-[#00F2FE]">{featuredSong.bpm} BPM</span> (Độ chuẩn xác 88%). 
                Phát hiện <span className="text-white font-medium">Genshin Impact</span> đang chạy, bạn muốn tiếp tục?
              </p>
            </div>
          </div>

          {/* Context-Aware Smart Action Buttons */}
          <div className="flex items-center flex-wrap gap-2 shrink-0 pl-11 lg:pl-0">
            {/* Primary Action Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onContinuePractice(featuredSong)}
              className="px-3 py-1.5 rounded-md bg-[#171922] border border-[#00F2FE]/40 hover:border-[#00F2FE] text-[#00F2FE] hover:bg-[#00F2FE]/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play size={13} fill="currentColor" />
              <span>Tiếp tục bài tập ({featuredSong.bpm} BPM)</span>
            </motion.button>

            {/* Smart Auto-Tune CTA */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onAutoTuneMajor();
                setIsTuned(true);
                setTimeout(() => setIsTuned(false), 2500);
              }}
              className="px-3 py-1.5 rounded-md bg-[#171922] border border-white/[0.08] hover:border-white/20 text-[#8E92A4] hover:text-[#F1F3F9] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isTuned ? (
                <>
                  <CheckCircle2 size={13} className="text-[#00F2FE]" />
                  <span className="text-[#00F2FE]">Đã Tune C Major</span>
                </>
              ) : (
                <>
                  <Sliders size={13} />
                  <span>Auto-Tune về C Major</span>
                </>
              )}
            </motion.button>

            {/* In-Game Overlay Quick Toggle */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onToggleOverlay}
              className="px-2.5 py-1.5 rounded-md bg-[#171922] border border-white/[0.08] hover:border-white/20 text-[#8E92A4] hover:text-[#F1F3F9] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers size={13} />
              <span>Bật Overlay [F11]</span>
            </motion.button>

            {/* Dismiss Button */}
            <button
              onClick={() => setIsVisible(false)}
              className="w-6 h-6 rounded flex items-center justify-center text-[#525666] hover:text-[#8E92A4] transition-colors ml-1"
              title="Dismiss banner"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
