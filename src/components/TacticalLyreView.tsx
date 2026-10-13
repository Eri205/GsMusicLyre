import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { lyreSynth } from '../audio/WebLyreSynth';
import { InstrumentType } from '../types';
import { Piano, Sparkles, Gamepad2 } from 'lucide-react';

interface TacticalLyreViewProps {
  activeKeys: string[];
  transpose: number;
  instrument: InstrumentType;
  onInstrumentChange: (inst: InstrumentType) => void;
}

// 21 Key Map for Genshin Lyre
const GENSHIN_HIGH_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U'];
const GENSHIN_MID_KEYS = ['A', 'S', 'D', 'F', 'G', 'H', 'J'];
const GENSHIN_LOW_KEYS = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

const GENSHIN_NOTE_NAMES: Record<string, string> = {
  Z: 'do', X: 're', C: 'mi', V: 'fa', B: 'sol', N: 'la', M: 'si',
  A: 'DO', S: 'RE', D: 'MI', F: 'FA', G: 'SOL', H: 'LA', J: 'SI',
  Q: 'Do', W: 'Re', E: 'Mi', R: 'Fa', T: 'Sol', Y: 'La', U: 'Si'
};

// 15 Key Map for Sky: Children of the Light (QWERT Standard Macro)
const SKY_QWERT_ROW1 = ['Q', 'W', 'E', 'R', 'T'];
const SKY_QWERT_ROW2 = ['A', 'S', 'D', 'F', 'G'];
const SKY_QWERT_ROW3 = ['Z', 'X', 'C', 'V', 'B'];

// 15 Key Map for Sky: Children of the Light (Steam PC Official)
const SKY_STEAM_ROW1 = ['Y', 'U', 'I', 'O', 'P'];
const SKY_STEAM_ROW2 = ['H', 'J', 'K', 'L', ';'];
const SKY_STEAM_ROW3 = ['N', 'M', ',', '.', '/'];

const SKY_NOTES_ROW1 = ['1Do', '1Re', '1Mi', '1Fa', '1So'];
const SKY_NOTES_ROW2 = ['2La', '2Ti', '2Do', '2Re', '2Mi'];
const SKY_NOTES_ROW3 = ['2Fa', '2So', '2La', '2Ti', '3Do'];

