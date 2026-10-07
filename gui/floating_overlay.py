"""
gui/floating_overlay.py
Always-On-Top Draggable Floating Mini-Player for in-game control over Genshin Impact and Sky COTL.
Provides instant overlay controls, compact pill mode, live speed tuning, opacity cycling,
always-on-top toggle, and two-way synchronization with the main studio app.
"""

import tkinter as tk
import customtkinter as ctk
from typing import Optional, Callable

COLOR_OVERLAY_BG = "#160E1A"
COLOR_HEADER_BG = "#221428"
COLOR_CYAN = "#FFA7C5"
COLOR_GOLD = "#FFA7C5"
COLOR_GOLD_HOVER = "#FFBCD0"
COLOR_TEXT_MAIN = "#FFF5F8"
COLOR_TEXT_MUTED = "#D5C2D7"
COLOR_BTN_BG = "#222436"
COLOR_BTN_HOVER = "#30344D"


class FloatingOverlay(ctk.CTkToplevel):
    def __init__(
        self,
        master,
        player_worker,
        on_next_song: Optional[Callable[[], None]] = None,
        on_prev_song: Optional[Callable[[], None]] = None,
        on_speed_change: Optional[Callable[[float], None]] = None
    ):
        super().__init__(master)

        self.player_worker = player_worker
        self.on_next_song = on_next_song
        self.on_prev_song = on_prev_song
        self.on_speed_change = on_speed_change

        # Window properties
        self.title("GsMusicLyre In-Game Overlay")
        self.geometry("380x190+100+100")
        self.resizable(False, False)
        self.attributes('-topmost', True)
        self.configure(fg_color=COLOR_OVERLAY_BG)

        # Remove standard OS titlebar for sleek gaming overlay look
        self.overrideredirect(True)

        # State tracking
        self._drag_data = {"x": 0, "y": 0}
        self.is_compact = False
        self.is_topmost = True
        self.current_opacity = 0.95
        self.attributes('-alpha', self.current_opacity)
        self.current_speed = 1.0
        self.speed_presets = [0.8, 1.0, 1.25, 1.5, 2.0]

        # Build UI structures
        self._build_header()
        self._build_compact_frame()
        self._build_body()

        # Bind mouse dragging
        self._bind_drag(self.header_frame)
        self._bind_drag(self.title_label)
        self._bind_drag(self.compact_frame)
        self._bind_drag(self.lbl_compact_title)

    def _bind_drag(self, widget):
        widget.bind("<Button-1>", self._start_drag)
        widget.bind("<B1-Motion>", self._do_drag)

    def _start_drag(self, event):
        self._drag_data["x"] = event.x
        self._drag_data["y"] = event.y

    def _do_drag(self, event):
        deltax = event.x - self._drag_data["x"]
        deltay = event.y - self._drag_data["y"]
        new_x = self.winfo_x() + deltax
        new_y = self.winfo_y() + deltay
        self.geometry(f"+{new_x}+{new_y}")

    def _build_header(self):
        """Standard expanded header with title and action buttons."""
        self.header_frame = ctk.CTkFrame(self, fg_color=COLOR_HEADER_BG, height=32, corner_radius=0)
        self.header_frame.pack(fill="x", side="top")
        self.header_frame.pack_propagate(False)

        # Left Icon & Title
        left_box = ctk.CTkFrame(self.header_frame, fg_color="transparent")
        left_box.pack(side="left", padx=8)

        self.title_label = ctk.CTkLabel(
            left_box,
            text="✨ GsMusicLyre Overlay",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color=COLOR_CYAN
        )
        self.title_label.pack(side="left")

        # Right Action Buttons: Pin, Opacity, Compact, Close
        actions_box = ctk.CTkFrame(self.header_frame, fg_color="transparent")
        actions_box.pack(side="right", padx=6)

        # Pin / Always on Top button
        self.btn_pin = ctk.CTkButton(
            actions_box,
            text="📌",
            font=ctk.CTkFont(size=11),
            width=26,
            height=22,
            fg_color="#3D1E32",
            hover_color="#522744",
            text_color=COLOR_CYAN,
            command=self._toggle_pin
        )
        self.btn_pin.pack(side="left", padx=2)

        # Opacity button (% readout)
        self.btn_trans = ctk.CTkButton(
            actions_box,
            text=f"👁 {int(self.current_opacity*100)}%",
            font=ctk.CTkFont(size=10, weight="bold"),
            width=54,
            height=22,
            fg_color="transparent",
            hover_color="#2D3045",
            text_color=COLOR_TEXT_MAIN,
            command=self._cycle_opacity
        )
        self.btn_trans.pack(side="left", padx=2)

        # Compact toggle button
        self.btn_compact = ctk.CTkButton(
            actions_box,
            text="—",
            font=ctk.CTkFont(size=12, weight="bold"),
            width=26,
            height=22,
            fg_color="transparent",
            hover_color="#2D3045",
            text_color=COLOR_TEXT_MAIN,
            command=self.toggle_compact
        )
        self.btn_compact.pack(side="left", padx=2)

        # Close overlay button
        btn_close = ctk.CTkButton(
            actions_box,
            text="✕",
            font=ctk.CTkFont(size=11, weight="bold"),
            width=26,
            height=22,
            fg_color="transparent",
            hover_color="#B91C1C",
            text_color=COLOR_TEXT_MAIN,
            command=self.hide_overlay
        )
        btn_close.pack(side="left", padx=2)

    def _build_compact_frame(self):
        """Compact Pill layout: 380x42 mini in-game bar with title, time, play/pause and expand."""
        self.compact_frame = ctk.CTkFrame(self, fg_color=COLOR_HEADER_BG, height=42, corner_radius=10)
        # Initially not packed

        # Left mini play button
        self.btn_compact_play = ctk.CTkButton(
            self.compact_frame,
            text="▶",
            font=ctk.CTkFont(size=12, weight="bold"),
            fg_color=COLOR_GOLD,
            hover_color=COLOR_GOLD_HOVER,
            text_color="#12121A",
            width=32,
            height=28,
            corner_radius=6,
            command=self._on_play
        )
        self.btn_compact_play.pack(side="left", padx=(8, 6), pady=7)

        # Center: Song title & time
        center_box = ctk.CTkFrame(self.compact_frame, fg_color="transparent")
        center_box.pack(side="left", fill="both", expand=True, pady=4)
        self._bind_drag(center_box)

        self.lbl_compact_title = ctk.CTkLabel(
            center_box,
            text="🎵 No Song Loaded",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color=COLOR_GOLD,
            anchor="w"
        )
        self.lbl_compact_title.pack(fill="x")

        self.lbl_compact_time = ctk.CTkLabel(
            center_box,
            text="00:00 / 00:00",
            font=ctk.CTkFont(size=10),
            text_color=COLOR_TEXT_MUTED,
            anchor="w"
        )
        self.lbl_compact_time.pack(fill="x")
        self._bind_drag(self.lbl_compact_time)

        # Right mini controls: Next, Expand, Close
        right_box = ctk.CTkFrame(self.compact_frame, fg_color="transparent")
        right_box.pack(side="right", padx=(2, 6))

        self.btn_compact_next = ctk.CTkButton(
            right_box,
            text="⏭",
            font=ctk.CTkFont(size=10),
            width=24,
            height=26,
            fg_color=COLOR_BTN_BG,
            hover_color=COLOR_BTN_HOVER,
            command=self._on_next
        )
        self.btn_compact_next.pack(side="left", padx=2)

        self.btn_compact_expand = ctk.CTkButton(
            right_box,
            text="⛶",
            font=ctk.CTkFont(size=11, weight="bold"),
            width=24,
            height=26,
            fg_color="transparent",
            hover_color="#2D3045",
            command=self.toggle_compact
        )
        self.btn_compact_expand.pack(side="left", padx=2)

        self.btn_compact_close = ctk.CTkButton(
            right_box,
            text="✕",
            font=ctk.CTkFont(size=10, weight="bold"),
            width=24,
            height=26,
            fg_color="transparent",
            hover_color="#B91C1C",
            command=self.hide_overlay
        )
        self.btn_compact_close.pack(side="left", padx=2)

    def _build_body(self):
        """Expanded player body with full controls and scrubber."""
        self.body_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.body_frame.pack(fill="both", expand=True, padx=12, pady=6)

        # Row 1: Song Title
        self.lbl_song_title = ctk.CTkLabel(
            self.body_frame,
            text="🎵 No Song Loaded",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=COLOR_GOLD,
            anchor="w"
        )
        self.lbl_song_title.pack(fill="x", pady=(2, 2))

        # Row 2: Progress Slider + Time Display
        time_box = ctk.CTkFrame(self.body_frame, fg_color="transparent")
        time_box.pack(fill="x", pady=2)

        self.lbl_time = ctk.CTkLabel(
            time_box,
            text="00:00 / 00:00",
            font=ctk.CTkFont(size=11),
            text_color=COLOR_TEXT_MUTED
        )
        self.lbl_time.pack(side="right", padx=(6, 0))

        self.slider = ctk.CTkSlider(
            time_box,
            from_=0.0,
            to=100.0,
            height=12,
            progress_color=COLOR_CYAN,
            button_color=COLOR_CYAN,
            button_hover_color=COLOR_GOLD_HOVER,
            command=self._on_seek
        )
        self.slider.pack(side="left", fill="x", expand=True)

        # Row 3: Playback Controls (Prev, Play/Pause, Stop, Next)
        ctrl_row = ctk.CTkFrame(self.body_frame, fg_color="transparent")
        ctrl_row.pack(fill="x", pady=(4, 6))

        self.btn_prev = ctk.CTkButton(
            ctrl_row,
            text="⏮",
            font=ctk.CTkFont(size=12),
            width=36,
            height=30,
            fg_color=COLOR_BTN_BG,
            hover_color=COLOR_BTN_HOVER,
            command=self._on_prev
        )
        self.btn_prev.pack(side="left", padx=(0, 6))

        self.btn_play = ctk.CTkButton(
            ctrl_row,
            text="▶ Play",
            font=ctk.CTkFont(size=12, weight="bold"),
            fg_color=COLOR_GOLD,
            hover_color=COLOR_GOLD_HOVER,
            text_color="#12121A",
            height=30,
            command=self._on_play
        )
        self.btn_play.pack(side="left", fill="x", expand=True, padx=(0, 6))

        self.btn_stop = ctk.CTkButton(
            ctrl_row,
            text="⏹ Stop",
            font=ctk.CTkFont(size=12, weight="bold"),
            fg_color="#3B2027",
            hover_color="#572B36",
            text_color="#FFA4A4",
            width=65,
            height=30,
            command=self._on_stop
        )
        self.btn_stop.pack(side="left", padx=(0, 6))

        self.btn_next = ctk.CTkButton(
            ctrl_row,
            text="⏭",
            font=ctk.CTkFont(size=12),
            width=36,
            height=30,
            fg_color=COLOR_BTN_BG,
            hover_color=COLOR_BTN_HOVER,
            command=self._on_next
        )
        self.btn_next.pack(side="left")

        # Row 4: Quick Tuning Badges (Speed button & Hotkey reminder)
        badge_row = ctk.CTkFrame(self.body_frame, fg_color="transparent")
        badge_row.pack(fill="x")

        play_k = getattr(self.player_worker, 'hotkey_play', '1')
        stop_k = getattr(self.player_worker, 'hotkey_stop', '2')
        self.lbl_hotkeys = ctk.CTkLabel(
            badge_row,
            text=f"⚡ {play_k}: Play | {stop_k}: Stop | F11: Overlay",
            font=ctk.CTkFont(size=10, weight="bold"),
            text_color=COLOR_CYAN
        )
        self.lbl_hotkeys.pack(side="left")

        # Clickable Speed Button
        self.btn_speed_badge = ctk.CTkButton(
            badge_row,
            text="1.0x",
            font=ctk.CTkFont(size=10, weight="bold"),
            fg_color=COLOR_BTN_BG,
            hover_color=COLOR_BTN_HOVER,
            corner_radius=4,
            text_color=COLOR_GOLD,
            width=46,
            height=22,
            command=self._cycle_speed
        )
        self.btn_speed_badge.pack(side="right")

    # -------------------------------------------------------------
    # State synchronization & updates
    # -------------------------------------------------------------
    def sync_full_state(
        self,
        song_title: str,
        duration_sec: float,
        current_sec: float,
        state_str: str,
        speed_val: float,
        hotkey_play: str = "1",
        hotkey_stop: str = "2"
    ):
        """Immediately update all overlay fields when shown."""
        self.update_song_info(song_title, duration_sec, speed_val)
        self.update_progress(current_sec, duration_sec)
        self.update_state(state_str)
        self.update_hotkey_label(hotkey_play, hotkey_stop)

    def update_song_info(self, title: str, duration_sec: float, speed_val: float):
        clean_title = f"🎵 {title}" if not title.startswith("🎵") else title
        self.lbl_song_title.configure(text=clean_title)
        self.lbl_compact_title.configure(text=clean_title)
        self.slider.configure(to=max(1.0, duration_sec))
        self.current_speed = speed_val
        spd_text = f"{speed_val:.1f}x" if speed_val != 1.25 else "1.25x"
        self.btn_speed_badge.configure(text=spd_text)

    def update_progress(self, current_sec: float, total_sec: float):
        cur_m, cur_s = int(current_sec // 60), int(current_sec % 60)
        tot_m, tot_s = int(total_sec // 60), int(total_sec % 60)
        time_text = f"{cur_m:02d}:{cur_s:02d} / {tot_m:02d}:{tot_s:02d}"
        self.lbl_time.configure(text=time_text)
        self.lbl_compact_time.configure(text=time_text)
        self.slider.set(current_sec)

    def update_state(self, state_str: str):
        if state_str == "PLAYING":
            self.btn_play.configure(text="⏸ Pause", fg_color="#2D3045", text_color="#A0A5BD")
            self.btn_compact_play.configure(text="⏸", fg_color="#2D3045", text_color="#A0A5BD")
        elif state_str == "PAUSED":
            self.btn_play.configure(text="▶ Resume", fg_color=COLOR_GOLD, text_color="#12121A")
            self.btn_compact_play.configure(text="▶", fg_color=COLOR_GOLD, text_color="#12121A")
        else:
            self.btn_play.configure(text="▶ Play", fg_color=COLOR_GOLD, text_color="#12121A")
            self.btn_compact_play.configure(text="▶", fg_color=COLOR_GOLD, text_color="#12121A")

    def toggle_compact(self):
        """Switch between Expanded view (380x190) and Compact Pill (380x42)."""
        if not self.is_compact:
            self.header_frame.pack_forget()
            self.body_frame.pack_forget()
            self.compact_frame.pack(fill="both", expand=True)
            self.geometry("380x42")
            self.is_compact = True
        else:
            self.compact_frame.pack_forget()
            self.header_frame.pack(fill="x", side="top")
            self.body_frame.pack(fill="both", expand=True, padx=12, pady=6)
            self.geometry("380x190")
            self.is_compact = False

    def _toggle_pin(self):
        """Toggle Always-On-Top."""
        self.is_topmost = not self.is_topmost
        self.attributes('-topmost', self.is_topmost)
        if self.is_topmost:
            self.btn_pin.configure(fg_color="#3D1E32", text_color=COLOR_CYAN)
        else:
            self.btn_pin.configure(fg_color="transparent", text_color="#7A7085")

    def _cycle_opacity(self):
        """Cycle through 95% -> 75% -> 50% opacity with visible percentage readout."""
        steps = [0.95, 0.75, 0.50]
        cur_idx = 0
        for i, val in enumerate(steps):
            if abs(self.current_opacity - val) < 0.05:
                cur_idx = i
                break
        next_idx = (cur_idx + 1) % len(steps)
        self.current_opacity = steps[next_idx]
        self.attributes('-alpha', self.current_opacity)
        self.btn_trans.configure(text=f"👁 {int(self.current_opacity*100)}%")

    def _cycle_speed(self):
        """Cycle playback speed: 0.8x -> 1.0x -> 1.25x -> 1.5x -> 2.0x."""
        cur_idx = 1
        for i, spd in enumerate(self.speed_presets):
            if abs(self.current_speed - spd) < 0.05:
                cur_idx = i
                break
        next_idx = (cur_idx + 1) % len(self.speed_presets)
        new_speed = self.speed_presets[next_idx]
        self.current_speed = new_speed
        spd_text = f"{new_speed:.1f}x" if new_speed != 1.25 else "1.25x"
        self.btn_speed_badge.configure(text=spd_text)
        if self.on_speed_change:
            self.on_speed_change(new_speed)

    def _on_play(self):
        from core.player_worker import PlayerState
        if self.player_worker.state == PlayerState.PLAYING:
            self.player_worker.pause()
        elif self.player_worker.state == PlayerState.PAUSED:
            self.player_worker.resume()
        else:
            self.player_worker.play(start_time=self.slider.get())

    def _on_stop(self):
        self.player_worker.stop()
        self.slider.set(0.0)

    def _on_seek(self, val):
        self.player_worker.seek(val)

    def _on_next(self):
        if self.on_next_song:
            self.on_next_song()

    def _on_prev(self):
        if self.on_prev_song:
            self.on_prev_song()

    def show_overlay(self):
        self.deiconify()
        self.lift()
        self.attributes('-topmost', self.is_topmost)

    def hide_overlay(self):
        self.withdraw()

    def update_hotkey_label(self, play_key: str, stop_key: str):
        if hasattr(self, "lbl_hotkeys"):
            self.lbl_hotkeys.configure(text=f"⚡ {play_key}: Play | {stop_key}: Stop | F11: Overlay")
