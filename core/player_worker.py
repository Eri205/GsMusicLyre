"""
core/player_worker.py
Background player worker thread with high-precision drift compensation,
global hotkeys (F8, F9, F10), and active window safety detection.
"""

import os
import json
import threading
import time
import ctypes
from ctypes import wintypes
from enum import Enum
from typing import List, Callable, Optional, Set, Tuple
import keyboard

from core.input_driver import (
    play_chord_keys,
    press_chord_keys,
    release_scancodes_up,
    release_all_keys,
    SCAN_CODES
)
from core.midi_engine import (
    PlaybackChord,
    enable_high_precision_timer,
    disable_high_precision_timer
)

# Win32 functions for window detection
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

PROCESS_QUERY_LIMITED_INFORMATION = 0x1000

def get_foreground_process_name() -> str:
    """Get the executable name of the currently focused window."""
    try:
        hwnd = user32.GetForegroundWindow()
        if not hwnd:
            return ""
        
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        if not pid.value:
            return ""
            
        h_process = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid.value)
        if not h_process:
            return ""
            
        buf = (ctypes.c_char * 512)()
        size = wintypes.DWORD(512)
        # QueryFullProcessImageNameA
        if kernel32.QueryFullProcessImageNameA(h_process, 0, buf, ctypes.byref(size)):
            full_path = buf.value.decode('utf-8', errors='ignore')
            kernel32.CloseHandle(h_process)
            return full_path.split('\\')[-1].lower()
        kernel32.CloseHandle(h_process)
    except Exception:
        pass
    return ""

def is_genshin_focused() -> bool:
    """Check if Genshin Impact or Sky: Children of the Light window is active."""
    proc_name = get_foreground_process_name().lower()
    if proc_name in ("genshinimpact.exe", "yuanshen.exe", "sky.exe"):
        return True
    try:
        hwnd = user32.GetForegroundWindow()
        if hwnd:
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buf = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buf, length + 1)
                title = buf.value.lower()
                if any(k in title for k in ("genshin", "原神", "sky: children", "sky children", "sky studio", "specy", "sky music")):
                    return True
    except Exception:
        pass
    return False


class PlayerState(Enum):
    STOPPED = "STOPPED"
    PLAYING = "PLAYING"
    PAUSED = "PAUSED"


