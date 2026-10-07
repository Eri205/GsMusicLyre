"""
core/webview_api.py
Python API Bridge exposed to the Liquid Glass JavaScript frontend via pywebview.
Coordinates MIDI engine, background player worker, library manager, and floating overlay.
Includes native Win32 File Dialog and base64 import support.
"""

import os
import sys
import json
import ctypes
import base64
import threading
import time
from ctypes import wintypes
from typing import Dict, Any, Optional, Set
import webview

from core.input_driver import is_admin, play_chord_keys
from core.midi_engine import MidiEngine, PlaybackChord
from core.player_worker import PlayerWorker, PlayerState
from core.library_manager import LibraryManager, SongItem
from gui.floating_overlay import FloatingOverlay

# Win32 OpenFileName structure
class OPENFILENAMEW(ctypes.Structure):
    _fields_ = [
        ('lStructSize', wintypes.DWORD),
        ('hwndOwner', wintypes.HWND),
        ('hInstance', wintypes.HINSTANCE),
        ('lpstrFilter', wintypes.LPCWSTR),
        ('lpstrCustomFilter', wintypes.LPWSTR),
        ('nMaxCustFilter', wintypes.DWORD),
        ('nFilterIndex', wintypes.DWORD),
        ('lpstrFile', wintypes.LPWSTR),
        ('nMaxFile', wintypes.DWORD),
        ('lpstrFileTitle', wintypes.LPWSTR),
        ('nMaxFileTitle', wintypes.DWORD),
        ('lpstrInitialDir', wintypes.LPCWSTR),
        ('lpstrTitle', wintypes.LPCWSTR),
        ('Flags', wintypes.DWORD),
        ('nFileOffset', wintypes.WORD),
        ('nFileExtension', wintypes.WORD),
        ('lpstrDefExt', wintypes.LPCWSTR),
        ('lCustData', wintypes.LPARAM),
        ('lpfnHook', wintypes.LPVOID),
        ('lpTemplateName', wintypes.LPCWSTR),
        ('pvReserved', wintypes.LPVOID),
        ('dwReserved', wintypes.DWORD),
        ('FlagsEx', wintypes.DWORD)
    ]

def pick_midi_file_win32() -> str:
    """Open Windows Explorer file picker for MIDI / TXT / JSON sheets."""
    custom_filter = "All Supported Sheets (*.mid;*.midi;*.txt;*.json;*.skysheet)\0*.mid;*.midi;*.txt;*.json;*.skysheet\0MIDI Files (*.mid;*.midi)\0*.mid;*.midi\0Text & JSON Sheets (*.txt;*.json;*.skysheet)\0*.txt;*.json;*.skysheet\0All Files (*.*)\0*.*\0\0"
    file_buffer = ctypes.create_unicode_buffer(1024)
    
    ofn = OPENFILENAMEW()
    ofn.lStructSize = ctypes.sizeof(OPENFILENAMEW)
    ofn.lpstrFilter = custom_filter
    ofn.nFilterIndex = 1
    ofn.lpstrFile = ctypes.cast(file_buffer, wintypes.LPWSTR)
    ofn.nMaxFile = 1024
    ofn.lpstrTitle = "Select Music Sheet (MIDI or TXT) to Import"
    ofn.Flags = 0x00080000 | 0x00001000 | 0x00000800 | 0x00000004
    
    if ctypes.windll.comdlg32.GetOpenFileNameW(ctypes.byref(ofn)):
        return file_buffer.value
    return ""


