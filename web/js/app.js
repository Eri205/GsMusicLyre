/**
 * web/js/app.js
 * Liquid Glass Frontend Controller for GsMusicLyre Studio.
 * Supports:
 * - Keystrokes sent to Chrome / Web Lyre / Genshin Impact with full VK & Scancode support
 * - Optional In-App Sound Toggle (Default OFF, toggle ON to test audio right inside the app)
 * - 3-Second Countdown Play (allows user to click into Chrome / Genshin before notes start)
 * - 3-Way MIDI Import (Win32 Explorer dialog, HTML5 file picker, Drag & Drop)
 */

// Web Audio API Synthesizer for in-app testing
class LyreAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterCompressor = null;
    this.currentInstrument = 'genshin';

    this.genshinFrequencies = {
      // Low Octave
      'Z': 130.81, 'X': 146.83, 'C': 164.81, 'V': 174.61, 'B': 196.00, 'N': 220.00, 'M': 246.94,
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
      // Mid Octave
      'A': 261.63, 'S': 293.66, 'D': 329.63, 'F': 349.23, 'G': 392.00, 'H': 440.00, 'J': 493.88,
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      // High Octave
      'Q': 523.25, 'W': 587.33, 'E': 659.25, 'R': 698.46, 'T': 783.99, 'Y': 880.00, 'U': 987.77,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77
    };

    this.skyQwertFrequencies = {
      // Row 1 (Top 5): C4 to G4 -> Q, W, E, R, T / A1-A5 / 1-5
      'Q': 261.63, 'W': 293.66, 'E': 329.63, 'R': 349.23, 'T': 392.00,
      'A1': 261.63, 'A2': 293.66, 'A3': 329.63, 'A4': 349.23, 'A5': 392.00,
      '1': 261.63, '2': 293.66, '3': 329.63, '4': 349.23, '5': 392.00,
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00,

      // Row 2 (Mid 5): A4 to E5 -> A, S, D, F, G / B1-B5 / 6-10
      'A': 440.00, 'S': 493.88, 'D': 523.25, 'F': 587.33, 'G': 659.25,
      'B1': 440.00, 'B2': 493.88, 'B3': 523.25, 'B4': 587.33, 'B5': 659.25,
      '6': 440.00, '7': 493.88, '8': 523.25, '9': 587.33, '10': 659.25,
      'A4': 440.00, 'B4': 493.88, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25,

      // Row 3 (Bot 5): F5 to C6 -> Z, X, C, V, B / C1-C5 / 11-15
      'Z': 698.46, 'X': 783.99, 'C': 880.00, 'V': 987.77, 'B': 1046.50,
      'C1': 698.46, 'C2': 783.99, 'C3': 880.00, 'C4_SKY': 987.77, 'C5_SKY': 1046.50,
      '11': 698.46, '12': 783.99, '13': 880.00, '14': 987.77, '15': 1046.50,
      'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77, 'C6': 1046.50
    };

    this.skySteamFrequencies = {
      // Row 1 (Top 5): C4 to G4 -> Y, U, I, O, P
      'Y': 261.63, 'U': 293.66, 'I': 329.63, 'O': 349.23, 'P': 392.00,
      'A1': 261.63, 'A2': 293.66, 'A3': 329.63, 'A4': 349.23, 'A5': 392.00,
      '1': 261.63, '2': 293.66, '3': 329.63, '4': 349.23, '5': 392.00,
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00,

      // Row 2 (Mid 5): A4 to E5 -> H, J, K, L, ;
      'H': 440.00, 'J': 493.88, 'K': 523.25, 'L': 587.33, ';': 659.25,
      'B1': 440.00, 'B2': 493.88, 'B3': 523.25, 'B4': 587.33, 'B5': 659.25,
      '6': 440.00, '7': 493.88, '8': 523.25, '9': 587.33, '10': 659.25,
      'A4': 440.00, 'B4': 493.88, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25,

      // Row 3 (Bot 5): F5 to C6 -> B, N, M, ,, .
      'B': 698.46, 'N': 783.99, 'M': 880.00, ',': 987.77, '.': 1046.50,
      'C1': 698.46, 'C2': 783.99, 'C3': 880.00, 'C4_SKY': 987.77, 'C5_SKY': 1046.50,
      '11': 698.46, '12': 783.99, '13': 880.00, '14': 987.77, '15': 1046.50,
      'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77, 'C6': 1046.50
    };

    this.pitchFrequencies = this.genshinFrequencies;
  }

  setInstrument(instrument) {
    this.currentInstrument = instrument || 'genshin';
    if (instrument === 'sky_steam') {
      this.pitchFrequencies = this.skySteamFrequencies;
    } else if (instrument === 'sky' || instrument === 'sky_qwert') {
      this.pitchFrequencies = this.skyQwertFrequencies;
    } else {
      this.pitchFrequencies = this.genshinFrequencies;
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && !this.masterCompressor) {
      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
      this.masterCompressor.knee.setValueAtTime(10, this.ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.masterCompressor.release.setValueAtTime(0.20, this.ctx.currentTime);
      this.masterCompressor.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playKey(keyChar) {
    this.init();
    if (!this.ctx) return;
    const raw = String(keyChar).trim();
    const lookupKey = (raw.length === 1 && raw.match(/[a-zA-Z]/)) ? raw.toUpperCase() : raw;
    let freq = this.pitchFrequencies[lookupKey];

    // Fallbacks across tables
    if (!freq) freq = this.skyQwertFrequencies[lookupKey];
    if (!freq) freq = this.genshinFrequencies[lookupKey];
    if (!freq) return;

    const now = this.ctx.currentTime;
    const isSky = this.currentInstrument && this.currentInstrument.startsWith('sky');

    // Filter node for natural acoustic shaping
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';

    if (isSky) {
      // -------------------------------------------------------------
      // Authentic Sky: Children of the Light Ethereal Acoustic Harp
      // Rich fundamental + octave overtone + delicate bell shimmer
      // -------------------------------------------------------------
      const oscPrimary = this.ctx.createOscillator();
      const oscHarmonic = this.ctx.createOscillator();
      const oscChime = this.ctx.createOscillator();

      const gainPrimary = this.ctx.createGain();
      const gainHarmonic = this.ctx.createGain();
      const gainChime = this.ctx.createGain();

      // Frequencies
      oscPrimary.type = 'sine';
      oscPrimary.frequency.setValueAtTime(freq, now);

      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(freq * 2, now);

      oscChime.type = 'sine';
      oscChime.frequency.setValueAtTime(freq * 3, now);

      // Lowpass sweep mimicking Sky temple acoustics
      filter.frequency.setValueAtTime(3600, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 1.8);
      filter.Q.setValueAtTime(1.2, now);

      // Warm attack & dreamy lingering sustain
      gainPrimary.gain.setValueAtTime(0.001, now);
      gainPrimary.gain.linearRampToValueAtTime(0.22, now + 0.012);
      gainPrimary.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

      gainHarmonic.gain.setValueAtTime(0.001, now);
      gainHarmonic.gain.linearRampToValueAtTime(0.09, now + 0.008);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      gainChime.gain.setValueAtTime(0.001, now);
      gainChime.gain.linearRampToValueAtTime(0.035, now + 0.006);
      gainChime.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      // Connect graph
      oscPrimary.connect(gainPrimary);
      oscHarmonic.connect(gainHarmonic);
      oscChime.connect(gainChime);

      gainPrimary.connect(filter);
      gainHarmonic.connect(filter);
      gainChime.connect(filter);

      filter.connect(this.masterCompressor || this.ctx.destination);

      oscPrimary.start(now);
      oscHarmonic.start(now);
      oscChime.start(now);

      oscPrimary.stop(now + 2.1);
      oscHarmonic.stop(now + 1.0);
      oscChime.stop(now + 0.5);
    } else {
      // -------------------------------------------------------------
      // Genshin Impact Lyre: Crisp, resonant plucked string
      // -------------------------------------------------------------
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const gain2 = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq * 2, now);

      filter.frequency.setValueAtTime(5000, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 1.2);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.linearRampToValueAtTime(0.04, now + 0.004);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(gain);
      osc2.connect(gain2);

      gain.connect(filter);
      gain2.connect(filter);

      filter.connect(this.masterCompressor || this.ctx.destination);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 1.35);
      osc2.stop(now + 0.55);
    }
  }
}

const synth = new LyreAudioSynthesizer();

