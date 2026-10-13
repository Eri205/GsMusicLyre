import React from 'react';
import { 
  Music2, 
  Piano, 
  Disc3, 
  Gamepad2, 
  CloudSun, 
  Sparkles, 
  FileMusic, 
  Flame, 
  Heart, 
  FolderPlus,
  Monitor,
  SlidersHorizontal
} from 'lucide-react';
import { ActiveNavTab, CategoryFilter, Song, InstrumentType } from '../types';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onTabChange: (tab: ActiveNavTab) => void;
  selectedCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
  songs: Song[];
  isOverlayActive: boolean;
  onToggleOverlay: () => void;
  onOpenImportModal: () => void;
  engineMode: 'directinput' | 'webaudio';
  instrument: InstrumentType;
  onInstrumentChange: (inst: InstrumentType) => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  activeTab,
  onTabChange,
  selectedCategory,
  onSelectCategory,
  songs,
  isOverlayActive,
  onToggleOverlay,
  onOpenImportModal,
  engineMode,
  instrument,
  onInstrumentChange,
}) => {
  // Count songs per category
  const counts = React.useMemo(() => {
    return {
      all: songs.length,
      genshin: songs.filter(s => s.category === 'Genshin Impact').length,
      sky: songs.filter(s => s.category === 'Sky: CotL').length,
      anime: songs.filter(s => s.category === 'Anime & OST').length,
      classical: songs.filter(s => s.category === 'Classical').length,
      pop: songs.filter(s => s.category === 'Pop / Meme').length,
      favorites: songs.filter(s => s.is_favorite).length,
    };
  }, [songs]);

  const categories: { id: CategoryFilter; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'all', label: 'All Sheets', icon: Disc3, count: counts.all },
    { id: 'genshin', label: 'Genshin Impact', icon: Gamepad2, count: counts.genshin },
    { id: 'sky', label: 'Sky CotL', icon: CloudSun, count: counts.sky },
    { id: 'anime', label: 'Anime & OST', icon: Sparkles, count: counts.anime },
    { id: 'classical', label: 'Classical', icon: FileMusic, count: counts.classical },
    { id: 'pop', label: 'Pop & Trending', icon: Flame, count: counts.pop },
    { id: 'favorites', label: 'Favorites', icon: Heart, count: counts.favorites },
  ];

  const isSkyHook = instrument === 'sky' || instrument === 'sky_steam';

  return (
    <aside className="w-[240px] min-w-[240px] h-full bg-[#12131A] border-r border-white/[0.08] flex flex-col justify-between p-3 select-none z-30">
      {/* Top: Brand Header + Primary Views */}
      <div className="flex flex-col gap-3.5">
        {/* Brand Header with pywebview-drag-region (allows window dragging) */}
        <div className="pywebview-drag-region flex items-center gap-2.5 px-2 py-1 cursor-default">
          <div className="w-8 h-8 rounded-lg bg-[#181922] border border-white/[0.1] flex items-center justify-center shrink-0">
            <span className="text-[#FF4D6D] font-bold text-sm tracking-tighter">GS</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-[#FFFFFF] tracking-tight leading-tight truncate">
              GsMusicLyre
            </span>
            <span className="text-[9px] font-mono text-[#8E92A0] uppercase tracking-wider">
              Studio Pro
            </span>
          </div>
        </div>

        {/* Primary Views (Tracklist, Genshin Lyre, Sky CotL Harp) */}
        <div className="flex flex-col gap-1">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onTabChange('library')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'library'
                ? 'bg-white/[0.08] text-[#FFFFFF]'
                : 'text-[#8E92A0] hover:text-[#FFFFFF] hover:bg-white/[0.04]'
            }`}
          >
            <Music2 size={15} className={activeTab === 'library' ? 'text-[#FF4D6D]' : 'text-[#8E92A0]'} />
            <span>Tracklist Library</span>
          </button>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              onTabChange('lyre');
              onInstrumentChange('genshin');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'lyre'
                ? 'bg-white/[0.08] text-[#FFFFFF]'
                : 'text-[#8E92A0] hover:text-[#FFFFFF] hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Piano size={15} className={activeTab === 'lyre' ? 'text-[#FF4D6D]' : 'text-[#8E92A0]'} />
              <span>Genshin Lyre</span>
            </div>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-[#8E92A0]">21K</span>
          </button>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              onTabChange('sky_harp');
              if (instrument === 'genshin' || instrument === 'vintage') {
                onInstrumentChange('sky');
              }
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'sky_harp'
                ? 'bg-white/[0.08] text-[#FFFFFF]'
                : 'text-[#8E92A0] hover:text-[#FFFFFF] hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles size={15} className={activeTab === 'sky_harp' ? 'text-[#00F2FE]' : 'text-[#8E92A0]'} />
              <span>Sky CotL Harp</span>
            </div>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#00F2FE]/15 text-[#00F2FE]">15K</span>
          </button>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white/[0.08] text-[#FFFFFF]'
                : 'text-[#8E92A0] hover:text-[#FFFFFF] hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <SlidersHorizontal size={15} className={activeTab === 'settings' ? 'text-[#00F2FE]' : 'text-[#8E92A0]'} />
              <span>Phím Start / Stop</span>
            </div>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-[#8E92A0]">Hotkey</span>
          </button>
        </div>

        {/* Target Instrument Selector Box */}
        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-[#161822] border border-white/[0.08]">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8E92A0]">
            <span>Target Instrument</span>
            <span className="text-[9px] text-[#00F2FE] font-medium">3 Layouts</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onInstrumentChange('genshin')}
              className={`py-1 rounded text-[10px] font-mono font-medium transition-all cursor-pointer text-center ${
                instrument === 'genshin'
                  ? 'bg-[#090A0F] text-[#FF4D6D] border border-white/10 shadow-sm'
                  : 'text-[#8E92A0] hover:text-white hover:bg-white/[0.04]'
              }`}
              title="Genshin Impact (21 Phím: Q-U, A-J, Z-M)"
            >
              Genshin
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onInstrumentChange('sky')}
              className={`py-1 rounded text-[10px] font-mono font-medium transition-all cursor-pointer text-center ${
                instrument === 'sky'
                  ? 'bg-[#090A0F] text-[#00F2FE] border border-white/10 shadow-sm'
                  : 'text-[#8E92A0] hover:text-white hover:bg-white/[0.04]'
              }`}
              title="Sky: CotL Standard Macro (15 Phím: Q-T, A-G, Z-B)"
            >
              Sky
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onInstrumentChange('sky_steam')}
              className={`py-1 rounded text-[10px] font-mono font-medium transition-all cursor-pointer text-center ${
                instrument === 'sky_steam'
                  ? 'bg-[#090A0F] text-[#00F2FE] border border-white/10 shadow-sm'
                  : 'text-[#8E92A0] hover:text-white hover:bg-white/[0.04]'
              }`}
              title="Sky: CotL Steam PC (15 Phím: Y-P, H-;, N-/)"
            >
              Steam
            </button>
          </div>
        </div>

        {/* Separator Hairline */}
        <div className="h-[1px] bg-white/[0.06] mx-1" />

        {/* Repertoire Collections List */}
        <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto no-scrollbar">
          <div className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#5A5E70]">
            Collections
          </div>

          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeTab === 'library' && selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  onTabChange('library');
                  onSelectCategory(cat.id);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-white/[0.08] text-[#FFFFFF] font-medium'
                    : 'text-[#8E92A0] hover:text-[#FFFFFF] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon 
                    size={14} 
                    className={
                      isSelected
                        ? (cat.id === 'favorites' ? 'text-[#FF4D6D]' : 'text-[#00F2FE]')
                        : 'text-[#8E92A0]'
                    } 
                  />
                  <span className="truncate">{cat.label}</span>
                </div>
                <span className="text-[10px] font-mono text-[#5A5E70] shrink-0 ml-1">
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Import Sheet Action Button */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onOpenImportModal}
          className="w-full mt-0.5 py-1.5 px-3 rounded-lg bg-[#181A24] border border-white/[0.08] hover:border-white/20 text-[#FFFFFF] text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer group"
        >
          <FolderPlus size={14} className="text-[#00F2FE] group-hover:scale-110 transition-transform" />
          <span>Import MIDI / Sheet</span>
        </button>
      </div>

      {/* Bottom: Game Hook Status & In-Game Overlay Quick Toggle */}
      <div className="flex flex-col gap-2 pt-2.5 border-t border-white/[0.06]">
        {/* In-Game Overlay Button */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onToggleOverlay}
          className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
            isOverlayActive
              ? 'bg-[#181A24] border-[#00F2FE]/40 text-[#00F2FE]'
              : 'border-white/[0.08] text-[#8E92A0] hover:text-[#FFFFFF] hover:bg-white/[0.04]'
          }`}
          title="Toggle In-Game Floating HUD [F11]"
        >
          <div className="flex items-center gap-2">
            <Monitor size={14} className={isOverlayActive ? 'text-[#00F2FE]' : 'text-[#8E92A0]'} />
            <span>Overlay HUD</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-[#8E92A0]">
            F11
          </span>
        </button>

        {/* Game Hook Status Readout */}
        <div className="px-2 py-1.5 rounded-lg bg-[#090A0F] border border-white/[0.04] flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FE] animate-pulse" />
            <span className="text-[#8E92A0]">{isSkyHook ? 'Sky CotL Hooked' : 'Genshin Hooked'}</span>
          </div>
          <span className="text-[9px] text-[#00F2FE]">0ms DirectInput</span>
        </div>
      </div>
    </aside>
  );
});