class OverlayManager:
    """Thread-safe controller for CustomTkinter In-Game Floating Overlay."""
    def __init__(self, api: 'JsApi'):
        self._api = api
        self._root = None
        self._overlay = None
        self._thread = None
        self._lock = threading.Lock()
        self._is_visible = False

    def _ensure_started(self):
        with self._lock:
            if self._thread is not None and self._thread.is_alive():
                return
            ready_evt = threading.Event()

            def _tk_loop():
                try:
                    import customtkinter as ctk
                    self._root = ctk.CTk()
                    self._root.withdraw()
                    self._overlay = FloatingOverlay(
                        self._root,
                        self._api._player_worker,
                        on_next_song=self._api.play_next_song,
                        on_prev_song=self._api.play_prev_song,
                        on_speed_change=self._api.set_speed_from_overlay
                    )
                    self._overlay.withdraw()
                    ready_evt.set()
                    self._root.mainloop()
                except Exception as e:
                    print(f"Overlay initialization error: {e}")
                    ready_evt.set()

            self._thread = threading.Thread(target=_tk_loop, daemon=True)
            self._thread.start()
            ready_evt.wait(timeout=2.5)

    def toggle(self):
        self._ensure_started()
        if not self._root or not self._overlay:
            return
        def _do_toggle():
            try:
                if self._overlay.winfo_viewable():
                    self._overlay.hide_overlay()
                    self._is_visible = False
                else:
                    self._overlay.show_overlay()
                    self._is_visible = True
                    self.sync_full_state()
            except Exception:
                pass
        try:
            self._root.after(0, _do_toggle)
        except Exception:
            pass

    def sync_full_state(self):
        """Push complete state to overlay window immediately upon opening."""
        if not self._root or not self._overlay:
            return
        def _do_sync():
            try:
                song_title = self._api._current_song.title if self._api._current_song else "No Song Loaded"
                tot_dur = self._api._player_worker.total_duration
                cur_dur = self._api._player_worker.current_time
                state_val = self._api._player_worker.state.value
                speed_val = self._api._speed_val
                play_k = getattr(self._api._player_worker, 'hotkey_play', '1')
                stop_k = getattr(self._api._player_worker, 'hotkey_stop', '2')
                self._overlay.sync_full_state(
                    song_title=song_title,
                    duration_sec=tot_dur,
                    current_sec=cur_dur,
                    state_str=state_val,
                    speed_val=speed_val,
                    hotkey_play=play_k,
                    hotkey_stop=stop_k
                )
            except Exception as e:
                print(f"Overlay sync error: {e}")
        try:
            self._root.after(0, _do_sync)
        except Exception:
            pass

    def update_song_info(self, title: str, duration_sec: float, speed_val: float):
        if self._root and self._overlay:
            try:
                self._root.after(0, lambda: self._overlay.update_song_info(title, duration_sec, speed_val))
            except Exception:
                pass

    def update_progress(self, current_sec: float, total_sec: float):
        if self._root and self._overlay and self._is_visible:
            try:
                self._root.after(0, lambda: self._overlay.update_progress(current_sec, total_sec))
            except Exception:
                pass

    def update_state(self, state_str: str):
        if self._root and self._overlay and self._is_visible:
            try:
                self._root.after(0, lambda: self._overlay.update_state(state_str))
            except Exception:
                pass

    def update_hotkey_label(self, play_key: str, stop_key: str):
        if self._root and self._overlay:
            try:
                self._root.after(0, lambda: self._overlay.update_hotkey_label(play_key, stop_key))
            except Exception:
                pass

    def destroy(self):
        if self._root:
            try:
                self._root.after(0, self._root.destroy)
            except Exception:
                pass