// ------------------------------------------------------------------
// Floating Glass Toast Notification
// ------------------------------------------------------------------
function showToast(message, type = 'success', duration = 3200) {
  const container = document.getElementById('glass-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `glass-toast ${type}`;
  const icon = type === 'danger' ? '🗑️' : (type === 'warning' ? '⚠️' : '✨');
  toast.innerHTML = `<span style="font-size: 16px;">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 320);
  }, duration);
}

// ------------------------------------------------------------------
// Custom Liquid Glass Confirmation Modal
// ------------------------------------------------------------------
function showCustomConfirm({ title, subtitle, message, targetName, confirmText, cancelText, isDanger = true }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-confirm-modal');
    const elTitle = document.getElementById('modal-title');
    const elSubtitle = document.getElementById('modal-subtitle');
    const elMessage = document.getElementById('modal-message');
    const elTargetName = document.getElementById('modal-target-name');
    const btnConfirm = document.getElementById('btn-modal-confirm');
    const btnCancel = document.getElementById('btn-modal-cancel');
    const btnClose = document.getElementById('btn-modal-close');

    if (!modal) {
      resolve(window.confirm(`${message || ''} ${targetName || ''}`));
      return;
    }

    if (title && elTitle) elTitle.textContent = title;
    if (subtitle && elSubtitle) elSubtitle.textContent = subtitle;
    if (message && elMessage) elMessage.textContent = message;
    if (targetName && elTargetName) elTargetName.textContent = targetName;
    if (confirmText && btnConfirm) {
      const span = btnConfirm.querySelector('span');
      if (span) span.textContent = confirmText;
    }
    if (cancelText && btnCancel) btnCancel.textContent = cancelText;

    if (btnConfirm) {
      if (isDanger) {
        btnConfirm.classList.add('danger');
      } else {
        btnConfirm.classList.remove('danger');
      }
    }

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', handleKey);
      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
      if (btnClose) btnClose.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdropClick);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onBackdropClick = (e) => {
      if (e.target === modal) {
        onCancel();
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
    if (btnClose) btnClose.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdropClick);
    document.addEventListener('keydown', handleKey);

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    btnCancel.focus();
  });
}

// Application State
const state = {
  currentSong: null,
  songsList: [],
  activeCategory: 'All',
  searchQuery: '',
  isPlaying: false,
  isSeeking: false,
  transpose: 0,
  speed: 1.0,
  isAdmin: false,
  inAppSoundEnabled: true, // Default: ON (audible sound in app + sends keys to game)
  playbackMode: 'stop', // 'stop' (Default: stop after 1 song), 'loop', 'next'
  targetInstrument: 'genshin', // 'genshin', 'sky', 'sky_steam'
  countdownTimer: null,
  currentView: 'library',
  isWebMode: false
};

// DOM References
const elements = {
  navItems: document.querySelectorAll('.nav-item'),
  viewPanes: document.querySelectorAll('.view-pane'),
  selectInstrument: document.getElementById('game-instrument-select'),
  searchInput: document.getElementById('library-search-input'),
  btnSearchClear: document.getElementById('btn-search-clear'),
  searchShortcutBadge: document.getElementById('search-shortcut-badge'),
  chips: document.querySelectorAll('.category-tab, .chip'),
  headingCatTitle: document.getElementById('heading-cat-title'),
  headingCatCount: document.getElementById('heading-cat-count'),
  countAll: document.getElementById('count-all'),
  countCustom: document.getElementById('count-custom'),
  countGenshin: document.getElementById('count-genshin'),
  countAnime: document.getElementById('count-anime'),
  countClassic: document.getElementById('count-classic'),
  countPop: document.getElementById('count-pop'),
  countFav: document.getElementById('count-fav'),
  songCardsList: document.getElementById('song-cards-list'),
  btnImportMidi: document.getElementById('btn-import-midi'),
  btnOpenFolder: document.getElementById('btn-open-folder'),
  // Player Bar
  barSongTitle: document.getElementById('bar-song-title'),
  barSongMeta: document.getElementById('bar-song-meta'),
  btnBarPlay: document.getElementById('btn-bar-play'),
  btnCountdownPlay: document.getElementById('btn-countdown-play'),
  btnToggleSound: document.getElementById('btn-toggle-sound'),
  btnPlayMode: document.getElementById('btn-play-mode'),
  btnBarStop: document.getElementById('btn-bar-stop'),
  btnBarPrev: document.getElementById('btn-bar-prev'),
  btnBarNext: document.getElementById('btn-bar-next'),
  barProgressSlider: document.getElementById('bar-progress-slider'),
  lblBarCur: document.getElementById('lbl-bar-cur'),
  lblBarTot: document.getElementById('lbl-bar-tot'),
  badgeTranspose: document.getElementById('badge-transpose'),
  badgeSpeed: document.getElementById('badge-speed'),
  btnBarOverlay: document.getElementById('btn-bar-overlay'),
  btnLaunchOverlay: document.getElementById('btn-launch-overlay'),
  lyreBoard: document.getElementById('lyre-board'),
  lyreTitle: document.querySelector('.lyre-header h2'),
  // Mixer
  sliderTranspose: document.getElementById('slider-transpose'),
  valTranspose: document.getElementById('val-transpose'),
  btnAutoKey: document.getElementById('btn-auto-key'),
  sliderSpeed: document.getElementById('slider-speed'),
  valSpeed: document.getElementById('val-speed'),
  chkGenshinOnly: document.getElementById('chk-genshin-only'),
  mixerTracksContainer: document.getElementById('mixer-tracks-container'),
  // Keys
  glassKeys: document.querySelectorAll('.glass-key'),
  // Titlebar
  btnWinMin: document.getElementById('btn-win-min'),
  btnWinMax: document.getElementById('btn-win-max'),
  btnWinClose: document.getElementById('btn-win-close'),
  btnElevateAdmin: document.getElementById('btn-elevate-admin'),
  adminStatusBadge: document.getElementById('admin-status-badge'),
  adminText: document.getElementById('admin-text'),
  // Custom Instrument Dropdown
  instrumentDropdown: document.getElementById('instrument-dropdown'),
  dropdownTriggerInstrument: document.getElementById('dropdown-trigger-instrument'),
  instrumentDropdownMenu: document.getElementById('instrument-dropdown-menu'),
  triggerInstIcon: document.getElementById('trigger-inst-icon'),
  triggerInstTitle: document.getElementById('trigger-inst-title'),
  triggerInstSub: document.getElementById('trigger-inst-sub'),
  // Mobile & PWA
  mobileNavBtns: document.querySelectorAll('.mobile-nav-btn'),
  btnPwaInstall: document.getElementById('btn-pwa-install')
};

// Global capture blockers: prevent pywebview body mousedown from capturing interactive controls
window.addEventListener('mousedown', (e) => {
  if (e.target.closest('button, input, select, .titlebar-controls, .player-bar, .scrubber-row, .glass-modal-container, .glass-modal-backdrop, .pywebview-no-drag, [data-no-drag]')) {
    e.stopPropagation();
  }
}, true);
window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, input, select, .titlebar-controls, .player-bar, .scrubber-row, .glass-modal-container, .glass-modal-backdrop, .pywebview-no-drag, [data-no-drag]')) {
    e.stopPropagation();
  }
}, true);

let bridgeInitialized = false;

function onPywebviewReady() {
  if (bridgeInitialized) return;
  if (window.pywebview && window.pywebview.api) {
    bridgeInitialized = true;
    if (window.pywebview.api.set_playback_mode) {
      window.pywebview.api.set_playback_mode(state.playbackMode || 'stop');
    }
    if (window.pywebview.api.set_target_instrument) {
      window.pywebview.api.set_target_instrument(state.targetInstrument || 'genshin');
    }
    refreshLibraryFromBackend();
    loadHotkeysFromBackend();
  }
}

// Global pywebviewready listener (in case it fires before DOMContentLoaded)
window.addEventListener('pywebviewready', onPywebviewReady);

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupMobileNavigation();
  setupInstrumentSelector();
  setupPlayerControls();
  setupSearchAndFilters();
  setupMixerControls();
  setupGlassKeys();
  setupMobileTouchLyre();
  setupTitlebar();
  setupDragAndDrop();
  setupHotkeySettings();
  setupPwaInstall();

  onPywebviewReady();
  setTimeout(onPywebviewReady, 50);
  setTimeout(onPywebviewReady, 150);
  setTimeout(onPywebviewReady, 400);

  // Standalone Mobile / Web fallback
  setTimeout(() => {
    if (!bridgeInitialized && (!window.pywebview || !window.pywebview.api)) {
      initStandaloneMobileMode();
    }
  }, 450);
});

function refreshLibraryFromBackend(targetSongId = null) {
  if (!window.pywebview || !window.pywebview.api) return;
  window.pywebview.api.get_library_data().then(data => {
    state.songsList = data.songs || [];
    state.isAdmin = data.is_admin || false;

    if (targetSongId) {
      // Auto-switch to 'All' category so imported songs are immediately visible
      state.activeCategory = 'All';
      elements.chips.forEach(c => {
        if (c.getAttribute('data-category') === 'All') c.classList.add('active');
        else c.classList.remove('active');
      });
    }

    if (targetSongId) {
      const cleanTarget = targetSongId.replace(/\.(mid|midi)$/i, '').trim().toLowerCase();
      const match = state.songsList.find(s => {
        const sid = (s.id || '').toLowerCase();
        const stitle = (s.title || '').toLowerCase();
        return sid === cleanTarget || 
               stitle === cleanTarget || 
               sid.includes(cleanTarget) || 
               cleanTarget.includes(sid) ||
               stitle.includes(cleanTarget) ||
               cleanTarget.includes(stitle);
      });
      if (match) {
        selectSong(match, false);
        setTimeout(() => {
          const activeCard = document.querySelector(`.song-card.playing`);
          if (activeCard) activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } else if (state.songsList.length > 0 && !state.currentSong) {
      const first = state.songsList[0];
      state.currentSong = first;
      elements.barSongTitle.textContent = first.title;
      elements.barSongMeta.textContent = `${first.artist_or_game} • ${first.bpm} BPM`;
      const durM = Math.floor(first.duration_seconds / 60);
      const durS = Math.floor(first.duration_seconds % 60);
      elements.lblBarTot.textContent = `${String(durM).padStart(2, '0')}:${String(durS).padStart(2, '0')}`;
      elements.barProgressSlider.max = first.duration_seconds;
      elements.barProgressSlider.value = 0;
      updateScrubberTimeLabel(0);
      updateScrubberVisual(0, first.duration_seconds);

      renderSongCards();
      renderAdminStatus();

      if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.load_song(first.id, false).then(info => {
          if (info) {
            state.transpose = info.recommended_transpose || 0;
            elements.sliderTranspose.value = state.transpose;
            elements.valTranspose.textContent = `${state.transpose > 0 ? '+' : ''}${state.transpose} st`;
            elements.badgeTranspose.textContent = `${state.transpose > 0 ? '+' : ''}${state.transpose} st`;
            renderTracksList(info.tracks || []);
          }
        });
      }
      return;
    }

    renderSongCards();
    renderAdminStatus();
  });
}

// ------------------------------------------------------------------
// 1. Navigation Setup (Desktop & Mobile)
// ------------------------------------------------------------------
function switchView(targetView) {
  state.currentView = targetView;
  elements.navItems.forEach(n => {
    if (n.getAttribute('data-view') === targetView) n.classList.add('active');
    else n.classList.remove('active');
  });

  const mobileBtns = document.querySelectorAll('.mobile-nav-btn');
  mobileBtns.forEach(b => {
    if (b.getAttribute('data-view') === targetView) b.classList.add('active');
    else b.classList.remove('active');
  });

  elements.viewPanes.forEach(v => {
    if (v.id === `view-${targetView}`) v.classList.add('active');
    else v.classList.remove('active');
  });
}

function setupNavigation() {
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      switchView(targetView);
    });
  });
}

function setupMobileNavigation() {
  const mobileBtns = document.querySelectorAll('.mobile-nav-btn');
  mobileBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      switchView(targetView);
    });
  });
}

// ------------------------------------------------------------------
// 2. Song Cards, Filters & MIDI Import
// ------------------------------------------------------------------
function setupSearchAndFilters() {
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      const hasText = e.target.value.length > 0;
      if (elements.btnSearchClear) {
        elements.btnSearchClear.style.display = hasText ? 'flex' : 'none';
      }
      if (elements.searchShortcutBadge) {
        elements.searchShortcutBadge.style.display = hasText ? 'none' : 'flex';
      }
      renderSongCards();
    });

    elements.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        elements.searchInput.value = '';
        state.searchQuery = '';
        if (elements.btnSearchClear) elements.btnSearchClear.style.display = 'none';
        if (elements.searchShortcutBadge) elements.searchShortcutBadge.style.display = 'flex';
        elements.searchInput.blur();
        renderSongCards();
      }
    });
  }

  if (elements.btnSearchClear) {
    elements.btnSearchClear.addEventListener('click', () => {
      if (elements.searchInput) {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.btnSearchClear.style.display = 'none';
        if (elements.searchShortcutBadge) elements.searchShortcutBadge.style.display = 'flex';
        elements.searchInput.focus();
        renderSongCards();
      }
    });
  }

  // Hotkey: press '/' or 'Ctrl+F' to focus search bar
  window.addEventListener('keydown', (e) => {
    if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f')) && document.activeElement !== elements.searchInput) {
      if (elements.searchInput) {
        e.preventDefault();
        elements.searchInput.focus();
        elements.searchInput.select();
      }
    }
  });

  elements.chips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeCategory = chip.getAttribute('data-category');
      renderSongCards();
    });
  });

  // Hidden native file picker as backup
  let hiddenInput = document.getElementById('hidden-midi-file-input');
  if (!hiddenInput) {
    hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    hiddenInput.id = 'hidden-midi-file-input';
    hiddenInput.accept = '.mid,.midi,.txt,.json,.skysheet';
    hiddenInput.style.display = 'none';
    document.body.appendChild(hiddenInput);

    hiddenInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileImport(e.target.files[0]);
      }
    });
  }

  elements.btnImportMidi.addEventListener('click', () => {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.import_midi_file().then(res => {
        if (res && res.success) {
          showToast(`Đã import thành công "${res.title || res.filename}"!`, 'success');
          refreshLibraryFromBackend(res.song_id || res.filename);
        } else {
          hiddenInput.click();
        }
      }).catch(() => {
        hiddenInput.click();
      });
    } else {
      hiddenInput.click();
    }
  });

  if (elements.btnOpenFolder) {
    elements.btnOpenFolder.addEventListener('click', () => {
      if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.open_imported_folder();
      }
    });
  }
}

function handleFileImport(file) {
  if (!file) return;
  if (window.pywebview && window.pywebview.api) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      const base64Data = dataUrl.split(',')[1];
      window.pywebview.api.import_midi_base64(file.name, base64Data).then(res => {
        if (res && res.success) {
          showToast(`Đã import thành công "${res.title || file.name}"!`, 'success');
          refreshLibraryFromBackend(res.song_id || file.name);
        } else {
          showToast(`Lỗi import: ${res.error || 'Tệp không hợp lệ'}`, 'danger');
        }
      });
    };
    reader.readAsDataURL(file);
  } else if (window.ClientSheetParser) {
    // Standalone Mobile / Web parsing
    const isText = file.name.match(/\.(txt|json|skysheet)$/i);
    const reader = new FileReader();
    if (isText) {
      reader.onload = (e) => {
        try {
          const parsed = window.ClientSheetParser.parseTextSheet(e.target.result, file.name);
          saveMobileCustomSong(parsed);
        } catch (err) {
          showToast(`Lỗi đọc sheet: ${err.message}`, 'danger');
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        try {
          const parsed = window.ClientSheetParser.parseMidiBuffer(e.target.result, file.name);
          saveMobileCustomSong(parsed);
        } catch (err) {
          showToast(`Lỗi đọc MIDI: ${err.message}`, 'danger');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }
}

function setupDragAndDrop() {
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.boxShadow = 'inset 0 0 40px rgba(0, 229, 255, 0.4)';
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.boxShadow = 'none';
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.boxShadow = 'none';

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.mid') || file.name.toLowerCase().endsWith('.midi') || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.skysheet')) {
        handleFileImport(file);
      }
    }
  });
}

function updateCategoryBadges(filteredCount = 0) {
  const counts = {
    'All': state.songsList.length,
    'Custom': state.songsList.filter(s => s.category === 'Custom' || s.is_custom).length,
    'Genshin Impact': state.songsList.filter(s => s.category === 'Genshin Impact').length,
    'Anime & OST': state.songsList.filter(s => s.category === 'Anime & OST').length,
    'Classical': state.songsList.filter(s => s.category === 'Classical').length,
    'Pop / Meme': state.songsList.filter(s => s.category === 'Pop / Meme').length,
    'Favorites ❤️': state.songsList.filter(s => s.is_favorite).length
  };
  if (elements.countAll) elements.countAll.textContent = counts['All'];
  if (elements.countCustom) elements.countCustom.textContent = counts['Custom'];
  if (elements.countGenshin) elements.countGenshin.textContent = counts['Genshin Impact'];
  if (elements.countAnime) elements.countAnime.textContent = counts['Anime & OST'];
  if (elements.countClassic) elements.countClassic.textContent = counts['Classical'];
  if (elements.countPop) elements.countPop.textContent = counts['Pop / Meme'];
  if (elements.countFav) elements.countFav.textContent = counts['Favorites ❤️'];

  if (elements.headingCatTitle) {
    const titles = {
      'All': 'Tất cả bài hát',
      'Custom': 'Nhạc đã Import',
      'Genshin Impact': 'Genshin Impact',
      'Anime & OST': 'Anime & OST',
      'Classical': 'Classical',
      'Pop / Meme': 'Pop / Meme',
      'Favorites ❤️': 'Bài hát yêu thích'
    };
    elements.headingCatTitle.textContent = titles[state.activeCategory] || state.activeCategory;
  }
  if (elements.headingCatCount) {
    elements.headingCatCount.textContent = `${filteredCount} bài`;
  }
}

function renderSongCards() {
  elements.songCardsList.innerHTML = '';

  const filtered = state.songsList.filter(song => {
    if (state.activeCategory === 'Favorites ❤️' && !song.is_favorite) return false;
    if (state.activeCategory !== 'All' && state.activeCategory !== 'Favorites ❤️' && song.category !== state.activeCategory) return false;
    if (state.searchQuery) {
      const match = song.title.toLowerCase().includes(state.searchQuery) ||
                    song.artist_or_game.toLowerCase().includes(state.searchQuery) ||
                    song.category.toLowerCase().includes(state.searchQuery);
      if (!match) return false;
    }
    return true;
  });

  updateCategoryBadges(filtered.length);

  if (filtered.length === 0) {
    elements.songCardsList.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px;">
        Không tìm thấy bài hát nào phù hợp.
      </div>`;
    return;
  }

  filtered.forEach(song => {
    const card = document.createElement('div');
    card.className = `song-card ${state.currentSong && state.currentSong.id === song.id ? 'playing' : ''}`;
    
    const icon = song.category === 'Genshin Impact' ? '✨' : (song.category === 'Custom' ? '📥' : '🎵');
    const durM = Math.floor(song.duration_seconds / 60);
    const durS = Math.floor(song.duration_seconds % 60);
    const timeStr = `${String(durM).padStart(2, '0')}:${String(durS).padStart(2, '0')}`;
    const favIcon = song.is_favorite ? '❤️' : '🤍';

    card.innerHTML = `
      <div class="song-badge-icon">${icon}</div>
      <div class="song-info">
        <div class="song-title">${song.title}</div>
        <div class="song-meta">
          <span>${song.artist_or_game}</span>
          <span>•</span>
          <span>${timeStr}</span>
          <span>•</span>
          <span>${song.bpm} BPM</span>
        </div>
      </div>
      <div class="song-actions">
        <button class="btn-card-fav" data-id="${song.id}" title="Yêu thích">${favIcon}</button>
        <button class="btn-card-del" data-id="${song.id}" title="Xóa bài hát này khỏi thư viện">🗑️</button>
        <button class="btn-card-play" data-id="${song.id}">▶ Play</button>
      </div>
    `;

    card.querySelector('.btn-card-fav').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(song.id);
    });

    const btnDel = card.querySelector('.btn-card-del');
    if (btnDel) {
      btnDel.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await showCustomConfirm({
          title: "Xóa bài hát",
          subtitle: "Thao tác này sẽ xóa vĩnh viễn tệp MIDI",
          message: "Bạn có chắc chắn muốn xóa bài hát này khỏi thư viện nhạc?",
          targetName: song.title,
          confirmText: "Xóa vĩnh viễn",
          cancelText: "Hủy bỏ",
          isDanger: true
        });

        if (confirmed) {
          if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.delete_song(song.id).then(res => {
              if (res && res.success) {
                showToast(`Đã xóa vĩnh viễn "${song.title}"`, 'danger');
                refreshLibraryFromBackend();
              }
            });
          } else {
            // Delete custom song in mobile mode
            let customList = [];
            try {
              customList = JSON.parse(localStorage.getItem('gs_mobile_custom_songs') || '[]');
            } catch (e) {}
            customList = customList.filter(s => s.id !== song.id);
            try {
              localStorage.setItem('gs_mobile_custom_songs', JSON.stringify(customList));
            } catch (e) {}
            state.songsList = state.songsList.filter(s => s.id !== song.id);
            showToast(`Đã xóa "${song.title}"`, 'danger');
            renderSongCards();
            renderCategoryCounts();
          }
        }
      });
    }

    card.querySelector('.btn-card-play').addEventListener('click', (e) => {
      e.stopPropagation();
      synth.init();
      selectSong(song, true);
    });

    card.addEventListener('click', () => {
      synth.init();
      selectSong(song, false);
    });

    elements.songCardsList.appendChild(card);
  });
}