export const TacticalLyreView: React.FC<TacticalLyreViewProps> = React.memo(({
  activeKeys,
  transpose,
  instrument,
  onInstrumentChange,
}) => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  const isSkyMode = instrument === 'sky' || instrument === 'sky_steam';
  const isSteam = instrument === 'sky_steam';

  // Listen to physical keyboard presses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const rawKey = e.key;
      const upperKey = rawKey.toUpperCase();

      let targetKey: string | null = null;

      if (isSkyMode) {
        if (isSteam) {
          const steamAllowed = [...SKY_STEAM_ROW1, ...SKY_STEAM_ROW2, ...SKY_STEAM_ROW3];
          if (steamAllowed.includes(upperKey) || steamAllowed.includes(rawKey)) {
            targetKey = steamAllowed.includes(upperKey) ? upperKey : rawKey;
          }
        } else {
          const qwertAllowed = [...SKY_QWERT_ROW1, ...SKY_QWERT_ROW2, ...SKY_QWERT_ROW3];
          if (qwertAllowed.includes(upperKey)) {
            targetKey = upperKey;
          }
        }
      } else {
        const genshinAllowed = [...GENSHIN_HIGH_KEYS, ...GENSHIN_MID_KEYS, ...GENSHIN_LOW_KEYS];
        if (genshinAllowed.includes(upperKey)) {
          targetKey = upperKey;
        }
      }

      if (targetKey && !e.repeat) {
        lyreSynth.playKey(targetKey, transpose, instrument);
        setPressedKeys(prev => new Set(prev).add(targetKey!));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const rawKey = e.key;
      const upperKey = rawKey.toUpperCase();
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(upperKey);
        next.delete(rawKey);
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [transpose, instrument, isSkyMode, isSteam]);

  const handleKeyClick = (key: string) => {
    lyreSynth.playKey(key, transpose, instrument);
    setPressedKeys(prev => new Set(prev).add(key));
    setTimeout(() => {
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 150);
  };

  // Render Genshin 7-Key Row (21 keys total)
  const renderGenshinRow = (rowKeys: string[], label: string) => (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div className="w-full flex items-center justify-between px-1 text-[10px] font-mono text-[#525666] uppercase">
        <span>{label}</span>
      </div>
      <div className="flex items-center justify-center gap-2 sm:gap-3 w-full">
        {rowKeys.map(k => {
          const isTriggered = pressedKeys.has(k) || activeKeys.includes(k);
          return (
            <motion.button
              key={k}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleKeyClick(k)}
              className={`flex-1 max-w-[64px] h-[74px] sm:h-[84px] rounded-lg border flex flex-col items-center justify-between py-2 transition-all cursor-pointer select-none ${
                isTriggered
                  ? 'bg-[#1C1F2B] border-[#00F2FE] text-[#00F2FE] shadow-[0_0_12px_rgba(0,242,254,0.25)]'
                  : 'bg-[#11131A] border-white/[0.08] text-[#F1F3F9] hover:bg-[#171922] hover:border-white/20'
              }`}
            >
              <span className={`text-[10px] font-mono ${isTriggered ? 'text-[#00F2FE]' : 'text-[#8E92A4]'}`}>
                {GENSHIN_NOTE_NAMES[k] || k}
              </span>
              <span className="text-base sm:text-lg font-bold font-mono tracking-tight">
                {k}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isTriggered ? 'bg-[#00F2FE]' : 'bg-white/[0.08]'
              }`} />
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  // Render Sky 5-Key Row (15 keys total with Diamond buttons)
  const renderSkyRow = (rowKeys: string[], rowNotes: string[], label: string) => (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div className="w-full flex items-center justify-between px-2 text-[10px] font-mono text-[#525666] uppercase">
        <span>{label}</span>
      </div>
      <div className="flex items-center justify-center gap-4 sm:gap-6 w-full">
        {rowKeys.map((k, idx) => {
          const noteName = rowNotes[idx] || k;
          const isTriggered = pressedKeys.has(k) || activeKeys.includes(k);
          return (
            <motion.button
              key={k}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleKeyClick(k)}
              className={`relative flex-1 max-w-[80px] h-[80px] sm:h-[88px] rounded-xl border flex flex-col items-center justify-between py-2.5 transition-all cursor-pointer select-none ${
                isTriggered
                  ? 'bg-[#1A2234] border-[#00F2FE] text-[#00F2FE] shadow-[0_0_14px_rgba(0,242,254,0.35)]'
                  : 'bg-[#13151F] border-white/[0.08] text-[#F1F3F9] hover:bg-[#1A1D2A] hover:border-white/20'
              }`}
            >
              {/* Sky Diamond Marker */}
              <div className={`w-3.5 h-3.5 rotate-45 border transition-all ${
                isTriggered
                  ? 'bg-[#00F2FE] border-[#00F2FE]'
                  : 'bg-white/[0.04] border-white/20'
              }`} />

              <span className="text-lg sm:text-xl font-bold font-mono tracking-tight">
                {k}
              </span>

              <span className={`text-[11px] font-mono font-medium ${isTriggered ? 'text-[#00F2FE]' : 'text-zinc-400'}`}>
                {noteName}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex-1 h-full bg-[#090A0F] p-6 flex flex-col items-center justify-center select-none overflow-y-auto">
      <div className="w-full max-w-[700px] p-6 rounded-xl bg-[#11131A] border border-white/[0.08] flex flex-col items-center gap-6 shadow-2xl">
        {/* Lyre Controls & Instrument Switcher */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            {isSkyMode ? (
              <Sparkles size={18} className="text-[#00F2FE]" />
            ) : (
              <Piano size={18} className="text-[#FF4D6D]" />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-[#F1F3F9]">
              {isSkyMode ? 'Sky: Children of the Light (15 Phím Diamond)' : 'Genshin Windsong Lyre (21 Phím)'}
            </span>
          </div>

          {/* Instrument Selector Tabs */}
          <div className="flex items-center gap-1 bg-[#171922] p-1 rounded-lg border border-white/[0.08]">
            <button
              onClick={() => onInstrumentChange('genshin')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                instrument === 'genshin'
                  ? 'bg-[#090A0F] text-[#FF4D6D] font-semibold border border-white/10'
                  : 'text-[#8E92A4] hover:text-white'
              }`}
            >
              Genshin 21K
            </button>
            <button
              onClick={() => onInstrumentChange('sky')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                instrument === 'sky'
                  ? 'bg-[#090A0F] text-[#00F2FE] font-semibold border border-white/10'
                  : 'text-[#8E92A4] hover:text-white'
              }`}
            >
              Sky COTL (QWERT)
            </button>
            <button
              onClick={() => onInstrumentChange('sky_steam')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                instrument === 'sky_steam'
                  ? 'bg-[#090A0F] text-[#00F2FE] font-semibold border border-white/10'
                  : 'text-[#8E92A4] hover:text-white'
              }`}
            >
              Sky Steam (PC)
            </button>
          </div>
        </div>

        {/* Dynamic Keypad Layout */}
        <div className="flex flex-col gap-4 w-full">
          {isSkyMode ? (
            /* Sky: Children of the Light 15 Diamond Keys */
            <>
              {renderSkyRow(
                isSteam ? SKY_STEAM_ROW1 : SKY_QWERT_ROW1,
                SKY_NOTES_ROW1,
                isSteam ? 'Hàng 1: High Pitch (Y - P)' : 'Hàng 1: High Pitch (Q - T)'
              )}
              {renderSkyRow(
                isSteam ? SKY_STEAM_ROW2 : SKY_QWERT_ROW2,
                SKY_NOTES_ROW2,
                isSteam ? 'Hàng 2: Mid Pitch (H - ;)' : 'Hàng 2: Mid Pitch (A - G)'
              )}
              {renderSkyRow(
                isSteam ? SKY_STEAM_ROW3 : SKY_QWERT_ROW3,
                SKY_NOTES_ROW3,
                isSteam ? 'Hàng 3: Low Pitch (N - /)' : 'Hàng 3: Low Pitch (Z - B)'
              )}
            </>
          ) : (
            /* Genshin Impact 21 Natural Keys */
            <>
              {renderGenshinRow(GENSHIN_HIGH_KEYS, 'High Octave (Q - U • C5 - B5)')}
              {renderGenshinRow(GENSHIN_MID_KEYS, 'Middle Octave (A - J • C4 - B4)')}
              {renderGenshinRow(GENSHIN_LOW_KEYS, 'Low Octave (Z - M • C3 - B3)')}
            </>
          )}
        </div>

        {/* Instructions & Status */}
        <div className="w-full flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] font-mono text-[#525666]">
          <span>
            {isSkyMode
              ? (isSteam ? 'Nhấn phím Y-P, H-;, N-/ trên bàn phím để gõ nốt' : 'Nhấn phím Q-T, A-G, Z-B trên bàn phím để gõ nốt')
              : 'Nhấn phím Q-U, A-J, Z-M trên bàn phím để gõ nốt'}
          </span>
          <span className="text-[#00F2FE]">Độ trễ: &lt; 1ms (DirectInput & WebAudio)</span>
        </div>
      </div>
    </div>
  );
});
