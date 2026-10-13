import React, { useRef, useEffect } from 'react';
import { Search, X, Monitor, Minus, Square, SlidersHorizontal } from 'lucide-react';
import { QuickFilterTag } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: QuickFilterTag;
  onFilterChange: (filter: QuickFilterTag) => void;
  isOverlayActive: boolean;
  onToggleOverlay: () => void;
  activeTab?: string;
  onOpenSettings?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  isOverlayActive,
  onToggleOverlay,
  activeTab,
  onOpenSettings,
  onMinimize,
  onMaximize,
  onClose,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global "/" keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filterChips: { id: QuickFilterTag; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'genshin', label: 'Genshin Lyre' },
    { id: 'sky', label: 'Sky CotL' },
    { id: 'fast', label: '100+ BPM' },
    { id: 'beginner', label: 'Beginner' },
    { id: 'favorites', label: 'Favorites ❤️' },
  ];

  return (
    <header 
      className="pywebview-drag-region h-[56px] min-h-[56px] bg-[#12131A] border-b border-white/[0.08] px-4 lg:px-6 flex items-center justify-between gap-4 lg:gap-6 select-none z-20 cursor-default"
      onDoubleClick={onMaximize}
    >
      {/* Search Input with Tactical "/" Shortcut Pill */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        className="relative flex items-center w-[220px] lg:w-[260px] xl:w-[280px] shrink-0"
      >
        <Search size={15} className="absolute left-3 text-[#8E92A0] pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Type / to search songs, artists..."
          className="w-full h-9 pl-9 pr-14 bg-[#181A24] border border-white/[0.08] focus:border-white/20 rounded-lg text-xs text-[#FFFFFF] placeholder:text-[#5A5E70] outline-none transition-colors font-sans"
        />
        {searchQuery ? (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 w-4 h-4 rounded-full flex items-center justify-center text-[#8E92A0] hover:text-[#FFFFFF] cursor-pointer"
          >
            <X size={12} />
          </button>
        ) : (
          <div className="absolute right-2.5 flex items-center pointer-events-none">
            <kbd className="h-5 px-1.5 rounded bg-[#090A0F] border border-white/[0.08] text-[10px] font-mono text-[#8E92A0] flex items-center justify-center">
              /
            </kbd>
          </div>
        )}
      </div>

      {/* Quick Filter Tags (Centrally Spaced Muted Chips with Generous Breathing Room) */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        className="hidden md:flex items-center justify-center gap-1.5 lg:gap-2 overflow-x-auto no-scrollbar py-1 flex-1 px-2 min-w-0 max-w-[560px]"
      >
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => onFilterChange(chip.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all duration-150 border cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-white/[0.1] text-[#FFFFFF] border-white/20 shadow-none'
                  : 'bg-transparent text-[#8E92A0] border-transparent hover:bg-white/[0.04] hover:text-[#FFFFFF]'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Right Controls: In-Game Mechanical Switch + Window Controls */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        className="flex items-center gap-3 shrink-0"
      >
        {/* In-Game Overlay Mechanical Toggle Switch */}
        <div 
          onClick={onToggleOverlay}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#181A24] border border-white/[0.08] hover:border-white/20 cursor-pointer transition-colors group select-none shrink-0"
          title="Toggle In-Game Floating HUD [F11]"
        >
          <span className="text-[11px] font-medium text-[#8E92A0] group-hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5">
            <Monitor size={13} className={isOverlayActive ? 'text-[#00F2FE]' : 'text-[#8E92A0]'} />
            Overlay HUD
          </span>

          {/* Mechanical Switch Pill */}
          <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-200 border ${
            isOverlayActive 
              ? 'bg-[#00F2FE]/20 border-[#00F2FE]/40' 
              : 'bg-[#090A0F] border-white/[0.12]'
          }`}>
            <div className={`w-2 h-2 rounded-full transition-transform duration-200 ${
              isOverlayActive ? 'translate-x-3.5 bg-[#00F2FE]' : 'translate-x-0 bg-[#8E92A0]'
            }`} />
          </div>

          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#090A0F] border border-white/[0.08] text-[#8E92A0]">
            F11
          </kbd>
        </div>

        {/* Hotkeys & Settings Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer group select-none shrink-0 ${
              activeTab === 'settings'
                ? 'bg-white/[0.1] border-white/20 text-[#00F2FE]'
                : 'bg-[#181A24] border-white/[0.08] hover:border-white/20 text-[#8E92A0] hover:text-[#FFFFFF]'
            }`}
            title="Cài đặt phím Start / Stop"
          >
            <SlidersHorizontal size={13} className={activeTab === 'settings' ? 'text-[#00F2FE]' : 'text-[#8E92A0]'} />
            <span className="hidden sm:inline text-[11px]">Phím nóng</span>
          </button>
        )}

        {/* Desktop Frameless Window Controls (Always visible, Stop propagation) */}
        <div className="flex items-center gap-1 pl-2 border-l border-white/[0.08]">
          <button 
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onMinimize?.();
            }} 
            className="w-7 h-7 rounded flex items-center justify-center text-[#8E92A0] hover:text-[#FFFFFF] hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Thu nhỏ xuống Taskbar (Minimize)"
          >
            <Minus size={13} />
          </button>
          <button 
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onMaximize?.();
            }} 
            className="w-7 h-7 rounded flex items-center justify-center text-[#8E92A0] hover:text-[#FFFFFF] hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Phóng to / Thu vừa màn hình (Maximize / Restore)"
          >
            <Square size={11} />
          </button>
          <button 
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }} 
            className="w-7 h-7 rounded flex items-center justify-center text-[#8E92A0] hover:text-[#FF4D6D] hover:bg-[#FF4D6D]/15 transition-colors cursor-pointer"
            title="Đóng ứng dụng (Close)"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </header>
  );
});