function toggleFavorite(songId) {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.toggle_favorite(songId).then(isFav => {
      const s = state.songsList.find(x => x.id === songId);
      if (s) {
        s.is_favorite = isFav;
        showToast(isFav ? `Đã thêm "${s.title}" vào Yêu thích ❤️` : `Đã bỏ yêu thích "${s.title}"`, 'success');
      }
      renderSongCards();
      renderCategoryCounts();
    });
  } else {
    const s = state.songsList.find(x => x.id === songId);
    if (s) {
      s.is_favorite = !s.is_favorite;
      let favs = [];
      try {
        favs = JSON.parse(localStorage.getItem('gs_favorites') || '[]');
      } catch (e) {}
      if (s.is_favorite) {
        if (!favs.includes(songId)) favs.push(songId);
      } else {
        favs = favs.filter(id => id !== songId);
      }
      try {
        localStorage.setItem('gs_favorites', JSON.stringify(favs));
      } catch (e) {}
      showToast(s.is_favorite ? `Đã thêm "${s.title}" vào Yêu thích ❤️` : `Đã bỏ yêu thích "${s.title}"`, 'success');
      renderSongCards();
      renderCategoryCounts();
    }
  }
}

function updateScrubberVisual(curSec, maxSec) {
  if (!elements.barProgressSlider) return;
  const total = maxSec || parseFloat(elements.barProgressSlider.max) || 1;
  const pct = Math.min(100, Math.max(0, (curSec / total) * 100));
  elements.barProgressSlider.style.background = `linear-gradient(to right, #00E5FF 0%, #00E5FF ${pct}%, rgba(255, 255, 255, 0.12) ${pct}%, rgba(255, 255, 255, 0.12) 100%)`;
}

