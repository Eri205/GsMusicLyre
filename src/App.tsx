import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Song, 
  ActiveNavTab, 
  CategoryFilter, 
  QuickFilterTag, 
  PlaybackState, 
  InstrumentType 
} from './types';
import { INITIAL_SONGS } from './data/defaultSongs';
import { lyreSynth } from './audio/WebLyreSynth';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TrackList } from './components/TrackList';
import { BottomPlayerBar } from './components/BottomPlayerBar';
import { TacticalLyreView } from './components/TacticalLyreView';
import { TacticalSettingsView } from './components/TacticalSettingsView';
import { TacticalModal } from './components/TacticalModal';

// Pywebview bridge interface
interface PyWebViewWindow extends Window {
  pywebview?: {
    api?: {
      get_library_data?: () => Promise<{ songs: Song[]; is_admin: boolean }>;
      load_song?: (id: string, auto_play?: boolean) => Promise<any>;
      play?: (startTime?: number) => Promise<any>;
      pause?: () => Promise<any>;
      stop?: () => Promise<any>;
      seek?: (seconds: number) => Promise<any>;
      set_speed?: (speed: number) => Promise<any>;
      set_transpose?: (semitones: number) => Promise<any>;
      toggle_favorite?: (song_id: string) => Promise<any>;
      launch_floating_overlay?: () => Promise<any>;
      minimize?: () => void;
      maximize?: () => void;
      close?: () => void;
      minimize_window?: () => void;
      toggle_maximize_window?: () => Promise<boolean>;
      close_window?: () => void;
      set_instrument?: (inst: string) => Promise<any>;
      set_target_instrument?: (inst: string) => Promise<any>;
      play_song?: (id: string) => void;
    };
  };
  onPlaybackProgress?: (cur: number, tot: number, keys: string[]) => void;
  onStateChange?: (state: string) => void;
  onPlaybackFinished?: () => void;
}

declare const window: PyWebViewWindow;

