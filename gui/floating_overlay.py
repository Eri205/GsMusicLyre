"""
gui/floating_overlay.py
Tactical Floating HUD / Compact In-Game Widget for GsMusicLyre.
Designed with OLED Matte Dark Mode (#0D0E12), thin hairline borders,
sleek mini progress bar, refined micro-controls, and tactile keycap badges [F8], [F10], [F11].
"""

import tkinter as tk
import customtkinter as ctk
from typing import Optional, Callable

# Tactical OLED Color Palette (Synchronized with Main Studio App)
COLOR_OVERLAY_BG = "#0D0E12"
COLOR_HEADER_BG = "#12141D"
COLOR_SURFACE = "#171924"
COLOR_BORDER = "#222534"
COLOR_CORAL = "#FF4D6D"
COLOR_CORAL_HOVER = "#FF6B85"
COLOR_CYAN = "#00F2FE"
COLOR_TEXT_MAIN = "#FFFFFF"
COLOR_TEXT_MUTED = "#8E92A0"
COLOR_BTN_BG = "#191C28"
COLOR_BTN_HOVER = "#25293B"


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
        self.title("GsMusicLyre Tactical HUD")
        self.geometry("340x136+80+80")
        self.resizable(False, False)
        self.attributes('-topmost', True)
        self.configure(fg_color=COLOR_OVERLAY_BG)

        # Frameless floating widget style
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
        """Minimalist top hairline header."""
        self.header_frame = ctk.CTkFrame(
            self,
            fg_color=COLOR_HEADER_BG,
            height=28,
            corner_radius=0
        )
        self.header_frame.pack(fill="x", side="top")
        self.header_frame.pack_propagate(False)

        # Left HUD Status Tag
        left_box = ctk.CTkFrame(self.header_frame, fg_color="transparent")
        left_box.pack(side="left", padx=8)

        self.title_label = ctk.CTkLabel(
            left_box,
            text="⚡ IN-GAME HUD",
            font=ctk.CTkFont(family="Consolas", size=10, weight="bold"),
            text_color=COLOR_CYAN
        )
        self.title_label.pack(side="left")

        # Right Action Buttons: Pin, Opacity, Compact, Close
        actions_box = ctk.CTkFrame(self.header_frame, fg_color="transparent")
        actions_box.pack(side="right", padx=6)

        # Pin / Always-On-Top
        self.btn_pin = ctk.CTkButton(
            actions_box,
            text="📌",
            font=ctk.CTkFont(size=10),
            width=22,
            height=20,
            fg_color="#1F2332",
            hover_color="#2B3045",
            text_color=COLOR_CYAN,
            corner_radius=4,
            command=self._toggle_pin
        )
        self.btn_pin.pack(side="left", padx=1)

        # Opacity button
        self.btn_trans = ctk.CTkButton(
            actions_box,
            text=f"{int(self.current_opacity*100)}%",
            font=ctk.CTkFont(family="Consolas", size=9, weight="bold"),
            width=36,
            height=20,
            fg_color="transparent",
            hover_color="#1F2332",
            text_color=COLOR_TEXT_MUTED,
            corner_radius=4,
            command=self._cycle_opacity
        )
        self.btn_trans.pack(side="left", padx=1)

        # Compact toggle button
        self.btn_compact = ctk.CTkButton(
            actions_box,
            text="—",
            font=ctk.CTkFont(size=10, weight="bold"),
            width=22,
            height=20,
            fg_color="transparent",
            hover_color="#1F2332",
            text_color=COLOR_TEXT_MUTED,
            corner_radius=4,
            command=self.toggle_compact
        )
        self.btn_compact.pack(side="left", padx=1)

        # Close button
        btn_close = ctk.CTkButton(
            actions_box,
            text="✕",
            font=ctk.CTkFont(size=10),
            width=22,
            height=20,
            fg_color="transparent",
            hover_color="#B91C1C",
            text_color=COLOR_TEXT_MUTED,
            corner_radius=4,
            command=self.hide_overlay
        )
        btn_close.pack(side="left", padx=1)

    def _build_compact_frame(self):
        """Ultra-Compact Pill mode (320x36)."""
        self.compact_frame = ctk.CTkFrame(
            self,
            fg_color=COLOR_OVERLAY_BG,
            height=36,
            corner_radius=8,
            border_width=1,
            border_color=COLOR_BORDER
        )

        # Left mini play button
        self.btn_compact_play = ctk.CTkButton(
            self.compact_frame,
            text="▶",
            font=ctk.CTkFont(size=10, weight="bold"),
            fg_color=COLOR_CORAL,
            hover_color=COLOR_CORAL_HOVER,
            text_color="#FFFFFF",
            width=26,
            height=24,
            corner_radius=4,
            command=self._on_play
        )
        self.btn_compact_play.pack(side="left", padx=(6, 6), pady=6)

        # Center Title & Time
        center_box = ctk.CTkFrame(self.compact_frame, fg_color="transparent")
        center_box.pack(side="left", fill="both", expand=True, pady=2)
        self._bind_drag(center_box)

        self.lbl_compact_title = ctk.CTkLabel(
            center_box,
            text="No Song Loaded",
            font=ctk.CTkFont(size=10, weight="bold"),
            text_color=COLOR_TEXT_MAIN,
            anchor="w"
        )
        self.lbl_compact_title.pack(fill="x")

        self.lbl_compact_time = ctk.CTkLabel(
            center_box,
            text="00:00 / 00:00",
            font=ctk.CTkFont(family="Consolas", size=8),
            text_color=COLOR_TEXT_MUTED,
            anchor="w"
        )
        self.lbl_compact_time.pack(fill="x")
        self._bind_drag(self.lbl_compact_time)

        # Right buttons
        right_box = ctk.CTkFrame(self.compact_frame, fg_color="transparent")
        right_box.pack(side="right", padx=(2, 6))

        self.btn_compact_next = ctk.CTkButton(
            right_box,
            text="⏭",
            font=ctk.CTkFont(size=9),
            width=20,
            height=22,
            fg_color=COLOR_BTN_BG,
            hover_color=COLOR_BTN_HOVER,
            corner_radius=3,
            command=self._on_next
        )
        self.btn_compact_next.pack(side="left", padx=1)

        self.btn_compact_expand = ctk.CTkButton(
            right_box,
            text="⛶",
            font=ctk.CTkFont(size=9),
            width=20,
            height=22,
            fg_color="transparent",
            hover_color="#1F2332",
            corner_radius=3,
            command=self.toggle_compact
        )
        self.btn_compact_expand.pack(side="left", padx=1)

        self.btn_compact_close = ctk.CTkButton(
            right_box,
            text="✕",
            font=ctk.CTkFont(size=9),
            width=20,
            height=22,
            fg_color="transparent",
            hover_color="#B91C1C",
            corner_radius=3,
            command=self.hide_overlay
        )
        self.btn_compact_close.pack(side="left", padx=1)

    def _build_body(self):
        """Refined Tactical HUD expanded body."""
        self.body_frame = ctk.CTkFrame(
            self,
            fg_color="transparent",
            corner_radius=0
        )
        self.body_frame.pack(fill="both", expand=True, padx=10, pady=(4, 6))

        # Row 1: Song Title + Time display
        title_row = ctk.CTkFrame(self.body_frame, fg_color="transparent")
        title_row.pack(fill="x", pady=(0, 2))

        self.lbl_song_title = ctk.CTkLabel(
            title_row,
            text="No Song Loaded",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color=COLOR_TEXT_MAIN,
            anchor="w"
        )
        self.lbl_song_title.pack(side="left", fill="x", expand=True)

        self.lbl_time = ctk.CTkLabel(
            title_row,
            text="00:00 / 00:00",
            font=ctk.CTkFont(family="Consolas", size=9),
            text_color=COLOR_TEXT_MUTED
        )
        self.lbl_time.pack(side="right")

        # Row 2: Hairline Sleek Progress Slider
        self.slider = ctk.CTkSlider(
            self.body_frame,
            from_=0.0,
            to=100.0,
            height=8,
            progress_color=COLOR_CORAL,
            button_color=COLOR_CYAN,
            button_hover_color="#5FF7FE",
            fg_color="#181B26",
            command=self._on_seek
        )
        self.slider.pack(fill="x", pady=(2, 6))

        # Row 3: Playback Controls (Prev, Play Pill, Stop, Next, Speed)
        ctrl_row = ctk.CTkFrame(self.body_frame, fg_color="transparent")
        ctrl_row.pack(fill="x", pady=(0, 4))

        self.btn_prev = ctk.CTkButton(
            ctrl_row,
            text="⏮",
            font=ctk.CTkFont(size=11),
            width=30,
            height=28,
            fg_color="#181B26",
            hover_color=COLOR_BTN_HOVER,
            corner_radius=14,
            command=self._on_prev
        )
        self.btn_prev.pack(side="left", padx=(0, 5))

        # Refined Pill-shaped Play Button
        self.btn_play = ctk.CTkButton(
            ctrl_row,
            text="▶ Play",
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color=COLOR_CORAL,
            hover_color=COLOR_CORAL_HOVER,
            text_color="#FFFFFF",
            height=28,
            corner_radius=14,
            command=self._on_play
        )
        self.btn_play.pack(side="left", fill="x", expand=True, padx=(0, 5))

        # Balanced Symmetrical Stop Button
        self.btn_stop = ctk.CTkButton(
            ctrl_row,
            text="⏹ Stop",
            font=ctk.CTkFont(size=10, weight="bold"),
            fg_color="#1C1F2E",
            hover_color="#361D27",
            text_color="#FF8A9E",
            border_width=1,
            border_color="#2A2E42",
            width=64,
            height=28,
            corner_radius=14,
            command=self._on_stop
        )
        self.btn_stop.pack(side="left", padx=(0, 5))

        self.btn_next = ctk.CTkButton(
            ctrl_row,
            text="⏭",
            font=ctk.CTkFont(size=11),
            width=30,
            height=28,
            fg_color="#181B26",
            hover_color=COLOR_BTN_HOVER,
            corner_radius=14,
            command=self._on_next
        )
        self.btn_next.pack(side="left", padx=(0, 5))

        self.btn_speed_badge = ctk.CTkButton(
            ctrl_row,
            text="1.0x",
            font=ctk.CTkFont(family="Consolas", size=9, weight="bold"),
            fg_color="#181B26",
            hover_color=COLOR_BTN_HOVER,
            corner_radius=6,
            text_color=COLOR_CYAN,
            width=40,
            height=28,
            command=self._cycle_speed
        )
        self.btn_speed_badge.pack(side="right")

        # Row 4: Tactile Keycap Badges [F8] Play · [F10] Stop · [F11] HUD
        badge_row = ctk.CTkFrame(self.body_frame, fg_color="transparent")
        badge_row.pack(fill="x")

        self.lbl_hotkeys = ctk.CTkLabel(
            badge_row,
            text="[F8] Play/Pause   [F10] Stop   [F11] HUD",
            font=ctk.CTkFont(family="Consolas", size=8, weight="bold"),
            text_color="#6B7280"
        )
        self.lbl_hotkeys.pack(side="left")

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
        hotkey_play: str = "F8",
        hotkey_stop: str = "F10"
    ):
        """Immediately update all overlay fields when shown."""
        self.update_song_info(song_title, duration_sec, speed_val)
        self.update_progress(current_sec, duration_sec)
        self.update_state(state_str)
        self.update_hotkey_label(hotkey_play, hotkey_stop)

    def update_song_info(self, title: str, duration_sec: float, speed_val: float):
        clean_title = title if title else "No Song Loaded"
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
            self.btn_play.configure(text="⏸ Pause", fg_color="#202434", hover_color="#2A3044", text_color="#00F2FE")
            self.btn_compact_play.configure(text="⏸", fg_color="#202434", hover_color="#2A3044", text_color="#00F2FE")
        elif state_str == "PAUSED":
            self.btn_play.configure(text="▶ Resume", fg_color=COLOR_CORAL, hover_color=COLOR_CORAL_HOVER, text_color="#FFFFFF")
            self.btn_compact_play.configure(text="▶", fg_color=COLOR_CORAL, hover_color=COLOR_CORAL_HOVER, text_color="#FFFFFF")
        else:
            self.btn_play.configure(text="▶ Play", fg_color=COLOR_CORAL, hover_color=COLOR_CORAL_HOVER, text_color="#FFFFFF")
            self.btn_compact_play.configure(text="▶", fg_color=COLOR_CORAL, hover_color=COLOR_CORAL_HOVER, text_color="#FFFFFF")

    def toggle_compact(self):
        """Switch between Expanded view (340x136) and Compact Pill (320x36)."""
        if not self.is_compact:
            self.header_frame.pack_forget()
            self.body_frame.pack_forget()
            self.compact_frame.pack(fill="both", expand=True)
            self.geometry("320x36")
            self.is_compact = True
        else:
            self.compact_frame.pack_forget()
            self.header_frame.pack(fill="x", side="top")
            self.body_frame.pack(fill="both", expand=True, padx=10, pady=(4, 6))
            self.geometry("340x136")
            self.is_compact = False

    def _toggle_pin(self):
        """Toggle Always-On-Top."""
        self.is_topmost = not self.is_topmost
        self.attributes('-topmost', self.is_topmost)
        if self.is_topmost:
            self.btn_pin.configure(fg_color="#1F2332", text_color=COLOR_CYAN)
        else:
            self.btn_pin.configure(fg_color="transparent", text_color=COLOR_TEXT_MUTED)

    def _cycle_opacity(self):
        """Cycle through 95% -> 75% -> 50% opacity."""
        steps = [0.95, 0.75, 0.50]
        cur_idx = 0
        for i, val in enumerate(steps):
            if abs(self.current_opacity - val) < 0.05:
                cur_idx = i
                break
        next_idx = (cur_idx + 1) % len(steps)
        self.current_opacity = steps[next_idx]
        self.attributes('-alpha', self.current_opacity)
        self.btn_trans.configure(text=f"{int(self.current_opacity*100)}%")

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
            self.lbl_hotkeys.configure(text=f"[{play_key}] Play/Pause   [{stop_key}] Stop   [F11] HUD")