function updateScrubberTimeLabel(curSec) {
  if (!elements.lblBarCur) return;
  const curM = Math.floor(curSec / 60);
  const curS = Math.floor(curSec % 60);
  elements.lblBarCur.textContent = `${String(curM).padStart(2, '0')}:${String(curS).padStart(2, '0')}`;
}

function selectSong(song, autoPlay = false) {
  state.currentSong = song;
  elements.barSongTitle.textContent = song.title;
  elements.barSongMeta.textContent = `${song.artist_or_game} • ${song.bpm} BPM`;

  const durM = Math.floor(song.duration_seconds / 60);
  const durS = Math.floor(song.duration_seconds % 60);
  elements.lblBarTot.textContent = `${String(durM).padStart(2, '0')}:${String(durS).padStart(2, '0')}`;
  elements.barProgressSlider.max = song.duration_seconds;
  elements.barProgressSlider.step = "0.05";
  elements.barProgressSlider.value = 0;
  updateScrubberTimeLabel(0);
  updateScrubberVisual(0, song.duration_seconds);

  renderSongCards();

  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.load_song(song.id, autoPlay).then(info => {
      if (info) {
        state.transpose = info.recommended_transpose || 0;
        elements.sliderTranspose.value = state.transpose;
        elements.valTranspose.textContent = `${state.transpose > 0 ? '+' : ''}${state.transpose} st`;
        elements.badgeTranspose.textContent = `${state.transpose > 0 ? '+' : ''}${state.transpose} st`;
        if (info.speed) {
          state.speed = info.speed;
          if (elements.sliderSpeed) elements.sliderSpeed.value = state.speed;
          if (elements.valSpeed) elements.valSpeed.textContent = `${state.speed.toFixed(2)}x`;
          if (elements.badgeSpeed) elements.badgeSpeed.textContent = `${state.speed.toFixed(2)}x`;
        }
        renderTracksList(info.tracks || []);
      }
    });
  } else if (standalonePlayer) {
    const info = standalonePlayer.loadSong(song, autoPlay);
    state.transpose = info.recommended_transpose || 0;
    if (elements.sliderTranspose) elements.sliderTranspose.value = state.transpose;
    if (elements.valTranspose) elements.valTranspose.textContent = `${state.transpose > 0 ? '+' : ''}${state.transpose} st`;
    if (elements.badgeTranspose) elements.badgeTranspose.textContent = `${state.transpose > 0 ? '+' : ''}${state.transpose} st`;
  }
}