class JsApi:
    def __init__(self, library_mgr: LibraryManager, player_worker: PlayerWorker):
        self._library_mgr = library_mgr
        self._player_worker = player_worker
        self._midi_engine: Optional[MidiEngine] = None
        self._current_song: Optional[SongItem] = None
        self._current_chords = []
        self._window: Optional[webview.Window] = None
        self._is_maximized: bool = False
        self._overlay = OverlayManager(self)

        try:
            import keyboard
            keyboard.add_hotkey('f11', self.launch_floating_overlay)
        except Exception as e:
            print(f"Could not bind F11 for overlay: {e}")

        self._transpose_val: int = 0
        self._speed_val: float = 1.0
        self._playback_mode: str = "stop"  # "stop" (Default: stop after 1 song), "loop", "next"
        self._target_instrument: str = "genshin"  # "genshin", "sky", "sky_steam"
        self._track_states: Dict[int, bool] = {}

        # Dedicated persistent GUI dispatcher thread (zero thread-creation overhead during playback)
        self._progress_lock = threading.Lock()
        self._progress_event = threading.Event()
        self._pending_progress = None
        self._dispatcher_running = True
        self._gui_dispatcher_thread = threading.Thread(target=self._gui_dispatcher_loop, daemon=True)
        self._gui_dispatcher_thread.start()

        # Worker callbacks
        self._player_worker.on_progress = self._on_progress
        self._player_worker.on_state_change = self._on_state_change
        self._player_worker.on_finished = self._on_finished
        self._player_worker.setup_hotkeys()

    def set_window(self, window: webview.Window):
        self._window = window

    def get_library_data(self) -> Dict[str, Any]:
        """Return all indexed songs and admin privilege status to JS."""
        songs_data = []
        for s in self._library_mgr.songs:
            songs_data.append({
                "id": s.id,
                "title": s.title,
                "artist_or_game": s.artist_or_game,
                "category": s.category,
                "filepath": s.filepath,
                "duration_seconds": s.duration_seconds,
                "bpm": s.bpm,
                "note_count": s.note_count,
                "is_favorite": s.is_favorite,
                "is_custom": getattr(s, 'is_custom', False),
                "can_delete": getattr(s, 'can_delete', True)
            })

        return {
            "songs": songs_data,
            "is_admin": is_admin()
        }

    def load_song(self, song_id: str, auto_play: bool = False) -> Dict[str, Any]:
        import unicodedata
        clean_target = unicodedata.normalize('NFC', str(song_id or '')).strip().lower()
        if clean_target.endswith(('.mid', '.midi', '.txt', '.json', '.skysheet')):
            clean_target = os.path.splitext(clean_target)[0]

        target_song = None
        # Tier 1: Exact normalized match
        for s in self._library_mgr.songs:
            sid_norm = unicodedata.normalize('NFC', s.id).strip().lower()
            stitle_norm = unicodedata.normalize('NFC', s.title).strip().lower()
            if sid_norm == clean_target or stitle_norm == clean_target:
                target_song = s
                break

        # Tier 2: Substring fallback match
        if not target_song:
            for s in self._library_mgr.songs:
                sid_norm = unicodedata.normalize('NFC', s.id).strip().lower()
                stitle_norm = unicodedata.normalize('NFC', s.title).strip().lower()
                if clean_target in sid_norm or sid_norm in clean_target or clean_target in stitle_norm or stitle_norm in clean_target:
                    target_song = s
                    break

        if not target_song:
            print(f"Warning: load_song could not find song with id '{song_id}'")
            return {}

        self._current_song = target_song
        self._player_worker.stop()
        self._midi_engine = MidiEngine(target_song.filepath, target_instrument=self._target_instrument)

        if target_song.filepath.lower().endswith(('.txt', '.json', '.skysheet')):
            self._transpose_val = 0
        else:
            self._transpose_val = getattr(self._midi_engine, 'recommended_transpose', 0)
        self._track_states = {trk.index: trk.enabled for trk in self._midi_engine.tracks}

        low_t = target_song.title.lower()
        if 'river flows in you' in low_t:
            self._speed_val = 1.20 # Calibrate 60 -> 72 BPM
        elif '7 years' in low_t:
            self._speed_val = 1.05 # Calibrate 120 -> 126 BPM
        else:
            self._speed_val = 1.0

        self._recompile()

        if auto_play:
            self._player_worker.play()

        # Update overlay if active
        if self._overlay:
            self._overlay.update_song_info(target_song.title, self._player_worker.total_duration, self._speed_val)

        tracks_info = [
            {"index": trk.index, "name": trk.name, "channel": trk.channel, "note_count": trk.note_count, "enabled": trk.enabled}
            for trk in self._midi_engine.tracks
        ]

        return {
            "recommended_transpose": self._transpose_val,
            "duration": self._player_worker.total_duration,
            "tracks": tracks_info,
            "speed": self._speed_val
        }

    def _recompile(self):
        if not self._midi_engine:
            return

        enabled_tracks: Set[int] = {idx for idx, en in self._track_states.items() if en}
        self._current_chords = self._midi_engine.get_playable_chords(
            transpose_semitones=self._transpose_val,
            handle_accidentals='nearest',
            enabled_tracks=enabled_tracks,
            speed_factor=self._speed_val,
            instrument=self._target_instrument
        )
        eff_dur = self._midi_engine.duration_seconds / self._speed_val
        self._player_worker.set_chords(self._current_chords, eff_dur)

    def toggle_play_pause(self):
        if self._player_worker.state == PlayerState.PLAYING:
            self._player_worker.pause()
        elif self._player_worker.state == PlayerState.PAUSED:
            self._player_worker.resume()
        else:
            self._player_worker.play()

    def play(self):
        self._player_worker.play()

    def pause(self):
        self._player_worker.pause()

    def stop_playback(self):
        self._player_worker.stop()
        if self._window:
            def _dispatch():
                try:
                    self._window.evaluate_js("if (window.onPlaybackProgress) window.onPlaybackProgress(0, 0, []);")
                except Exception:
                    pass
            threading.Thread(target=_dispatch, daemon=True).start()

    def seek(self, seconds: float):
        self._player_worker.seek(seconds)

    def play_next_song(self):
        if not self._library_mgr.songs:
            return
        cur_idx = 0
        if self._current_song:
            for i, s in enumerate(self._library_mgr.songs):
                if s.id == self._current_song.id:
                    cur_idx = i
                    break
        next_idx = (cur_idx + 1) % len(self._library_mgr.songs)
        next_song = self._library_mgr.songs[next_idx]
        self.load_song(next_song.id, auto_play=True)
        if self._window:
            def _dispatch():
                try:
                    payload = json.dumps({
                        "id": next_song.id,
                        "title": next_song.title,
                        "artist_or_game": next_song.artist_or_game,
                        "bpm": next_song.bpm
                    }, ensure_ascii=False)
                    self._window.evaluate_js(f"if (window.onSongLoadedFromPython) window.onSongLoadedFromPython({payload});")
                except Exception:
                    pass
            threading.Thread(target=_dispatch, daemon=True).start()

    def play_prev_song(self):
        if not self._library_mgr.songs:
            return
        cur_idx = 0
        if self._current_song:
            for i, s in enumerate(self._library_mgr.songs):
                if s.id == self._current_song.id:
                    cur_idx = i
                    break
        prev_idx = (cur_idx - 1 + len(self._library_mgr.songs)) % len(self._library_mgr.songs)
        prev_song = self._library_mgr.songs[prev_idx]
        self.load_song(prev_song.id, auto_play=True)
        if self._window:
            def _dispatch():
                try:
                    payload = json.dumps({
                        "id": prev_song.id,
                        "title": prev_song.title,
                        "artist_or_game": prev_song.artist_or_game,
                        "bpm": prev_song.bpm
                    }, ensure_ascii=False)
                    self._window.evaluate_js(f"if (window.onSongLoadedFromPython) window.onSongLoadedFromPython({payload});")
                except Exception:
                    pass
            threading.Thread(target=_dispatch, daemon=True).start()

    def set_playback_mode(self, mode: str) -> Dict[str, Any]:
        """Set playback mode: 'stop' (single song), 'loop' (repeat current), or 'next' (auto advance)."""
        if mode in ("stop", "loop", "next"):
            self._playback_mode = mode
            return {"success": True, "mode": self._playback_mode}
        return {"success": False, "mode": self._playback_mode}

    def set_target_instrument(self, instrument: str) -> Dict[str, Any]:
        """Change instrument layout: 'genshin', 'sky', or 'sky_steam'."""
        if instrument in ("genshin", "sky", "sky_steam"):
            self._target_instrument = instrument
            rec = 0
            if self._midi_engine:
                if self._current_song and self._current_song.filepath.lower().endswith(('.txt', '.json', '.skysheet')):
                    self._midi_engine.load_file(self._current_song.filepath, target_instrument=self._target_instrument)
                    rec = 0
                else:
                    rec = self._midi_engine.calculate_best_transpose(instrument=self._target_instrument)
                self._transpose_val = rec
                self._recompile()
            return {
                "success": True,
                "instrument": self._target_instrument,
                "recommended_transpose": rec
            }
        return {"success": False, "instrument": self._target_instrument, "recommended_transpose": 0}

    def get_target_instrument(self) -> str:
        return self._target_instrument

    def toggle_favorite(self, song_id: str) -> bool:
        return self._library_mgr.toggle_favorite(song_id)

    def set_transpose(self, val: int):
        self._transpose_val = val
        self._recompile()

    def auto_transpose(self) -> int:
        if self._midi_engine:
            if self._current_song and self._current_song.filepath.lower().endswith(('.txt', '.json', '.skysheet')):
                best = 0
            else:
                best = self._midi_engine.calculate_best_transpose(instrument=self._target_instrument)
            self._transpose_val = best
            self._recompile()
            return best
        return 0

    def set_speed(self, speed: float):
        self._speed_val = max(0.2, min(3.0, speed))
        self._recompile()

    def set_speed_from_overlay(self, speed: float):
        """Called when user clicks speed badge on floating overlay."""
        self.set_speed(speed)
        if self._window:
            def _dispatch():
                try:
                    self._window.evaluate_js(f"if (window.onSpeedChangedFromOverlay) window.onSpeedChangedFromOverlay({self._speed_val});")
                except Exception:
                    pass
            threading.Thread(target=_dispatch, daemon=True).start()

    def set_genshin_only(self, val: bool):
        self._player_worker.genshin_only = val

    def toggle_track(self, track_idx: int, enabled: bool):
        self._track_states[track_idx] = enabled
        self._recompile()

    def press_key_manually(self, key_char: str):
        play_chord_keys([key_char], hold_duration_ms=30)

    def import_midi_file(self) -> Dict[str, Any]:
        """Open native Win32 File Dialog to select MIDI file."""
        filepath = pick_midi_file_win32()
        if filepath and os.path.exists(filepath):
            fname = os.path.basename(filepath)
            dest = os.path.join(self._library_mgr.imported_dir, fname)
            import shutil
            if not os.path.exists(dest):
                shutil.copyfile(filepath, dest)
            self._library_mgr.refresh_library()
            song_id = os.path.splitext(fname)[0]
            return {"success": True, "path": dest, "filename": fname, "song_id": song_id}
        return {"success": False}

    def import_midi_base64(self, filename: str, base64_str: str) -> Dict[str, Any]:
        """Import MIDI or TXT file directly via HTML5 file reader / drag and drop."""
        try:
            raw_bytes = base64.b64decode(base64_str)
            fname = os.path.basename(filename)
            if not fname.lower().endswith(('.mid', '.midi', '.txt', '.json', '.skysheet')):
                fname += ".mid"
            dest = os.path.join(self._library_mgr.imported_dir, fname)
            with open(dest, 'wb') as f:
                f.write(raw_bytes)
            self._library_mgr.refresh_library()
            song_id = os.path.splitext(fname)[0]
            return {"success": True, "path": dest, "filename": fname, "song_id": song_id}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete_song(self, song_id: str) -> Dict[str, Any]:
        """Delete a song file permanently and refresh library."""
        if self._current_song and self._current_song.id == song_id:
            self.stop_playback()
            self._current_song = None
            self._midi_engine = None
            self._current_chords = []
        success = self._library_mgr.delete_song(song_id)
        return {"success": success}

    def open_imported_folder(self) -> Dict[str, Any]:
        """Open imported_songs folder in Windows Explorer."""
        success = self._library_mgr.open_imported_folder()
        return {"success": success}

    def launch_floating_overlay(self):
        """Open or toggle the always-on-top in-game floating overlay."""
        if self._overlay:
            self._overlay.toggle()

    def restart_as_admin(self):
        try:
            params = " ".join([f'"{arg}"' for arg in sys.argv])
            ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, params, None, 1)
            self.close_window()
        except Exception:
            pass

    def get_hotkeys(self) -> Dict[str, str]:
        """Return currently active hotkeys."""
        return {
            "play": self._player_worker.hotkey_play,
            "stop": self._player_worker.hotkey_stop,
            "pause": self._player_worker.hotkey_pause
        }

    def save_hotkeys(self, play_key: str, stop_key: str, pause_key: str = "") -> Dict[str, Any]:
        """Update hotkey configuration."""
        res = self._player_worker.update_hotkeys(play_key, stop_key, pause_key)
        if self._overlay and hasattr(self._overlay, "update_hotkey_label"):
            self._overlay.update_hotkey_label(play_key, stop_key)
        return res

    def minimize_window(self):
        if self._window:
            self._window.minimize()

    def toggle_maximize_window(self) -> bool:
        """Toggle between maximized and normal window state."""
        if not self._window:
            return False
        try:
            self._is_maximized = not getattr(self, '_is_maximized', False)
            if self._is_maximized:
                self._window.maximize()
            else:
                self._window.restore()
            return self._is_maximized
        except Exception as e:
            print(f"Toggle maximize error: {e}")
            return False

    def close_window(self):
        """Clean up all resources and close the application cleanly and immediately."""
        def _terminate():
            self._dispatcher_running = False
            self._progress_event.set()
            try:
                import keyboard
                keyboard.remove_hotkey('f11')
            except Exception:
                pass
            try:
                if self._player_worker:
                    self._player_worker.cleanup_hotkeys()
                    self._player_worker.stop()
            except Exception:
                pass

            try:
                if self._overlay:
                    self._overlay.destroy()
            except Exception:
                pass

            try:
                if self._window:
                    self._window.destroy()
            except Exception:
                pass

            # Small delay to let OS windows close, then force exit any lingering threads
            time.sleep(0.12)
            try:
                os._exit(0)
            except Exception:
                pass

        # Run termination on daemon thread so this RPC call returns immediately to JS
        threading.Thread(target=_terminate, daemon=True).start()
        return {"success": True}

    # Worker Thread Callbacks
    def _gui_dispatcher_loop(self):
        """Dedicated background loop that pushes progress updates to Tkinter and Webview without stalling the player thread."""
        while self._dispatcher_running:
            self._progress_event.wait(timeout=0.1)
            self._progress_event.clear()

            with self._progress_lock:
                if not self._pending_progress:
                    continue
                c_sec, t_sec, k_list = self._pending_progress
                self._pending_progress = None

            # 1. Update floating overlay
            if self._overlay:
                try:
                    self._overlay.update_progress(c_sec, t_sec)
                except Exception:
                    pass

            # 2. Update EdgeChromium webview
            if self._window:
                try:
                    keys_json = json.dumps(k_list)
                    self._window.evaluate_js(
                        f"if (window.onPlaybackProgress) window.onPlaybackProgress({c_sec:.3f}, {t_sec:.3f}, {keys_json});"
                    )
                except Exception:
                    pass

            # Smooth 30 FPS throttle
            time.sleep(0.033)

    def _on_progress(self, cur_sec: float, tot_sec: float, keys: list):
        """Zero-latency progress event hook invoked from the player worker thread."""
        with self._progress_lock:
            prev_keys = self._pending_progress[2] if self._pending_progress else []
            combined_keys = list(set(prev_keys + (keys or []))) if (prev_keys or keys) else []
            self._pending_progress = (cur_sec, tot_sec, combined_keys)
            self._progress_event.set()

    def _on_state_change(self, new_state: PlayerState):
        if self._window:
            def _dispatch():
                try:
                    self._window.evaluate_js(f"if (window.onStateChange) window.onStateChange('{new_state.value}');")
                except Exception:
                    pass
            threading.Thread(target=_dispatch, daemon=True).start()

        if self._overlay:
            self._overlay.update_state(new_state.value)

    def _on_finished(self):
        if self._playback_mode == "next":
            self.play_next_song()
        elif self._playback_mode == "loop":
            self._player_worker.stop()
            self._player_worker.play(0.0)
        else:
            # Default "stop": naturally stop after finishing 1 song
            self._player_worker.stop()
            if self._window:
                def _dispatch():
                    try:
                        self._window.evaluate_js(
                            "if (window.onPlaybackFinished) window.onPlaybackFinished(); "
                            "else if (window.onStateChange) window.onStateChange('STOPPED');"
                        )
                    except Exception:
                        pass
                threading.Thread(target=_dispatch, daemon=True).start()