export const App: React.FC = () => {
  // Core Library State
  const [songs, setSongs] = useState<Song[]>(INITIAL_SONGS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [activeFilter, setActiveFilter] = useState<QuickFilterTag>('all');
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('library');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Playback State
  const [currentSong, setCurrentSong] = useState<Song | null>(INITIAL_SONGS[0]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('STOPPED');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(INITIAL_SONGS[0].duration_seconds);
  const [speed, setSpeed] = useState<number>(1.0);
  const [transpose, setTranspose] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [instrument, setInstrument] = useState<InstrumentType>('genshin');
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [activeLyreKeys, setActiveLyreKeys] = useState<string[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);

  // Overlay & Engine state
  const [isOverlayActive, setIsOverlayActive] = useState<boolean>(false);
  const isPyWebView = typeof window !== 'undefined' && !!window.pywebview?.api;
  const engineMode = isPyWebView ? 'directinput' : 'webaudio';

  // Playback timer references
  const playbackTimerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const chordIndexRef = useRef<number>(0);

  // Stop playback timer
  const stopPlaybackTimer = useCallback(() => {
    if (playbackTimerRef.current !== null) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, []);

  // Play Chord Notes via Synth
  const triggerChord = useCallback((keys: string[]) => {
    setActiveLyreKeys(keys);
    keys.forEach(k => {
      lyreSynth.playKey(k, transpose, instrument);
    });
    setTimeout(() => {
      setActiveLyreKeys([]);
    }, 120);
  }, [transpose, instrument]);

  // Start Playback Loop
  const startPlaybackLoop = useCallback((startFromSec?: number) => {
    stopPlaybackTimer();
    if (!currentSong) return;

    if (startFromSec !== undefined) {
      setCurrentTime(startFromSec);
      chordIndexRef.current = 0;
    }

    lastTimeRef.current = performance.now();
    const chords = currentSong.chords || [];

    playbackTimerRef.current = window.setInterval(() => {
      const now = performance.now();
      const deltaSec = ((now - lastTimeRef.current) / 1000) * speed;
      lastTimeRef.current = now;

      setCurrentTime(prevTime => {
        const nextTime = prevTime + deltaSec;

        // Check Chords trigger
        while (chordIndexRef.current < chords.length && chords[chordIndexRef.current][0] <= nextTime) {
          triggerChord(chords[chordIndexRef.current][1]);
          chordIndexRef.current += 1;
        }

        // Check Song Finished
        if (nextTime >= duration) {
          stopPlaybackTimer();
          if (isLooping) {
            setTimeout(() => startPlaybackLoop(0), 100);
          } else {
            setPlaybackState('STOPPED');
            return 0;
          }
        }
        return nextTime;
      });
    }, 30);
  }, [currentSong, speed, duration, isLooping, stopPlaybackTimer, triggerChord]);

  // pywebview bridge listeners & initialization
  useEffect(() => {
    const initPyWebView = async () => {
      if (window.pywebview?.api?.get_library_data) {
        try {
          const data = await window.pywebview.api.get_library_data();
          if (data && data.songs && data.songs.length > 0) {
            setSongs(data.songs);
            setCurrentSong(data.songs[0]);
            setDuration(data.songs[0].duration_seconds);
          }
        } catch (err) {
          console.log('pywebview library init error:', err);
        }
      }
    };

    window.onPlaybackProgress = (curSec: number, totSec: number, keys: string[]) => {
      setCurrentTime(curSec);
      if (totSec > 0) setDuration(totSec);
      if (keys && keys.length > 0) {
        setActiveLyreKeys(keys);
        setTimeout(() => setActiveLyreKeys([]), 120);
      }
    };

    window.onStateChange = (stateStr: string) => {
      if (stateStr === 'PLAYING') setPlaybackState('PLAYING');
      else if (stateStr === 'PAUSED') setPlaybackState('PAUSED');
      else setPlaybackState('STOPPED');
    };

    window.onPlaybackFinished = () => {
      setPlaybackState('STOPPED');
      setCurrentTime(0);
      setActiveLyreKeys([]);
    };

    initPyWebView();
    window.addEventListener('pywebviewready', initPyWebView);
    return () => {
      window.removeEventListener('pywebviewready', initPyWebView);
    };
  }, []);

  // Play Specific Song
  const handlePlaySong = useCallback((song: Song) => {
    if (currentSong?.id === song.id && playbackState === 'PLAYING') {
      // Pause
      setPlaybackState('PAUSED');
      stopPlaybackTimer();
      window.pywebview?.api?.pause?.();
      return;
    }

    setCurrentSong(song);
    setDuration(song.duration_seconds);
    setTranspose(song.recommended_transpose || 0);
    setPlaybackState('PLAYING');
    chordIndexRef.current = 0;

    if (window.pywebview?.api?.load_song) {
      window.pywebview.api.load_song(song.id, true);
    } else {
      startPlaybackLoop(0);
    }
  }, [currentSong, playbackState, stopPlaybackTimer, startPlaybackLoop]);

  // Play / Pause Toggle
  const handlePlayPause = useCallback(() => {
    if (playbackState === 'PLAYING') {
      setPlaybackState('PAUSED');
      stopPlaybackTimer();
      window.pywebview?.api?.pause?.();
    } else {
      setPlaybackState('PLAYING');
      if (window.pywebview?.api?.play) {
        window.pywebview.api.play();
      } else {
        startPlaybackLoop();
      }
    }
  }, [playbackState, stopPlaybackTimer, startPlaybackLoop]);

  // Panic Stop
  const handleStop = useCallback(() => {
    setPlaybackState('STOPPED');
    stopPlaybackTimer();
    setCurrentTime(0);
    chordIndexRef.current = 0;
    setActiveLyreKeys([]);
    window.pywebview?.api?.stop?.();
  }, [stopPlaybackTimer]);

  // Seek
  const handleSeek = useCallback((newTime: number) => {
    setCurrentTime(newTime);
    if (currentSong?.chords) {
      const idx = currentSong.chords.findIndex(([time]) => time >= newTime);
      chordIndexRef.current = idx !== -1 ? idx : currentSong.chords.length;
    }
    if (window.pywebview?.api?.seek) {
      window.pywebview.api.seek(newTime);
    } else if (playbackState === 'PLAYING') {
      lastTimeRef.current = performance.now();
    }
  }, [currentSong, playbackState]);

  // Next Track
  const handleNext = useCallback(() => {
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    handlePlaySong(songs[nextIndex]);
  }, [songs, currentSong, handlePlaySong]);

  // Prev Track
  const handlePrev = useCallback(() => {
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    handlePlaySong(songs[prevIndex]);
  }, [songs, currentSong, handlePlaySong]);

  // Toggle Favorite with Spring
  const handleToggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSongs(prev => prev.map(s => s.id === id ? { ...s, is_favorite: !s.is_favorite } : s));
  }, []);

  // Add to Queue
  const handleAddToQueue = useCallback((song: Song) => {
    setQueue(prev => [...prev, song]);
  }, []);

  // Delete Song
  const handleDeleteSong = useCallback((id: string) => {
    setSongs(prev => prev.filter(s => s.id !== id));
    if (currentSong?.id === id) {
      handleStop();
    }
  }, [currentSong, handleStop]);

  // Toggle In-Game Overlay
  const handleToggleOverlay = useCallback(() => {
    setIsOverlayActive(prev => !prev);
    if (window.pywebview?.api?.launch_floating_overlay) {
      window.pywebview.api.launch_floating_overlay();
    }
  }, []);

  // Window Controls Handlers
  const handleMinimize = useCallback(() => {
    if (window.pywebview?.api?.minimize_window) {
      window.pywebview.api.minimize_window();
    } else if (window.pywebview?.api?.minimize) {
      window.pywebview.api.minimize();
    }
  }, []);

  const handleMaximize = useCallback(() => {
    if (window.pywebview?.api?.toggle_maximize_window) {
      window.pywebview.api.toggle_maximize_window();
    } else if (window.pywebview?.api?.maximize) {
      window.pywebview.api.maximize();
    }
  }, []);

  const handleClose = useCallback(() => {
    if (window.pywebview?.api?.close_window) {
      window.pywebview.api.close_window();
    } else if (window.pywebview?.api?.close) {
      window.pywebview.api.close();
    }
  }, []);

  // Target Instrument Handler (sync with Python engine)
  const handleInstrumentChange = useCallback((newInst: InstrumentType) => {
    setInstrument(newInst);
    if (newInst === 'sky' || newInst === 'sky_steam') {
      if (activeTab === 'lyre') setActiveTab('sky_harp');
    } else if (newInst === 'genshin') {
      if (activeTab === 'sky_harp') setActiveTab('lyre');
    }
    if (window.pywebview?.api?.set_instrument) {
      window.pywebview.api.set_instrument(newInst);
    } else if (window.pywebview?.api?.set_target_instrument) {
      window.pywebview.api.set_target_instrument(newInst);
    }
  }, [activeTab]);

  // Auto-Tune to C Major (0 transpose)
  const handleAutoTuneMajor = useCallback(() => {
    setTranspose(0);
  }, []);

  // Keyboard Shortcuts (F8, F10, F11, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleOverlay();
      } else if (e.key === 'F8' || e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleStop();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab(prev => prev === 'settings' ? 'library' : 'settings');
      } else if (e.key === 'F12') {
        e.preventDefault();
        handleInstrumentChange(instrument === 'genshin' ? 'sky' : instrument === 'sky' ? 'sky_steam' : 'genshin');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleOverlay, handlePlayPause, handleStop, handleInstrumentChange, instrument]);

  // Filter Songs
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      // Category Filter
      if (selectedCategory === 'genshin' && song.category !== 'Genshin Impact') return false;
      if (selectedCategory === 'sky' && song.category !== 'Sky: CotL') return false;
      if (selectedCategory === 'anime' && song.category !== 'Anime & OST') return false;
      if (selectedCategory === 'classical' && song.category !== 'Classical') return false;
      if (selectedCategory === 'pop' && song.category !== 'Pop / Meme') return false;
      if (selectedCategory === 'favorites' && !song.is_favorite) return false;

      // Quick Filter Tags
      if (activeFilter === 'genshin' && song.category !== 'Genshin Impact') return false;
      if (activeFilter === 'sky' && song.category !== 'Sky: CotL') return false;
      if (activeFilter === 'fast' && song.bpm < 100) return false;
      if (activeFilter === 'beginner' && song.difficulty !== 'Beginner') return false;
      if (activeFilter === 'favorites' && !song.is_favorite) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = song.title.toLowerCase().includes(q);
        const matchArtist = song.artist_or_game.toLowerCase().includes(q);
        const matchCat = song.category.toLowerCase().includes(q);
        if (!matchTitle && !matchArtist && !matchCat) return false;
      }

      return true;
    });
  }, [songs, selectedCategory, activeFilter, searchQuery]);

  return (
    <div className="w-screen h-screen bg-[#090A0F] text-[#F1F3F9] flex flex-col overflow-hidden select-none">
      {/* Top Application Header with Frameless Drag and Window Controls */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        isOverlayActive={isOverlayActive}
        onToggleOverlay={handleToggleOverlay}
        activeTab={activeTab}
        onOpenSettings={() => setActiveTab(prev => prev === 'settings' ? 'library' : 'settings')}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />

      {/* Main Workspace: Single Unified 240px Sidebar + Maximized Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Unified 240px Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setIsLoading(true);
            setTimeout(() => setIsLoading(false), 150);
          }}
          songs={songs}
          isOverlayActive={isOverlayActive}
          onToggleOverlay={handleToggleOverlay}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          engineMode={engineMode}
          instrument={instrument}
          onInstrumentChange={handleInstrumentChange}
        />

        {/* Maximized Main Content Area */}
        {activeTab === 'settings' ? (
          <TacticalSettingsView onBackToLibrary={() => setActiveTab('library')} />
        ) : activeTab === 'lyre' || activeTab === 'sky_harp' ? (
          <TacticalLyreView
            activeKeys={activeLyreKeys}
            transpose={transpose}
            instrument={instrument}
            onInstrumentChange={handleInstrumentChange}
          />
        ) : (
          <TrackList
            songs={filteredSongs}
            isLoading={isLoading}
            currentSong={currentSong}
            playbackState={playbackState}
            onPlaySong={handlePlaySong}
            onToggleFavorite={handleToggleFavorite}
            onAddToQueue={handleAddToQueue}
            onDeleteSong={handleDeleteSong}
            onPractice={handlePlaySong}
            onAutoTuneMajor={handleAutoTuneMajor}
            featuredSong={songs[0]}
          />
        )}
      </div>

      {/* Fixed Tactical Bottom Player Bar */}
      <BottomPlayerBar
        currentSong={currentSong}
        playbackState={playbackState}
        currentTime={currentTime}
        duration={duration}
        speed={speed}
        transpose={transpose}
        volume={volume}
        isMuted={isMuted}
        instrument={instrument}
        isLooping={isLooping}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={handleSeek}
        onSpeedChange={setSpeed}
        onTransposeChange={setTranspose}
        onVolumeChange={(val) => {
          setVolume(val);
          lyreSynth.setVolume(val);
        }}
        onToggleMute={() => {
          setIsMuted(prev => {
            const next = !prev;
            lyreSynth.setMute(next);
            return next;
          });
        }}
        onToggleLoop={() => setIsLooping(prev => !prev)}
        onInstrumentChange={handleInstrumentChange}
      />

      {/* Import Sheet Modal */}
      <TacticalModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSong={(newSong) => {
          setSongs(prev => [newSong as Song, ...prev]);
        }}
      />
    </div>
  );
};

export default App;