// ------------------------------------------------------------------
// 3. Player Bar & Controls
// ------------------------------------------------------------------
function setupPlayerControls() {
  elements.btnBarPlay.addEventListener('click', () => {
    synth.init();
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.toggle_play_pause();
    } else if (standalonePlayer) {
      if (standalonePlayer.state === 'PLAYING') {
        standalonePlayer.pause();
      } else if (standalonePlayer.state === 'PAUSED') {
        standalonePlayer.resume();
      } else {
        standalonePlayer.play();
      }
    }
  });

  // Countdown Play (3 seconds delay to focus Chrome or Game)
  if (elements.btnCountdownPlay) {
    elements.btnCountdownPlay.addEventListener('click', () => {
      synth.init();
      if (state.countdownTimer) {
        clearInterval(state.countdownTimer);
        state.countdownTimer = null;
        elements.btnCountdownPlay.textContent = '⏱️ Play sau 3s';
        return;
      }

      let count = 3;
      elements.btnCountdownPlay.textContent = `Bấm sang Chrome: ${count}s...`;
      elements.btnCountdownPlay.style.background = 'linear-gradient(135deg, #FFC72C, #FFA000)';
      elements.btnCountdownPlay.style.color = '#08070F';

      state.countdownTimer = setInterval(() => {
        count -= 1;
        if (count > 0) {
          elements.btnCountdownPlay.textContent = `Bấm sang Chrome: ${count}s...`;
        } else {
          clearInterval(state.countdownTimer);
          state.countdownTimer = null;
          elements.btnCountdownPlay.textContent = '⏱️ Play sau 3s';
          elements.btnCountdownPlay.style.background = 'rgba(0, 229, 255, 0.15)';
          elements.btnCountdownPlay.style.color = 'var(--cyan)';
          if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.toggle_play_pause();
          }
        }
      }, 1000);
    });
  }

  // In-App Sound Preview Toggle
  if (elements.btnToggleSound) {
    elements.btnToggleSound.textContent = state.inAppSoundEnabled ? '🔊' : '🔇';
    elements.btnToggleSound.style.color = state.inAppSoundEnabled ? 'var(--cyan)' : 'var(--text-dim)';

    elements.btnToggleSound.addEventListener('click', () => {
      synth.init();
      state.inAppSoundEnabled = !state.inAppSoundEnabled;
      if (state.inAppSoundEnabled) {
        elements.btnToggleSound.textContent = '🔊';
        elements.btnToggleSound.title = 'Âm thanh trong App: ĐANG BẬT (Bấm để Tắt)';
        elements.btnToggleSound.style.color = 'var(--cyan)';
      } else {
        elements.btnToggleSound.textContent = '🔇';
        elements.btnToggleSound.title = 'Âm thanh trong App: ĐANG TẮT (Chỉ gõ phím vào Chrome/Game)';
        elements.btnToggleSound.style.color = 'var(--text-dim)';
      }
    });
  }

  // Playback Mode: stop (Default: auto stop after 1 song) -> loop -> next
  if (elements.btnPlayMode) {
    const updatePlayModeUI = (mode) => {
      state.playbackMode = mode;
      if (mode === 'loop') {
        elements.btnPlayMode.textContent = '🔁';
        elements.btnPlayMode.title = 'Chế độ phát: Lặp lại bài này liên tục';
        elements.btnPlayMode.style.color = 'var(--gold)';
      } else if (mode === 'next') {
        elements.btnPlayMode.textContent = '⏭️';
        elements.btnPlayMode.title = 'Chế độ phát: Tự chuyển bài tiếp theo';
        elements.btnPlayMode.style.color = 'var(--purple)';
      } else {
        // default 'stop'
        elements.btnPlayMode.textContent = '⏹️';
        elements.btnPlayMode.title = 'Chế độ phát: Dừng sau khi hết bài (Mặc định)';
        elements.btnPlayMode.style.color = 'var(--cyan)';
      }
    };

    updatePlayModeUI(state.playbackMode || 'stop');

    elements.btnPlayMode.addEventListener('click', () => {
      let nextMode = 'stop';
      if (state.playbackMode === 'stop') nextMode = 'loop';
      else if (state.playbackMode === 'loop') nextMode = 'next';
      else nextMode = 'stop';

      updatePlayModeUI(nextMode);

      if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.set_playback_mode(nextMode);
      }

      const toastMessages = {
        'stop': '⏹️ Đã đặt: Tự dừng lại sau khi chơi xong bài (Mặc định)',
        'loop': '🔁 Đã đặt: Lặp lại bài này liên tục',
        'next': '⏭️ Đã đặt: Tự động phát bài tiếp theo'
      };
      showToast(toastMessages[nextMode] || 'Đã đổi chế độ phát', 'success');
    });
  }

  elements.btnBarStop.addEventListener('click', () => {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.stop_playback();
    } else if (standalonePlayer) {
      standalonePlayer.stop();
    }
  });

  elements.btnBarNext.addEventListener('click', () => {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.play_next_song();
    } else {
      playNextSong();
    }
  });

  elements.btnBarPrev.addEventListener('click', () => {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.play_prev_song();
    } else {
      playPrevSong();
    }
  });

  state.isSeeking = false;
  state.lastSeekTimestamp = 0;
  let lastCommittedSec = -1;
  let lastCommitTime = 0;

  const commitSeek = (targetSec) => {
    const now = Date.now();
    if (now - lastCommitTime < 80 && Math.abs(targetSec - lastCommittedSec) < 0.05) {
      return;
    }
    lastCommitTime = now;
    lastCommittedSec = targetSec;
    state.lastSeekTimestamp = now;
    updateScrubberTimeLabel(targetSec);
    updateScrubberVisual(targetSec);
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.seek(targetSec);
    } else if (standalonePlayer) {
      standalonePlayer.seek(targetSec);
    }
    // Giữ cờ seeking trong 250ms để tránh các message progress cũ làm giật thanh trượt
    setTimeout(() => {
      state.isSeeking = false;
    }, 250);
  };

  // Prevent mousedown/pointerdown from initiating a pywebview window drag!
  ['pointerdown', 'mousedown', 'touchstart'].forEach(evt => {
    elements.barProgressSlider.addEventListener(evt, (e) => {
      e.stopPropagation();
      state.isSeeking = true;
    });
  });

  elements.barProgressSlider.addEventListener('input', (e) => {
    state.isSeeking = true;
    const targetSec = parseFloat(e.target.value) || 0;
    updateScrubberTimeLabel(targetSec);
    updateScrubberVisual(targetSec);
  });

  elements.barProgressSlider.addEventListener('change', (e) => {
    const targetSec = parseFloat(e.target.value) || 0;
    commitSeek(targetSec);
  });

  const handleSeekRelease = () => {
    if (state.isSeeking) {
      const targetSec = parseFloat(elements.barProgressSlider.value) || 0;
      commitSeek(targetSec);
    }
  };

  elements.barProgressSlider.addEventListener('pointerup', handleSeekRelease);
  elements.barProgressSlider.addEventListener('mouseup', handleSeekRelease);
  elements.barProgressSlider.addEventListener('touchend', handleSeekRelease);

  elements.btnBarOverlay.addEventListener('click', launchOverlay);
  elements.btnLaunchOverlay.addEventListener('click', launchOverlay);
}

function launchOverlay() {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.launch_floating_overlay();
  }
}

// ------------------------------------------------------------------
// 4. Mixer & Tuning
// ------------------------------------------------------------------
function setupMixerControls() {
  elements.sliderTranspose.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    state.transpose = val;
    elements.valTranspose.textContent = `${val > 0 ? '+' : ''}${val} st`;
    elements.badgeTranspose.textContent = `${val > 0 ? '+' : ''}${val} st`;
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_transpose(val);
    }
  });

  elements.btnAutoKey.addEventListener('click', () => {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.auto_transpose().then(val => {
        state.transpose = val;
        elements.sliderTranspose.value = val;
        elements.valTranspose.textContent = `${val > 0 ? '+' : ''}${val} st`;
        elements.badgeTranspose.textContent = `${val > 0 ? '+' : ''}${val} st`;
      });
    }
  });

  elements.sliderSpeed.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.speed = val;
    elements.valSpeed.textContent = `${val.toFixed(2)}x`;
    elements.badgeSpeed.textContent = `${val.toFixed(1)}x`;
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_speed(val);
    } else if (standalonePlayer) {
      standalonePlayer.setSpeed(val);
    }
  });

  elements.chkGenshinOnly.addEventListener('change', (e) => {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_genshin_only(e.target.checked);
    }
  });
}

function renderTracksList(tracks) {
  elements.mixerTracksContainer.innerHTML = '';
  if (!tracks || tracks.length === 0) {
    elements.mixerTracksContainer.innerHTML = '<div style="color: var(--text-muted); padding: 10px;">No tracks found.</div>';
    return;
  }

  tracks.forEach(trk => {
    const item = document.createElement('div');
    item.className = 'track-item';
    const isDrum = trk.channel === 9;
    item.innerHTML = `
      <input type="checkbox" id="trk-${trk.index}" ${trk.enabled ? 'checked' : ''} style="accent-color: var(--cyan); width: 16px; height: 16px;">
      <label for="trk-${trk.index}" style="flex: 1; cursor: pointer;">
        <span style="font-weight: 600; color: ${isDrum ? 'var(--text-muted)' : 'white'};">${trk.name}</span>
        <span style="font-size: 11px; color: var(--text-dim); margin-left: 8px;">[${trk.note_count} notes]</span>
      </label>
    `;

    item.querySelector('input').addEventListener('change', (e) => {
      if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.toggle_track(trk.index, e.target.checked);
      }
    });

    elements.mixerTracksContainer.appendChild(item);
  });
}

