import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Keyboard, 
  Save, 
  Check, 
  RotateCcw, 
  ShieldCheck, 
  Zap, 
  Play, 
  Square, 
  Pause,
  Sliders,
  Sparkles
} from 'lucide-react';

interface TacticalSettingsViewProps {
  onBackToLibrary?: () => void;
}

interface HotkeyState {
  play: string;
  stop: string;
  pause: string;
}

export const TacticalSettingsView: React.FC<TacticalSettingsViewProps> = React.memo(({
  onBackToLibrary
}) => {
  const [hotkeys, setHotkeys] = useState<HotkeyState>({
    play: '1',
    stop: '2',
    pause: '3'
  });

  const [listeningTarget, setListeningTarget] = useState<'play' | 'stop' | 'pause' | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Load hotkeys from backend on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.pywebview?.api?.get_hotkeys) {
      window.pywebview.api.get_hotkeys().then((data: any) => {
        if (data && typeof data === 'object') {
          setHotkeys({
            play: data.play || '1',
            stop: data.stop || '2',
            pause: data.pause || '3'
          });
        }
      }).catch((err: any) => {
        console.log('Error loading hotkeys:', err);
      });
    }
  }, []);

  // Format key label for display
  const formatKeyName = (key: string) => {
    if (!key) return 'NONE';
    if (key === ' ') return 'SPACE';
    if (key === '`') return 'TILDE (`)';
    if (key === '-') return 'MINUS (-)';
    if (key === '=') return 'EQUALS (=)';
    return key.toUpperCase();
  };

  // Listen to keyboard when capturing a hotkey
  useEffect(() => {
    if (!listeningTarget) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let capturedKey = e.key.toLowerCase();
      if (e.code === 'Space') capturedKey = 'space';
      else if (e.code === 'Minus' || e.key === '-') capturedKey = '-';
      else if (e.code === 'Equal' || e.key === '=') capturedKey = '=';
      else if (e.code === 'Backquote' || e.key === '`') capturedKey = '`';
      else if (e.key.length === 1) capturedKey = e.key.toLowerCase();
      else if (e.key.startsWith('F') && !isNaN(Number(e.key.slice(1)))) capturedKey = e.key.toLowerCase();
      else if (e.key === 'Escape') {
        setListeningTarget(null);
        return;
      }

      setHotkeys(prev => ({
        ...prev,
        [listeningTarget]: capturedKey
      }));

      setListeningTarget(null);
      setIsSaved(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listeningTarget]);

  // Apply Quick Presets
  const applyPreset = (play: string, stop: string, pause: string, name: string) => {
    setHotkeys({ play, stop, pause });
    setIsSaved(false);
    setStatusMessage(`Đã chọn bộ phím: ${name}. Nhấn "Lưu Cài Đặt" để áp dụng.`);
  };

  // Save hotkeys to backend
  const handleSave = useCallback(async () => {
    if (typeof window !== 'undefined' && window.pywebview?.api?.save_hotkeys) {
      try {
        const res = await window.pywebview.api.save_hotkeys(hotkeys.play, hotkeys.stop, hotkeys.pause);
        if (res && res.success) {
          setIsSaved(true);
          setStatusMessage(`✅ Đã lưu thành công: [${formatKeyName(hotkeys.play)}] Play • [${formatKeyName(hotkeys.stop)}] Stop`);
          setTimeout(() => setIsSaved(false), 3500);
        } else {
          setStatusMessage('Lỗi: Không thể lưu phím nóng vào backend.');
        }
      } catch (err) {
        setStatusMessage('Lỗi khi gửi yêu cầu lưu phím nóng.');
      }
    } else {
      setIsSaved(true);
      setStatusMessage(`✅ Đã lưu cấu hình: [${formatKeyName(hotkeys.play)}] Play • [${formatKeyName(hotkeys.stop)}] Stop (Web Mode)`);
      setTimeout(() => setIsSaved(false), 3500);
    }
  }, [hotkeys]);

  return (
    <main className="flex-1 h-full bg-[#090A0F] p-6 overflow-y-auto select-none flex flex-col items-center">
      <div className="w-full max-w-[760px] flex flex-col gap-6">
        {/* Title Header */}
        <div className="flex flex-col gap-1.5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF4D6D]/15 border border-[#FF4D6D]/30 flex items-center justify-center text-[#FF4D6D]">
              <Keyboard size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Cài Đặt Phím Nóng (In-Game Hotkeys)
              </h2>
              <p className="text-xs text-[#8E92A0]">
                Điều khiển phát nhạc tức thì khi đang ở trong Genshin Impact hoặc Sky: Children of the Light mà không cần chuyển cửa sổ.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Presets Section */}
        <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-[#11131A] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Zap size={14} className="text-[#00F2FE]" />
              Bộ Phím Mẫu Tiện Lợi (Quick Presets)
            </span>
            <span className="text-[10px] font-mono text-[#5A5E70]">Click để chọn nhanh</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => applyPreset('1', '2', '3', 'Phím số 1 - 2 - 3')}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                hotkeys.play === '1' && hotkeys.stop === '2'
                  ? 'bg-white/[0.08] border-[#00F2FE]/40 text-white'
                  : 'bg-[#161822] border-white/[0.06] text-[#8E92A0] hover:text-white hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Phím số 1 • 2 • 3</span>
                <span className="text-[10px] font-mono text-[#00F2FE]">Mặc định</span>
              </div>
              <span className="text-[11px] text-[#8E92A0]">
                Play: [1] • Stop: [2] • Pause: [3]
              </span>
            </button>

            <button
              onClick={() => applyPreset('f8', 'f10', 'f9', 'Phím Function F8 - F10')}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                hotkeys.play === 'f8' && hotkeys.stop === 'f10'
                  ? 'bg-white/[0.08] border-[#00F2FE]/40 text-white'
                  : 'bg-[#161822] border-white/[0.06] text-[#8E92A0] hover:text-white hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Phím F8 • F10</span>
                <span className="text-[10px] font-mono text-[#8E92A0]">Function</span>
              </div>
              <span className="text-[11px] text-[#8E92A0]">
                Play: [F8] • Stop: [F10] • Pause: [F9]
              </span>
            </button>

            <button
              onClick={() => applyPreset('`', '-', '=', 'Phím Tilde & Trừ')}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                hotkeys.play === '`' && hotkeys.stop === '-'
                  ? 'bg-white/[0.08] border-[#00F2FE]/40 text-white'
                  : 'bg-[#161822] border-white/[0.06] text-[#8E92A0] hover:text-white hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Phím ` (Tilde) • -</span>
                <span className="text-[10px] font-mono text-[#8E92A0]">Góc trái</span>
              </div>
              <span className="text-[11px] text-[#8E92A0]">
                Play: [`] • Stop: [-] • Pause: [=]
              </span>
            </button>
          </div>
        </div>

        {/* Hotkey Inputs Customization List */}
        <div className="flex flex-col gap-3">
          {/* 1. Play / Resume / Pause Hotkey */}
          <div className="p-4 rounded-xl bg-[#11131A] border border-white/[0.08] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#00F2FE]/15 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] shrink-0">
                <Play size={16} fill="currentColor" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  Phát / Tạm dừng (Play / Resume / Pause)
                </span>
                <span className="text-[11px] text-[#8E92A0]">
                  Bắt đầu phát bài hát đang chọn hoặc tạm dừng ngay trong khi đang chơi game.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-lg bg-[#181A24] border border-white/10 text-xs font-mono font-bold text-[#00F2FE] min-w-[54px] text-center">
                {listeningTarget === 'play' ? (
                  <span className="animate-pulse text-[#FF4D6D]">Gõ phím...</span>
                ) : (
                  formatKeyName(hotkeys.play)
                )}
              </div>
              <button
                onClick={() => setListeningTarget(listeningTarget === 'play' ? null : 'play')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  listeningTarget === 'play'
                    ? 'bg-[#FF4D6D] border-[#FF4D6D] text-white'
                    : 'bg-[#181A24] border-white/[0.08] hover:border-white/20 text-white'
                }`}
              >
                {listeningTarget === 'play' ? 'Đang chờ...' : 'Đổi phím'}
              </button>
            </div>
          </div>

          {/* 2. Stop / Panic Hotkey */}
          <div className="p-4 rounded-xl bg-[#11131A] border border-white/[0.08] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FF4D6D]/15 border border-[#FF4D6D]/30 flex items-center justify-center text-[#FF4D6D] shrink-0">
                <Square size={15} fill="currentColor" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  Dừng hẳn bài hát (Stop / Reset / Panic)
                </span>
                <span className="text-[11px] text-[#8E92A0]">
                  Dừng phát nhạc tức thì, trả lại quyền điều khiển bàn phím và tua về đầu bài.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-lg bg-[#181A24] border border-white/10 text-xs font-mono font-bold text-[#FF4D6D] min-w-[54px] text-center">
                {listeningTarget === 'stop' ? (
                  <span className="animate-pulse text-[#FF4D6D]">Gõ phím...</span>
                ) : (
                  formatKeyName(hotkeys.stop)
                )}
              </div>
              <button
                onClick={() => setListeningTarget(listeningTarget === 'stop' ? null : 'stop')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  listeningTarget === 'stop'
                    ? 'bg-[#FF4D6D] border-[#FF4D6D] text-white'
                    : 'bg-[#181A24] border-white/[0.08] hover:border-white/20 text-white'
                }`}
              >
                {listeningTarget === 'stop' ? 'Đang chờ...' : 'Đổi phím'}
              </button>
            </div>
          </div>

          {/* 3. Pause Hotkey (Optional) */}
          <div className="p-4 rounded-xl bg-[#11131A] border border-white/[0.08] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-300 shrink-0">
                <Pause size={15} fill="currentColor" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  Tạm dừng riêng biệt (Pause Only)
                </span>
                <span className="text-[11px] text-[#8E92A0]">
                  Chỉ tạm dừng bài hát tại thời điểm hiện tại (tùy chọn phụ).
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-lg bg-[#181A24] border border-white/10 text-xs font-mono font-bold text-zinc-300 min-w-[54px] text-center">
                {listeningTarget === 'pause' ? (
                  <span className="animate-pulse text-[#FF4D6D]">Gõ phím...</span>
                ) : (
                  formatKeyName(hotkeys.pause)
                )}
              </div>
              <button
                onClick={() => setListeningTarget(listeningTarget === 'pause' ? null : 'pause')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  listeningTarget === 'pause'
                    ? 'bg-[#FF4D6D] border-[#FF4D6D] text-white'
                    : 'bg-[#181A24] border-white/[0.08] hover:border-white/20 text-white'
                }`}
              >
                {listeningTarget === 'pause' ? 'Đang chờ...' : 'Đổi phím'}
              </button>
            </div>
          </div>
        </div>

        {/* Save & Feedback Actions Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#11131A] border border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
            {statusMessage ? (
              <span className={statusMessage.startsWith('✅') ? 'text-[#00F2FE]' : 'text-zinc-300'}>
                {statusMessage}
              </span>
            ) : (
              <span className="text-[#8E92A0]">
                Nhấn "Lưu Cài Đặt" để đăng ký phím nóng với hệ thống Windows.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setHotkeys({ play: '1', stop: '2', pause: '3' });
                setIsSaved(false);
                setStatusMessage('Đã đặt lại về mặc định (1, 2, 3). Nhấn Lưu để áp dụng.');
              }}
              className="px-3.5 py-2 rounded-lg bg-[#181A24] border border-white/[0.08] hover:border-white/20 text-[#8E92A0] hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Mặc định</span>
            </button>

            <button
              onClick={handleSave}
              className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                isSaved
                  ? 'bg-emerald-500 text-white border border-emerald-400'
                  : 'bg-[#00F2FE] hover:bg-[#00d8e4] text-[#090A0F] font-bold border border-[#00F2FE]'
              }`}
            >
              {isSaved ? (
                <>
                  <Check size={15} />
                  <span>Đã Lưu Xong!</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Lưu Cài Đặt Phím Nóng</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Administrator Hook Info Card */}
        <div className="p-4 rounded-xl bg-[#11131A] border border-white/[0.08] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <ShieldCheck size={18} />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Quyền Quản Trị Viên (Administrator Hook)</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-medium">
                Active
              </span>
            </div>
            <p className="text-[11px] text-[#8E92A0] leading-relaxed">
              GsMusicLyre chạy ở quyền Administrator để mô phỏng DirectInput trực tiếp vào cửa sổ Genshin Impact và Sky: Children of the Light ngay cả khi game đang ở chế độ Fullscreen (Toàn màn hình) hoặc Borderless.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
});