class PlayerWorker:
    def __init__(self):
        self.state: PlayerState = PlayerState.STOPPED
        self.chords: List[PlaybackChord] = []
        self.total_duration: float = 0.0
        
        # Options
        self.genshin_only: bool = False
        self.key_hold_ms: float = 26.0
        
        # Callbacks
        self.on_progress: Optional[Callable[[float, float, List[str]], None]] = None
        self.on_state_change: Optional[Callable[[PlayerState], None]] = None
        self.on_finished: Optional[Callable[[], None]] = None
        
        # Internal thread controls
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._pause_event = threading.Event()
        self._current_index: int = 0
        self._elapsed_time: float = 0.0
        self._lock = threading.RLock()
        
        # Configurable hotkeys (Default: 1 for Play/Pause, 2 for Stop, 3 for Pause)
        self.hotkey_play: str = "1"
        self.hotkey_stop: str = "2"
        self.hotkey_pause: str = "3"
        self._hotkey_play_hook = None
        self._hotkey_stop_hook = None
        self._hotkey_pause_hook = None
        self._hotkeys_registered = False
        self._load_hotkey_settings()

    def _load_hotkey_settings(self):
        try:
            from core.library_manager import APP_DIR
            settings_file = os.path.join(APP_DIR, "data", "settings.json")
            if os.path.exists(settings_file):
                with open(settings_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.hotkey_play = data.get("hotkey_play", "1")
                    self.hotkey_stop = data.get("hotkey_stop", "2")
                    self.hotkey_pause = data.get("hotkey_pause", "3")
        except Exception as e:
            print(f"Error loading hotkey settings: {e}")

    def save_hotkey_settings(self):
        try:
            from core.library_manager import APP_DIR
            data_dir = os.path.join(APP_DIR, "data")
            os.makedirs(data_dir, exist_ok=True)
            settings_file = os.path.join(data_dir, "settings.json")
            data = {}
            if os.path.exists(settings_file):
                try:
                    with open(settings_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                except Exception:
                    data = {}
            data["hotkey_play"] = self.hotkey_play
            data["hotkey_stop"] = self.hotkey_stop
            data["hotkey_pause"] = self.hotkey_pause
            with open(settings_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving hotkey settings: {e}")

    def setup_hotkeys(self):
        """Register global hotkeys with the configured keys."""
        self.cleanup_hotkeys()
        try:
            if self.hotkey_play:
                self._hotkey_play_hook = keyboard.add_hotkey(self.hotkey_play, self.hotkey_play_toggle)
            if self.hotkey_stop:
                self._hotkey_stop_hook = keyboard.add_hotkey(self.hotkey_stop, self.stop)
            if self.hotkey_pause and self.hotkey_pause != self.hotkey_play and self.hotkey_pause != self.hotkey_stop:
                self._hotkey_pause_hook = keyboard.add_hotkey(self.hotkey_pause, self.pause)
            self._hotkeys_registered = True
            print(f"Global hotkeys registered: Play/Pause={self.hotkey_play}, Stop={self.hotkey_stop}, Pause={self.hotkey_pause}")
        except Exception as e:
            print(f"Warning: Could not register global hotkeys: {e}")

    def cleanup_hotkeys(self):
        """Unregister global hotkeys cleanly."""
        try:
            if self._hotkey_play_hook is not None:
                keyboard.remove_hotkey(self._hotkey_play_hook)
            if self._hotkey_stop_hook is not None:
                keyboard.remove_hotkey(self._hotkey_stop_hook)
            if self._hotkey_pause_hook is not None:
                keyboard.remove_hotkey(self._hotkey_pause_hook)
        except Exception:
            pass
        self._hotkey_play_hook = None
        self._hotkey_stop_hook = None
        self._hotkey_pause_hook = None
        self._hotkeys_registered = False

    def update_hotkeys(self, play_key: str, stop_key: str, pause_key: str = "") -> dict:
        """Update hotkey configuration, persist to settings.json, and rebind."""
        if play_key:
            self.hotkey_play = play_key.strip()
        if stop_key:
            self.hotkey_stop = stop_key.strip()
        self.hotkey_pause = pause_key.strip() if pause_key else ""
        self.save_hotkey_settings()
        self.setup_hotkeys()
        return {
            "success": True,
            "hotkey_play": self.hotkey_play,
            "hotkey_stop": self.hotkey_stop,
            "hotkey_pause": self.hotkey_pause
        }

    def hotkey_play_toggle(self):
        """Handler for play / resume / pause toggle."""
        if self.state == PlayerState.PLAYING:
            self.pause()
        elif self.state == PlayerState.PAUSED:
            self.resume()
        elif self.state == PlayerState.STOPPED:
            self.play()

    @property
    def current_time(self) -> float:
        return self._elapsed_time

    def set_chords(self, chords: List[PlaybackChord], duration: float):
        """Load prepared chords into the player worker."""
        with self._lock:
            self.stop()
            self.chords = chords
            self.total_duration = duration
            self._current_index = 0
            self._elapsed_time = 0.0

    def play(self, start_time: Optional[float] = None):
        """Start playback from start_time or current elapsed time."""
        with self._lock:
            if not self.chords:
                return

            if self.state == PlayerState.PLAYING:
                return

            # Terminate previous thread cleanly if still running
            old_thread = self._thread
            if old_thread and old_thread.is_alive() and threading.current_thread() != old_thread:
                self._stop_event.set()

        if old_thread and old_thread.is_alive() and threading.current_thread() != old_thread:
            old_thread.join(timeout=0.2)

        with self._lock:
            self._thread = None
            self._stop_event.clear()
            self._pause_event.clear()

            if start_time is not None:
                self._elapsed_time = max(0.0, min(self.total_duration, float(start_time)))
            elif self._elapsed_time >= self.total_duration:
                self._elapsed_time = 0.0

            # Find matching start index
            self._current_index = len(self.chords)
            for idx, chord in enumerate(self.chords):
                if chord.timestamp >= self._elapsed_time:
                    self._current_index = idx
                    break

            self._set_state(PlayerState.PLAYING)
            self._thread = threading.Thread(target=self._run_playback_loop, daemon=True)
            self._thread.start()

    def resume(self):
        """Resume playback from paused state."""
        with self._lock:
            if self.state == PlayerState.PAUSED:
                if self._thread is None or not self._thread.is_alive():
                    self.play(self._elapsed_time)
                else:
                    self._pause_event.clear()
                    self._set_state(PlayerState.PLAYING)

    def pause(self):
        """Pause playback and release pressed keys."""
        with self._lock:
            if self.state == PlayerState.PLAYING:
                self._pause_event.set()
                release_all_keys()
                self._set_state(PlayerState.PAUSED)

    def stop(self):
        """Stop playback immediately, release keys and reset position."""
        with self._lock:
            self._stop_event.set()
            self._pause_event.clear()
            release_all_keys()
            old_thread = self._thread

        if old_thread and old_thread.is_alive() and threading.current_thread() != old_thread:
            old_thread.join(timeout=0.1)

        with self._lock:
            self._thread = None
            self._current_index = 0
            self._elapsed_time = 0.0
            self._set_state(PlayerState.STOPPED)

    def seek(self, target_time: float):
        """Seek to a specific timestamp in seconds smoothly."""
        prev_state = self.state
        with self._lock:
            self._stop_event.set()
            self._pause_event.clear()
            release_all_keys()
            old_thread = self._thread

        if old_thread and old_thread.is_alive() and threading.current_thread() != old_thread:
            old_thread.join(timeout=0.1)

        with self._lock:
            self._thread = None
            self._elapsed_time = max(0.0, min(self.total_duration, float(target_time)))
            
            # Find matching start index
            self._current_index = len(self.chords)
            for idx, chord in enumerate(self.chords):
                if chord.timestamp >= self._elapsed_time:
                    self._current_index = idx
                    break

            if prev_state == PlayerState.PLAYING:
                self._stop_event.clear()
                self._pause_event.clear()
                self._set_state(PlayerState.PLAYING)
                self._thread = threading.Thread(target=self._run_playback_loop, daemon=True)
                self._thread.start()
            elif prev_state == PlayerState.PAUSED:
                self._stop_event.clear()
                self._pause_event.set()
                self._set_state(PlayerState.PAUSED)
                if self.on_progress:
                    self.on_progress(self._elapsed_time, self.total_duration, [])
            else:
                self._set_state(PlayerState.STOPPED)
                if self.on_progress:
                    self.on_progress(self._elapsed_time, self.total_duration, [])

    def _set_state(self, new_state: PlayerState):
        self.state = new_state
        if self.on_state_change:
            self.on_state_change(new_state)

    def _run_playback_loop(self):
        """High-precision execution loop running in background thread with zero-latency non-blocking scheduled key release."""
        enable_high_precision_timer()
        active_releases: List[Tuple[float, List[int]]] = []
        
        try:
            start_timestamp = self._elapsed_time
            loop_start_perf = time.perf_counter() - start_timestamp
            last_progress_update = start_timestamp
            
            while not self._stop_event.is_set():
                now_perf = time.perf_counter()

                # Process any scheduled key releases whose hold duration has elapsed (non-blocking)
                if active_releases:
                    pending_rem = []
                    for rel_time, sc_list in active_releases:
                        if now_perf >= rel_time:
                            release_scancodes_up(sc_list)
                        else:
                            pending_rem.append((rel_time, sc_list))
                    active_releases = pending_rem

                # Handle Pausing
                if self._pause_event.is_set():
                    # Clear active releases and release physical keys on pause
                    active_releases.clear()
                    release_all_keys()
                    pause_time = time.perf_counter()
                    while self._pause_event.is_set() and not self._stop_event.is_set():
                        self._stop_event.wait(0.02)
                    if self._stop_event.is_set():
                        break
                    # Adjust loop_start_perf by the duration paused
                    paused_duration = time.perf_counter() - pause_time
                    loop_start_perf += paused_duration

                current_time = time.perf_counter() - loop_start_perf

                # If all chords played, wait until total duration or song tail
                if self._current_index >= len(self.chords):
                    if current_time >= self.total_duration or (len(self.chords) > 0 and current_time >= self.chords[-1].timestamp + 1.0):
                        break
                    # Periodic progress update until total duration
                    if current_time - last_progress_update >= 0.04:
                        last_progress_update = current_time
                        self._elapsed_time = min(current_time, self.total_duration)
                        if self.on_progress:
                            self.on_progress(self._elapsed_time, self.total_duration, [])
                    self._stop_event.wait(0.005)
                    continue

                chord = self.chords[self._current_index]
                target_sec = chord.timestamp
                remaining = target_sec - current_time

                # Smooth GUI progress update every ~35ms while waiting for note
                if current_time - last_progress_update >= 0.035:
                    last_progress_update = current_time
                    self._elapsed_time = min(current_time, self.total_duration)
                    if self.on_progress:
                        self.on_progress(self._elapsed_time, self.total_duration, [])

                if remaining > 0.015:
                    # Sleep until ~8ms before target to yield CPU safely without timer overshoot
                    sleep_dur = min(0.010, remaining - 0.008)
                    self._stop_event.wait(sleep_dur)
                    continue

                if remaining > 0.003:
                    # Micro-sleep near target (< 15ms)
                    time.sleep(0.0005)
                    continue

                # Busy-wait for remaining sub-millisecond precision (< 3ms)
                while not self._stop_event.is_set() and not self._pause_event.is_set():
                    now_perf = time.perf_counter()
                    # Check active releases during busy-wait
                    if active_releases:
                        pending_rem = []
                        for rel_time, sc_list in active_releases:
                            if now_perf >= rel_time:
                                release_scancodes_up(sc_list)
                            else:
                                pending_rem.append((rel_time, sc_list))
                        active_releases = pending_rem

                    current_time = now_perf - loop_start_perf
                    if current_time >= target_sec:
                        break

                if self._stop_event.is_set():
                    break
                if self._pause_event.is_set():
                    continue

                # Play chord if safety check passes
                should_press = True
                if self.genshin_only and not is_genshin_focused():
                    should_press = False

                if should_press:
                    pressed_sc = press_chord_keys(chord.keys)
                    if pressed_sc:
                        # Intelligent Per-Key Release Scheduling:
                        # Non-conflicting keys get full hold duration (26ms).
                        # Conflicting keys (re-used soon) are released with >= 12ms air gap before the next strike.
                        key_to_sc = {k: SCAN_CODES.get(k.upper() if k.isalpha() else k) for k in chord.keys}
                        now_stamp = time.perf_counter()

                        next_key_timestamps = {}
                        lookahead_end = min(len(self.chords), self._current_index + 6)
                        for fut_idx in range(self._current_index + 1, lookahead_end):
                            fut_chord = self.chords[fut_idx]
                            for fut_k in fut_chord.keys:
                                if fut_k not in next_key_timestamps:
                                    next_key_timestamps[fut_k] = fut_chord.timestamp

                        base_hold_sec = self.key_hold_ms / 1000.0
                        for k, sc in key_to_sc.items():
                            if not sc:
                                continue
                            if k in next_key_timestamps:
                                next_ts = next_key_timestamps[k]
                                gap = next_ts - target_sec
                                if gap > 0:
                                    # Ensure at least 18ms air gap for 60 FPS game engine input polling
                                    effective_hold = min(base_hold_sec, max(0.010, gap - 0.018))
                                    if gap < 0.035:
                                        effective_hold = max(0.008, min(0.014, gap * 0.45))
                                else:
                                    effective_hold = base_hold_sec
                            else:
                                effective_hold = base_hold_sec

                            rel_perf = now_stamp + effective_hold
                            active_releases.append((rel_perf, [sc]))

                self._elapsed_time = target_sec
                last_progress_update = current_time

                # Fire progress callback for GUI
                if self.on_progress:
                    self.on_progress(self._elapsed_time, self.total_duration, chord.keys)

                self._current_index += 1

            # Playback completed naturally
            if not self._stop_event.is_set() and self._current_index >= len(self.chords):
                self._elapsed_time = self.total_duration
                if self.on_progress:
                    self.on_progress(self.total_duration, self.total_duration, [])
                self._set_state(PlayerState.STOPPED)
                if self.on_finished:
                    self.on_finished()

        finally:
            active_releases.clear()
            release_all_keys()
            disable_high_precision_timer()