// ------------------------------------------------------------------
// 5. Liquid Glass Keys & Multi-Instrument Visual Lyre Board
// ------------------------------------------------------------------
const INSTRUMENT_LAYOUTS = {
  genshin: {
    title: 'WINDSONG LYRE • 21 NATURAL KEYS',
    subtitle: 'Genshin Impact (3 Quãng tám C3-B5: Q-U, A-J, Z-M)',
    rows: [
      {
        tag: 'Oct 5',
        keys: [
          { key: 'Q', note: 'Do5' },
          { key: 'W', note: 'Re5' },
          { key: 'E', note: 'Mi5' },
          { key: 'R', note: 'Fa5' },
          { key: 'T', note: 'Sol5' },
          { key: 'Y', note: 'La5' },
          { key: 'U', note: 'Si5' }
        ]
      },
      {
        tag: 'Oct 4',
        keys: [
          { key: 'A', note: 'Do4' },
          { key: 'S', note: 'Re4' },
          { key: 'D', note: 'Mi4' },
          { key: 'F', note: 'Fa4' },
          { key: 'G', note: 'Sol4' },
          { key: 'H', note: 'La4' },
          { key: 'J', note: 'Si4' }
        ]
      },
      {
        tag: 'Oct 3',
        keys: [
          { key: 'Z', note: 'Do3' },
          { key: 'X', note: 'Re3' },
          { key: 'C', note: 'Mi3' },
          { key: 'V', note: 'Fa3' },
          { key: 'B', note: 'Sol3' },
          { key: 'N', note: 'La3' },
          { key: 'M', note: 'Si3' }
        ]
      }
    ]
  },
  sky: {
    title: 'SKY COTL • 15 KEYS (Q-T, A-G, Z-B)',
    subtitle: 'Sky Studio / Specy / Macro Layout (2 Quãng tám C4-C6)',
    rows: [
      {
        tag: 'Hàng 1',
        keys: [
          { key: 'Q', note: 'Do4' },
          { key: 'W', note: 'Re4' },
          { key: 'E', note: 'Mi4' },
          { key: 'R', note: 'Fa4' },
          { key: 'T', note: 'Sol4' }
        ]
      },
      {
        tag: 'Hàng 2',
        keys: [
          { key: 'A', note: 'La4' },
          { key: 'S', note: 'Si4' },
          { key: 'D', note: 'Do5' },
          { key: 'F', note: 'Re5' },
          { key: 'G', note: 'Mi5' }
        ]
      },
      {
        tag: 'Hàng 3',
        keys: [
          { key: 'Z', note: 'Fa5' },
          { key: 'X', note: 'Sol5' },
          { key: 'C', note: 'La5' },
          { key: 'V', note: 'Si5' },
          { key: 'B', note: 'Do6' }
        ]
      }
    ]
  },
  sky_steam: {
    title: 'SKY COTL • 15 KEYS (Y-P, H-;, B-.)',
    subtitle: 'Official Steam PC Layout (2 Quãng tám C4-C6)',
    rows: [
      {
        tag: 'Hàng 1',
        keys: [
          { key: 'Y', note: 'Do4' },
          { key: 'U', note: 'Re4' },
          { key: 'I', note: 'Mi4' },
          { key: 'O', note: 'Fa4' },
          { key: 'P', note: 'Sol4' }
        ]
      },
      {
        tag: 'Hàng 2',
        keys: [
          { key: 'H', note: 'La4' },
          { key: 'J', note: 'Si4' },
          { key: 'K', note: 'Do5' },
          { key: 'L', note: 'Re5' },
          { key: ';', note: 'Mi5' }
        ]
      },
      {
        tag: 'Hàng 3',
        keys: [
          { key: 'B', note: 'Fa5' },
          { key: 'N', note: 'Sol5' },
          { key: 'M', note: 'La5' },
          { key: ',', note: 'Si5' },
          { key: '.', note: 'Do6' }
        ]
      }
    ]
  }
};

const glassKeyMap = {};

function renderVisualLyre(instrument = state.targetInstrument) {
  const layout = INSTRUMENT_LAYOUTS[instrument] || INSTRUMENT_LAYOUTS.genshin;
  if (elements.lyreTitle) {
    elements.lyreTitle.textContent = layout.title;
  }
  const subtitleEl = document.querySelector('.lyre-header span');
  if (subtitleEl) {
    subtitleEl.textContent = layout.subtitle;
  }

  if (!elements.lyreBoard) return;
  elements.lyreBoard.innerHTML = '';
  for (const k in glassKeyMap) {
    delete glassKeyMap[k];
  }

  layout.rows.forEach(rowData => {
    const rowEl = document.createElement('div');
    rowEl.className = 'lyre-row';

    const tagEl = document.createElement('div');
    tagEl.className = 'row-tag';
    tagEl.textContent = rowData.tag;
    rowEl.appendChild(tagEl);

    rowData.keys.forEach(kData => {
      const keyEl = document.createElement('div');
      keyEl.className = 'glass-key';
      keyEl.setAttribute('data-key', kData.key);
      keyEl.innerHTML = `<span class="key-letter">${kData.key}</span><span class="key-note">${kData.note}</span>`;

      const lookup = (kData.key.length === 1 && kData.key.match(/[a-zA-Z]/)) ? kData.key.toUpperCase() : kData.key;
      glassKeyMap[lookup] = keyEl;
      glassKeyMap[kData.key] = keyEl;

      keyEl.addEventListener('click', () => {
        triggerKeyVisual(kData.key);
        if (state.inAppSoundEnabled) {
          synth.playKey(kData.key);
        }
        if (window.pywebview && window.pywebview.api) {
          window.pywebview.api.press_key_manually(kData.key);
        }
      });

      rowEl.appendChild(keyEl);
    });

    elements.lyreBoard.appendChild(rowEl);
  });
}

function setupGlassKeys() {
  renderVisualLyre(state.targetInstrument);
}

function triggerKeyVisual(keyChar) {
  // Performance optimization: skip DOM updates if Visual Lyre view is not active
  if (state.currentView !== 'lyre') return;
  const lookup = (keyChar.length === 1 && keyChar.match(/[a-zA-Z]/)) ? keyChar.toUpperCase() : keyChar;
  const el = glassKeyMap[lookup] || glassKeyMap[keyChar] || document.querySelector(`.glass-key[data-key="${keyChar}"]`);
  if (!el) return;
  el.classList.add('active-strike');
  setTimeout(() => {
    el.classList.remove('active-strike');
  }, 120);
}

const INSTRUMENT_META = {
  'genshin': {
    title: 'Genshin Lyre',
    subtitle: '21 Phím: Q-U, A-J, Z-M',
    icon: '🪕',
    name: 'Genshin Lyre (21 Phím)'
  },
  'sky': {
    title: 'Sky COTL (QWERT)',
    subtitle: '15 Phím: Q-T, A-G, Z-B',
    icon: '🕊️',
    name: 'Sky COTL (15 Phím: Q-T, A-G, Z-B)'
  },
  'sky_steam': {
    title: 'Sky COTL (Steam)',
    subtitle: '15 Phím: Y-P, H-;, B-.',
    icon: '🎮',
    name: 'Sky COTL (15 Phím Steam: Y-P, H-;, B-.)'
  }
};

function updateInstrumentUI(inst) {
  const meta = INSTRUMENT_META[inst] || INSTRUMENT_META['genshin'];
  if (elements.triggerInstIcon) elements.triggerInstIcon.textContent = meta.icon;
  if (elements.triggerInstTitle) elements.triggerInstTitle.textContent = meta.title;
  if (elements.triggerInstSub) elements.triggerInstSub.textContent = meta.subtitle;
  if (elements.selectInstrument) elements.selectInstrument.value = inst;

  const items = document.querySelectorAll('.custom-dropdown-item');
  items.forEach(it => {
    const itVal = it.getAttribute('data-value');
    if (itVal === inst) {
      it.classList.add('active');
      it.setAttribute('aria-selected', 'true');
    } else {
      it.classList.remove('active');
      it.setAttribute('aria-selected', 'false');
    }
  });
}

function setupInstrumentSelector() {
  const savedInst = localStorage.getItem('gs_target_instrument') || 'genshin';
  if (savedInst === 'genshin' || savedInst === 'sky' || savedInst === 'sky_steam') {
    state.targetInstrument = savedInst;
    updateInstrumentUI(savedInst);
    synth.setInstrument(savedInst);
    renderVisualLyre(savedInst);
  } else {
    updateInstrumentUI('genshin');
  }

  // Toggle dropdown on trigger click
  if (elements.dropdownTriggerInstrument && elements.instrumentDropdownMenu) {
    elements.dropdownTriggerInstrument.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = elements.dropdownTriggerInstrument.classList.contains('open');
      if (isOpen) {
        closeInstrumentDropdown();
      } else {
        openInstrumentDropdown();
      }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (elements.instrumentDropdown && !elements.instrumentDropdown.contains(e.target)) {
        closeInstrumentDropdown();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeInstrumentDropdown();
      }
    });
  }

  function openInstrumentDropdown() {
    if (elements.dropdownTriggerInstrument && elements.instrumentDropdownMenu) {
      elements.dropdownTriggerInstrument.classList.add('open');
      elements.dropdownTriggerInstrument.setAttribute('aria-expanded', 'true');
      elements.instrumentDropdownMenu.classList.add('show');
    }
  }

  function closeInstrumentDropdown() {
    if (elements.dropdownTriggerInstrument && elements.instrumentDropdownMenu) {
      elements.dropdownTriggerInstrument.classList.remove('open');
      elements.dropdownTriggerInstrument.setAttribute('aria-expanded', 'false');
      elements.instrumentDropdownMenu.classList.remove('show');
    }
  }

  // Handle item selection
  const items = document.querySelectorAll('.custom-dropdown-item');
  items.forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const inst = item.getAttribute('data-value');
      if (!inst || inst === state.targetInstrument) {
        closeInstrumentDropdown();
        return;
      }

      state.targetInstrument = inst;
      localStorage.setItem('gs_target_instrument', inst);
      updateInstrumentUI(inst);
      closeInstrumentDropdown();
      synth.setInstrument(inst);
      renderVisualLyre(inst);

      if (window.pywebview && window.pywebview.api && window.pywebview.api.set_target_instrument) {
        try {
          const res = await window.pywebview.api.set_target_instrument(inst);
          if (res && res.recommended_transpose !== undefined) {
            state.transpose = res.recommended_transpose;
            if (elements.sliderTranspose) elements.sliderTranspose.value = res.recommended_transpose;
            if (elements.valTranspose) elements.valTranspose.textContent = `${res.recommended_transpose > 0 ? '+' : ''}${res.recommended_transpose} st`;
            if (elements.badgeTranspose) elements.badgeTranspose.textContent = `${res.recommended_transpose > 0 ? '+' : ''}${res.recommended_transpose} st`;
          }
        } catch (err) {
          console.error('Error switching instrument:', err);
        }
      }

      const meta = INSTRUMENT_META[inst] || { name: inst };
      showToast(`Đã chuyển sang: ${meta.name}`, 'success');
    });
  });

  // Keep native select in sync if changed elsewhere
  if (elements.selectInstrument) {
    elements.selectInstrument.addEventListener('change', (e) => {
      const inst = e.target.value;
      updateInstrumentUI(inst);
    });
  }
}

