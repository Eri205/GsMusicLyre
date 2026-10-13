import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, FileMusic, CheckCircle, Keyboard } from 'lucide-react';
import { Song } from '../types';

interface TacticalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSong: (newSong: Partial<Song>) => void;
}

export const TacticalModal: React.FC<TacticalModalProps> = React.memo(({
  isOpen,
  onClose,
  onImportSong,
}) => {
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [bpm, setBpm] = useState('80');
  const [category, setCategory] = useState('Genshin Impact');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim()) return;

    onImportSong({
      id: `imported_${Date.now()}`,
      title: songTitle.trim(),
      artist_or_game: artist.trim() || 'Custom Sheet',
      category: category,
      bpm: parseInt(bpm) || 80,
      duration_seconds: 120,
      note_count: 350,
      recommended_transpose: 0,
      is_custom: true,
      chords: [
        [0.0, ['Q']], [0.5, ['E']], [1.0, ['T', 'A']], [1.5, ['E']],
        [2.0, ['Q', 'Z']], [2.5, ['J']], [3.0, ['H', 'D']], [3.5, ['G']]
      ]
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      setSongTitle('');
      setArtist('');
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="w-full max-w-lg bg-[#11131A] border border-white/[0.12] rounded-xl p-6 shadow-2xl relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
            <div className="flex items-center gap-2">
              <FileMusic size={18} className="text-[#00F2FE]" />
              <h3 className="text-sm font-semibold text-[#F1F3F9]">Import Sheet / MIDI</h3>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center text-[#8E92A4] hover:text-[#F1F3F9] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Drag & Drop Area */}
            <div className="p-6 rounded-lg border border-dashed border-white/[0.12] bg-[#171922] flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#00F2FE]/50 transition-colors">
              <UploadCloud size={28} className="text-[#00F2FE] mb-2" />
              <span className="text-xs font-medium text-[#F1F3F9]">Drop .mid, .midi, or Sky .txt sheet</span>
              <span className="text-[10px] text-[#8E92A4] mt-0.5">Compatible with Auto-Key Transpose</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-[#8E92A4]">Song Title</label>
              <input
                type="text"
                required
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="e.g. Fontaine Opera Epiclese"
                className="w-full h-9 px-3 bg-[#171922] border border-white/[0.08] focus:border-[#00F2FE]/50 rounded-md text-xs text-[#F1F3F9] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono text-[#8E92A4]">Artist / Game</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="e.g. Genshin Impact"
                  className="w-full h-9 px-3 bg-[#171922] border border-white/[0.08] focus:border-[#00F2FE]/50 rounded-md text-xs text-[#F1F3F9] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono text-[#8E92A4]">Default BPM</label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  className="w-full h-9 px-3 bg-[#171922] border border-white/[0.08] focus:border-[#00F2FE]/50 rounded-md text-xs text-[#F1F3F9] font-mono outline-none"
                />
              </div>
            </div>

            {/* Hotkey Guide */}
            <div className="p-3 rounded-md bg-[#090A0F] border border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-[#8E92A4]">
              <span className="flex items-center gap-1.5">
                <Keyboard size={13} />
                Global In-game Keys:
              </span>
              <span>[F8] Play/Pause · [F10] Stop · [F11] Overlay</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-md bg-[#00F2FE] hover:bg-[#00F2FE]/90 text-[#090A0F] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSuccess ? (
                <>
                  <CheckCircle size={15} />
                  <span>Imported Successfully!</span>
                </>
              ) : (
                <span>Add Song to Library</span>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});
