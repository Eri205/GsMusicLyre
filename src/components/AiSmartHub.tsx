import React from 'react';
import { 
  Sparkles, 
  Gamepad2, 
  CloudSun, 
  Tv2, 
  FileMusic, 
  Flame, 
  Heart, 
  Disc3,
  Activity,
  Sliders,
  CheckCircle2,
  FolderInput
} from 'lucide-react';
import { CategoryFilter, Song } from '../types';

interface AiSmartHubProps {
  selectedCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
  songs: Song[];
  onOpenImportModal: () => void;
  onQuickTuneMajor: () => void;
}

export const AiSmartHub: React.FC<AiSmartHubProps> = React.memo(({
  selectedCategory,
  onSelectCategory,
  songs,
  onOpenImportModal,
  onQuickTuneMajor,
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
    { id: 'sky', label: 'Sky: Children of Light', icon: CloudSun, count: counts.sky },
    { id: 'anime', label: 'Anime & OST', icon: Tv2, count: counts.anime },
    { id: 'classical', label: 'Classical Repertoire', icon: FileMusic, count: counts.classical },
    { id: 'pop', label: 'Pop & Trending', icon: Flame, count: counts.pop },
    { id: 'favorites', label: 'Favorites', icon: Heart, count: counts.favorites },
  ];

  return (
    <aside className="w-[280px] min-w-[280px] h-full bg-[#11131A] border-r border-white/[0.08] flex flex-col justify-between p-4 overflow-y-auto select-none">
      <div className="flex flex-col gap-5">
        {/* Hub Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#00F2FE]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#F1F3F9]">
              AI Smart Hub
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#171922] border border-white/[0.08] text-[#00F2FE]">
            v2.4 CORE
          </span>
        </div>

        {/* Practice Session Quick Insight Card */}
        <div className="p-3 rounded-lg bg-[#171922] border border-white/[0.08] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#8E92A4]">Session Focus</span>
            <span className="text-[10px] font-mono text-[#FF5376] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5376] animate-ping" />
              RECORDING
            </span>
          </div>

          <div>
            <div className="text-xs font-semibold text-[#F1F3F9] truncate">
              Silvermoon Hall
            </div>
            <div className="text-[11px] text-[#8E92A4] flex items-center justify-between mt-0.5 font-mono">
              <span>82 BPM · C Major</span>
              <span className="text-[#00F2FE]">88% Acc</span>
            </div>
          </div>

          <div className="w-full bg-[#090A0F] h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
            <div 
              className="bg-gradient-to-r from-[#00F2FE] to-[#FF5376] h-full rounded-full transition-all duration-300"
              style={{ width: '88%' }}
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
            <button 
              onClick={onQuickTuneMajor}
              className="text-[10px] font-mono text-[#8E92A4] hover:text-[#00F2FE] transition-colors flex items-center gap-1"
            >
              <Sliders size={11} /> Auto-Tone Native
            </button>
            <span className="text-[10px] font-mono text-[#8E92A4]">35 min today</span>
          </div>
        </div>

        {/* Repertoire Categories */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#525666] px-1 mb-1">
            Repertoire Library
          </span>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors duration-150 ${
                  isSelected
                    ? 'bg-[#171922] text-[#F1F3F9] border border-white/[0.12] font-medium'
                    : 'text-[#8E92A4] hover:text-[#F1F3F9] hover:bg-[#171922]/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon 
                    size={15} 
                    className={isSelected ? (cat.id === 'favorites' ? 'text-[#FF5376]' : 'text-[#00F2FE]') : 'text-[#8E92A4]'} 
                  />
                  <span>{cat.label}</span>
                </div>
                <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded ${
                  isSelected ? 'bg-[#090A0F] text-[#F1F3F9]' : 'text-[#525666]'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tactical Sheet Importer Button */}
        <button
          onClick={onOpenImportModal}
          className="w-full py-2 px-3 rounded-md bg-[#171922] border border-white/[0.08] hover:border-white/20 text-[#F1F3F9] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer group"
        >
          <FolderInput size={14} className="text-[#00F2FE] group-hover:scale-110 transition-transform" />
          <span>Import MIDI / Sky Sheet</span>
        </button>
      </div>

      {/* In-Game Process Link Status */}
      <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#8E92A4] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FE]" />
            Genshin Impact
          </span>
          <span className="text-[10px] font-mono text-[#00F2FE]">HOOKED</span>
        </div>
        <div className="text-[10px] font-mono text-[#525666] flex justify-between">
          <span>PID: 14208 (Win32)</span>
          <span>Delay: 8ms</span>
        </div>
      </div>
    </aside>
  );
});