// ------------------------------------------------------------------
// 6. Titlebar & Admin
// ------------------------------------------------------------------
function setupTitlebar() {
  // Prevent pywebview drag from capturing clicks on minimize / maximize / close buttons
  ['pointerdown', 'mousedown', 'touchstart'].forEach(evt => {
    if (elements.btnWinMin) {
      elements.btnWinMin.addEventListener(evt, (e) => e.stopPropagation());
    }
    if (elements.btnWinMax) {
      elements.btnWinMax.addEventListener(evt, (e) => e.stopPropagation());
    }
    if (elements.btnWinClose) {
      elements.btnWinClose.addEventListener(evt, (e) => e.stopPropagation());
    }
  });

  if (elements.btnWinMin) {
    elements.btnWinMin.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.minimize_window();
      }
    });
  }

  if (elements.btnWinMax) {
    elements.btnWinMax.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_maximize_window) {
        const isMax = await window.pywebview.api.toggle_maximize_window();
        elements.btnWinMax.textContent = isMax ? '❐' : '□';
        elements.btnWinMax.title = isMax ? 'Khôi phục (Restore)' : 'Phóng to (Maximize)';
      }
    });
  }

  // Double-click titlebar to toggle maximize
  const titlebar = document.querySelector('.custom-titlebar');
  if (titlebar) {
    titlebar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.titlebar-controls') || e.target.closest('button')) return;
      if (elements.btnWinMax) elements.btnWinMax.click();
    });
  }

  if (elements.btnWinClose) {
    elements.btnWinClose.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.btnWinClose.style.opacity = '0.5';
      elements.btnWinClose.style.pointerEvents = 'none';

      if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.close_window();
      } else {
        window.close();
      }
    });
  }

  if (elements.btnElevateAdmin) {
    elements.btnElevateAdmin.addEventListener('click', () => {
      if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.restart_as_admin();
      }
    });
  }
}

function renderAdminStatus() {
  if (elements.adminStatusBadge) {
    elements.adminStatusBadge.style.display = state.isAdmin ? 'flex' : 'none';
  }
  if (elements.btnElevateAdmin) {
    elements.btnElevateAdmin.style.display = state.isAdmin ? 'none' : 'block';
  }
}

// ------------------------------------------------------------------
// 7. Global Callbacks Called from Python Worker Thread
// ------------------------------------------------------------------
window.onPlaybackProgress = function(currentSec, totalSec, chordKeys) {
  // Chỉ cập nhật khi người dùng không đang kéo và đã qua 250ms sau lần seek gần nhất
  if (!state.isSeeking && (Date.now() - (state.lastSeekTimestamp || 0) > 250)) {
    elements.barProgressSlider.value = currentSec;
    updateScrubberTimeLabel(currentSec);
    updateScrubberVisual(currentSec, totalSec);
  }

  // Visual shockwave on active keys and in-app sound preview
  if (chordKeys && chordKeys.length > 0) {
    if (state.currentView === 'lyre' || state.inAppSoundEnabled) {
      chordKeys.forEach(k => {
        if (state.currentView === 'lyre') triggerKeyVisual(k);
        if (state.inAppSoundEnabled) {
          synth.playKey(k);
        }
      });
    }
  }
};

window.onStateChange = function(newState) {
  if (newState === 'PLAYING') {
    state.isPlaying = true;
    elements.btnBarPlay.textContent = '⏸';
    elements.btnBarPlay.style.background = 'linear-gradient(135deg, #FDE2B3, #FFA7C5)';
    elements.btnBarPlay.style.color = '#2A0E1E';
  } else if (newState === 'PAUSED') {
    state.isPlaying = false;
    elements.btnBarPlay.textContent = '▶';
    elements.btnBarPlay.style.background = 'linear-gradient(135deg, #FDE2B3, #FFA7C5)';
    elements.btnBarPlay.style.color = '#2A0E1E';
  } else {
    state.isPlaying = false;
    elements.btnBarPlay.textContent = '▶';
    elements.btnBarPlay.style.background = 'linear-gradient(135deg, #FFA7C5, #F472B6)';
    elements.btnBarPlay.style.color = '#2A0E1E';
  }
};

window.onPlaybackFinished = function() {
  state.isPlaying = false;
  elements.btnBarPlay.textContent = '▶';
  elements.btnBarPlay.style.background = 'linear-gradient(135deg, #FFA7C5, #F472B6)';
  elements.btnBarPlay.style.color = '#2A0E1E';
  elements.barProgressSlider.value = 0;
  updateScrubberTimeLabel(0);
  const total = state.currentSong ? state.currentSong.duration_seconds : 0;
  updateScrubberVisual(0, total);
  showToast('Đã phát xong bài hát 🎵', 'success');
};

window.onSpeedChangedFromOverlay = function(newSpeed) {
  const spd = parseFloat(newSpeed) || 1.0;
  state.speed = spd;
  if (elements.sliderSpeed) elements.sliderSpeed.value = spd;
  if (elements.valSpeed) elements.valSpeed.textContent = `${spd.toFixed(1)}x`;
  if (elements.badgeSpeed) elements.badgeSpeed.textContent = `${spd.toFixed(1)}x`;
  showToast(`Tốc độ phát: ${spd.toFixed(1)}x`, 'success');
};

window.onSongLoadedFromPython = function(songData) {
  state.currentSong = songData;
  elements.barSongTitle.textContent = songData.title;
  elements.barSongMeta.textContent = `${songData.artist_or_game} • ${songData.bpm} BPM`;
  renderSongCards();
};

// ------------------------------------------------------------------
// 8. Hotkey Settings, Rebinding & Presets
// ------------------------------------------------------------------
function setupHotkeySettings() {
  const inputPlay = document.getElementById('hotkey-key-play');
  const inputStop = document.getElementById('hotkey-key-stop');
  const inputPause = document.getElementById('hotkey-key-pause');
  const btnSave = document.getElementById('btn-save-hotkeys');
  const statusMsg = document.getElementById('hotkey-status-msg');
  const presetPills = document.querySelectorAll('.btn-preset-pill');
  const changeBtns = document.querySelectorAll('.btn-change-key');

  let activeRecordingTarget = null;
  let activeRecordingBtn = null;

  // Preset buttons
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const playKey = pill.getAttribute('data-play');
      const stopKey = pill.getAttribute('data-stop');
      const pauseKey = pill.getAttribute('data-pause');

      if (inputPlay) inputPlay.value = playKey;
      if (inputStop) inputStop.value = stopKey;
      if (inputPause) inputPause.value = pauseKey;

      saveCurrentHotkeys(true);
    });
  });

  // Change key click
  changeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.getAttribute('data-target');
      const targetInput = document.getElementById(targetId);
      if (!targetInput) return;

      if (activeRecordingTarget) {
        cancelRecording();
      }

      activeRecordingTarget = targetInput;
      activeRecordingBtn = btn;

      targetInput.classList.add('recording');
      btn.classList.add('recording');
      btn.textContent = 'Gõ phím...';
    });
  });

  // Global keydown for recording key
  window.addEventListener('keydown', (e) => {
    if (!activeRecordingTarget) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      cancelRecording();
      return;
    }

    let keyName = formatHotkeyName(e);
    if (keyName) {
      activeRecordingTarget.value = keyName;
      cancelRecording();
      saveCurrentHotkeys(true);
    }
  }, true);

  function cancelRecording() {
    if (activeRecordingTarget) activeRecordingTarget.classList.remove('recording');
    if (activeRecordingBtn) {
      activeRecordingBtn.classList.remove('recording');
      activeRecordingBtn.textContent = 'Đổi phím';
    }
    activeRecordingTarget = null;
    activeRecordingBtn = null;
  }

  function formatHotkeyName(e) {
    if (e.key >= '0' && e.key <= '9') return e.key;
    if (e.code && e.code.startsWith('Numpad')) {
      const num = e.code.replace('Numpad', '');
      return `num ${num.toLowerCase()}`;
    }
    if (e.key.startsWith('F') && !isNaN(e.key.slice(1))) return e.key.toUpperCase();
    if (e.key === '`' || e.key === '~') return '`';
    if (e.key === '-') return '-';
    if (e.key === '=') return '=';
    if (e.key === ' ') return 'space';
    if (e.key.length === 1) return e.key.toLowerCase();
    return e.key.toLowerCase();
  }

  function saveCurrentHotkeys(showNotification = true) {
    const playKey = inputPlay ? inputPlay.value.trim() : '1';
    const stopKey = inputStop ? inputStop.value.trim() : '2';
    const pauseKey = inputPause ? inputPause.value.trim() : '3';

    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.save_hotkeys(playKey, stopKey, pauseKey).then(res => {
        if (res && res.success) {
          updatePlayerBarTooltips(playKey, stopKey);
          if (showNotification && statusMsg) {
            statusMsg.textContent = `✅ Đã lưu: [${playKey.toUpperCase()}] Phát/Tạm dừng, [${stopKey.toUpperCase()}] Dừng!`;
            statusMsg.style.opacity = '1';
            setTimeout(() => {
              statusMsg.style.opacity = '0';
            }, 3500);
          }
        }
      });
    } else {
      updatePlayerBarTooltips(playKey, stopKey);
    }
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      saveCurrentHotkeys(true);
    });
  }
}

function updatePlayerBarTooltips(playKey, stopKey) {
  if (elements.btnBarPlay) {
    elements.btnBarPlay.title = `Play / Resume / Pause (${playKey.toUpperCase()})`;
  }
  if (elements.btnBarStop) {
    elements.btnBarStop.title = `Stop / Reset (${stopKey.toUpperCase()})`;
  }
}

function loadHotkeysFromBackend() {
  if (!window.pywebview || !window.pywebview.api) return;
  if (window.pywebview.api.get_hotkeys) {
    window.pywebview.api.get_hotkeys().then(hotkeys => {
      if (hotkeys) {
        const inputPlay = document.getElementById('hotkey-key-play');
        const inputStop = document.getElementById('hotkey-key-stop');
        const inputPause = document.getElementById('hotkey-key-pause');
        if (inputPlay && hotkeys.play) inputPlay.value = hotkeys.play;
        if (inputStop && hotkeys.stop) inputStop.value = hotkeys.stop;
        if (inputPause && hotkeys.pause) inputPause.value = hotkeys.pause;
        updatePlayerBarTooltips(hotkeys.play || '1', hotkeys.stop || '2');

        // Check active preset
        const presetPills = document.querySelectorAll('.btn-preset-pill');
        presetPills.forEach(p => {
          if (p.getAttribute('data-play') === hotkeys.play && p.getAttribute('data-stop') === hotkeys.stop) {
            p.classList.add('active');
          } else {
            p.classList.remove('active');
          }
        });
      }
    });
  }
}

// Global shortcut: Spacebar to Play/Pause (when not typing in an input or recording a key)
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    const active = document.activeElement;
    const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    const isRecording = document.querySelector('.hotkey-input.recording');
    if (!isInput && !isRecording) {
      e.preventDefault();
      if (elements.btnBarPlay) {
        elements.btnBarPlay.click();
      }
    }
  }
});

// ====================================================================
// Mobile & Standalone Web Audio Engine
// ====================================================================

function playNextSong() {
  if (!state.songsList || state.songsList.length === 0) return;
  let curIdx = 0;
  if (state.currentSong) {
    curIdx = state.songsList.findIndex(s => s.id === state.currentSong.id);
    if (curIdx < 0) curIdx = 0;
  }
  const nextIdx = (curIdx + 1) % state.songsList.length;
  selectSong(state.songsList[nextIdx], true);
}

function playPrevSong() {
  if (!state.songsList || state.songsList.length === 0) return;
  let curIdx = 0;
  if (state.currentSong) {
    curIdx = state.songsList.findIndex(s => s.id === state.currentSong.id);
    if (curIdx < 0) curIdx = 0;
  }
  const prevIdx = (curIdx - 1 + state.songsList.length) % state.songsList.length;
  selectSong(state.songsList[prevIdx], true);
}

function setupMobileTouchLyre() {
  const board = document.getElementById('lyre-board');
  if (!board) return;

  const activeTouches = new Map();

  function getKeyFromTouch(touch) {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    return el ? el.closest('.glass-key') : null;
  }

  function triggerKey(keyEl) {
    if (!keyEl) return;
    const keyChar = keyEl.getAttribute('data-key');
    if (!keyChar) return;

    synth.init();
    triggerKeyVisual(keyChar);
    synth.playKey(keyChar);

    if (navigator.vibrate) {
      try { navigator.vibrate(12); } catch (e) {}
    }

    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.press_key_manually(keyChar);
    }
  }

  board.addEventListener('touchstart', (e) => {
    e.preventDefault();
    synth.init();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const keyEl = getKeyFromTouch(t);
      if (keyEl) {
        activeTouches.set(t.identifier, keyEl);
        triggerKey(keyEl);
      }
    }
  }, { passive: false });

  board.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const keyEl = getKeyFromTouch(t);
      const prevKey = activeTouches.get(t.identifier);
      if (keyEl && keyEl !== prevKey) {
        activeTouches.set(t.identifier, keyEl);
        triggerKey(keyEl);
      }
    }
  }, { passive: false });

  board.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      activeTouches.delete(e.changedTouches[i].identifier);
    }
  }, { passive: false });

  board.addEventListener('touchcancel', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      activeTouches.delete(e.changedTouches[i].identifier);
    }
  });
}

let deferredPrompt = null;
function setupPwaInstall() {
  const btnInstall = document.getElementById('btn-pwa-install');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstall) {
      btnInstall.style.display = 'inline-flex';
    }
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('Cảm ơn bạn đã cài đặt GsMusicLyre! 🎉', 'success');
        }
        deferredPrompt = null;
      } else {
        showToast('Mở menu trình duyệt và chọn "Thêm vào màn hình chính" (Add to Home screen) 📲', 'info', 4500);
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    showToast('GsMusicLyre đã được cài đặt thành công! 📱', 'success');
    if (btnInstall) btnInstall.style.display = 'none';
  });
}

function saveMobileCustomSong(parsedSong) {
  if (!parsedSong) return;
  let customList = [];
  try {
    customList = JSON.parse(localStorage.getItem('gs_mobile_custom_songs') || '[]');
  } catch (e) {}

  customList = customList.filter(s => s.id !== parsedSong.id);
  customList.unshift(parsedSong);
  try {
    localStorage.setItem('gs_mobile_custom_songs', JSON.stringify(customList));
  } catch (e) {}

  state.songsList = state.songsList.filter(s => s.id !== parsedSong.id);
  state.songsList.unshift(parsedSong);

  state.activeCategory = 'Custom';
  elements.chips.forEach(c => {
    if (c.getAttribute('data-category') === 'Custom') c.classList.add('active');
    else c.classList.remove('active');
  });

  renderSongCards();
  renderCategoryCounts();
  selectSong(parsedSong, true);
  showToast(`Đã nhập thành công "${parsedSong.title}"!`, 'success');
}

function loadFavoritesFromLocalStorage() {
  let favs = [];
  try {
    favs = JSON.parse(localStorage.getItem('gs_favorites') || '[]');
  } catch (e) {}
  state.songsList.forEach(s => {
    s.is_favorite = favs.includes(s.id);
  });
}

function initStandaloneMobileMode() {
  state.isWebMode = true;
  state.inAppSoundEnabled = true;
  if (elements.btnToggleSound) {
    elements.btnToggleSound.textContent = '🔊';
    elements.btnToggleSound.title = 'Âm thanh trong App: ĐANG BẬT';
    elements.btnToggleSound.style.color = 'var(--cyan)';
  }

  if (window.StandaloneWebPlayer) {
    standalonePlayer = new window.StandaloneWebPlayer(synth);
    standalonePlayer.onProgress = (cur, tot, keys) => {
      if (window.onPlaybackProgress) {
        window.onPlaybackProgress(cur, tot, keys);
      }
    };
    standalonePlayer.onStateChange = (st) => {
      if (window.onPlaybackStateChange) {
        window.onPlaybackStateChange(st);
      }
    };
    standalonePlayer.onFinished = () => {
      if (state.playbackMode === 'loop') {
        if (standalonePlayer) standalonePlayer.play(0);
      } else if (state.playbackMode === 'next') {
        playNextSong();
      } else {
        if (window.onPlaybackFinished) {
          window.onPlaybackFinished();
        }
      }
    };
  }

  let localCustom = [];
  try {
    localCustom = JSON.parse(localStorage.getItem('gs_mobile_custom_songs') || '[]');
  } catch (e) {}

  const builtin = (window.BUILTIN_SONGS || []).map(s => ({
    id: s.id,
    title: s.title,
    artist_or_game: s.artist_or_game,
    category: s.category,
    duration_seconds: s.duration_seconds,
    bpm: s.bpm,
    note_count: s.note_count,
    is_favorite: false,
    is_custom: s.category === 'Custom',
    can_delete: false,
    recommended_transpose: s.recommended_transpose || 0,
    chords: s.chords || []
  }));

  state.songsList = [...builtin, ...localCustom];
  loadFavoritesFromLocalStorage();
  renderSongCards();
  renderCategoryCounts();

  if (state.songsList.length > 0 && !state.currentSong) {
    selectSong(state.songsList[0], false);
  }
}

