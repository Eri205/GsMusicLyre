"""
core/midi_engine.py
High-precision MIDI parser, transposer, and schedule optimizer for Genshin Impact lyre.
Maps MIDI pitches to the 21 natural keys (Q-U, A-J, Z-M) with octave wrapping and auto-transposition.
"""

import ctypes
import os
import re
import json
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional, Set, Any
import mido

# WinMM multimedia timer for 1ms Windows sleep precision
winmm = ctypes.windll.winmm

def enable_high_precision_timer():
    """Request 1ms timer resolution on Windows."""
    try:
        winmm.timeBeginPeriod(1)
    except Exception:
        pass

def disable_high_precision_timer():
    """Restore normal timer resolution on Windows."""
    try:
        winmm.timeEndPeriod(1)
    except Exception:
        pass


# Natural pitch classes (0=C, 2=D, 4=E, 5=F, 7=G, 9=A, 11=B)
NATURAL_PITCH_CLASSES = {0, 2, 4, 5, 7, 9, 11}

# Genshin Impact: 21 keys (C3 to B5, 3 complete octaves)
GENSHIN_NOTE_TO_KEY: Dict[int, str] = {
    # Low Octave (C3 - B3)
    48: 'Z', 50: 'X', 52: 'C', 53: 'V', 55: 'B', 57: 'N', 59: 'M',
    # Mid Octave (C4 - B4)
    60: 'A', 62: 'S', 64: 'D', 65: 'F', 67: 'G', 69: 'H', 71: 'J',
    # High Octave (C5 - B5)
    72: 'Q', 74: 'W', 76: 'E', 77: 'R', 79: 'T', 81: 'Y', 83: 'U',
}

# Sky: Children of the Light (15 keys) - Standard PC Macro / Specy Layout:
# 3 rows of 5 notes spanning C4 to C6 (2 octaves)
# Row 1 (Top 5): C4, D4, E4, F4, G4 -> Q, W, E, R, T
# Row 2 (Mid 5): A4, B4, C5, D5, E5 -> A, S, D, F, G
# Row 3 (Bot 5): F5, G5, A5, B5, C6 -> Z, X, C, V, B
SKY_NOTE_TO_KEY_QWERT: Dict[int, str] = {
    # Row 1 (Top 5)
    60: 'Q', 62: 'W', 64: 'E', 65: 'R', 67: 'T',
    # Row 2 (Middle 5)
    69: 'A', 71: 'S', 72: 'D', 74: 'F', 76: 'G',
    # Row 3 (Bottom 5)
    77: 'Z', 79: 'X', 81: 'C', 83: 'V', 84: 'B',
}

# Sky: Children of the Light (15 keys) - Steam Official Default Layout:
# Row 1 (Top 5): C4, D4, E4, F4, G4 -> Y, U, I, O, P
# Row 2 (Mid 5): A4, B4, C5, D5, E5 -> H, J, K, L, ;
# Row 3 (Bot 5): F5, G5, A5, B5, C6 -> B, N, M, ,, .
SKY_NOTE_TO_KEY_STEAM: Dict[int, str] = {
    # Row 1 (Top 5)
    60: 'Y', 62: 'U', 64: 'I', 65: 'O', 67: 'P',
    # Row 2 (Middle 5)
    69: 'H', 71: 'J', 72: 'K', 74: 'L', 76: ';',
    # Row 3 (Bottom 5)
    77: 'B', 79: 'N', 81: 'M', 83: ',', 84: '.',
}

# Key to Note lookup dictionaries
GENSHIN_KEY_TO_NOTE = {v: k for k, v in GENSHIN_NOTE_TO_KEY.items()}
SKY_KEY_TO_NOTE_QWERT = {v: k for k, v in SKY_NOTE_TO_KEY_QWERT.items()}
SKY_KEY_TO_NOTE_STEAM = {v: k for k, v in SKY_NOTE_TO_KEY_STEAM.items()}

# Default alias for backwards compatibility
NOTE_TO_KEY = GENSHIN_NOTE_TO_KEY
KEY_TO_NOTE = GENSHIN_KEY_TO_NOTE

# Nearest natural pitch class lookup for accidentals
NEAREST_NATURAL_CLASS = {
    1: 0,   # C# -> C
    3: 4,   # D# -> E
    6: 7,   # F# -> G
    8: 9,   # G# -> A
    10: 9,  # A# -> A (or B)
}

# Sky: Children of the Light (15 keys) - Standard ABC Notation (A1-A5, B1-B5, C1-C5):
SKY_ABC_TO_NOTE: Dict[str, int] = {
    # Row 1 (Top 5): C4, D4, E4, F4, G4
    'A1': 60, 'A2': 62, 'A3': 64, 'A4': 65, 'A5': 67,
    # Row 2 (Middle 5): A4, B4, C5, D5, E5
    'B1': 69, 'B2': 71, 'B3': 72, 'B4': 74, 'B5': 76,
    # Row 3 (Bottom 5): F5, G5, A5, B5, C6
    'C1': 77, 'C2': 79, 'C3': 81, 'C4': 83, 'C5': 84,
}

# Genshin Impact numeric key indices (0 to 20) used in Specy / Genshin Music JSON:
GENSHIN_INDEX_TO_NOTE: Dict[int, int] = {
    # Low Octave (0-6) -> Z, X, C, V, B, N, M (C3 - B3)
    0: 48, 1: 50, 2: 52, 3: 53, 4: 55, 5: 57, 6: 59,
    # Mid Octave (7-13) -> A, S, D, F, G, H, J (C4 - B4)
    7: 60, 8: 62, 9: 64, 10: 65, 11: 67, 12: 69, 13: 71,
    # High Octave (14-20) -> Q, W, E, R, T, Y, U (C5 - B5)
    14: 72, 15: 74, 16: 76, 17: 77, 18: 79, 19: 81, 20: 83,
}

# Sky Cotl numeric key indices (0 to 14) used in Sky Studio JSON:
SKY_INDEX_TO_NOTE: Dict[int, int] = {
    # Row 1 (Top 5): C4, D4, E4, F4, G4
    0: 60, 1: 62, 2: 64, 3: 65, 4: 67,
    # Row 2 (Middle 5): A4, B4, C5, D5, E5
    5: 69, 6: 71, 7: 72, 8: 74, 9: 76,
    # Row 3 (Bottom 5): F5, G5, A5, B5, C6
    10: 77, 11: 79, 12: 81, 13: 83, 14: 84,
}

# Sky: Children of the Light (15 keys) - 1-based Numeric notation (1 to 15):
# Row 1 (Top 5): 1-5 -> C4, D4, E4, F4, G4
# Row 2 (Middle 5): 6-10 -> A4, B4, C5, D5, E5
# Row 3 (Bottom 5): 11-15 -> F5, G5, A5, B5, C6
SKY_15_INDEX_TO_NOTE: Dict[int, int] = {
    1: 60, 2: 62, 3: 64, 4: 65, 5: 67,
    6: 69, 7: 71, 8: 72, 9: 74, 10: 76,
    11: 77, 12: 79, 13: 81, 14: 83, 15: 84,
}

@dataclass
class TrackInfo:
    index: int
    name: str
    channel: int
    note_count: int
    enabled: bool = True

@dataclass
class RawMidiNote:
    start_time: float  # in seconds
    duration: float
    pitch: int         # 0-127
    velocity: int
    channel: int
    track_index: int

@dataclass
class PlaybackNote:
    timestamp: float   # in seconds
    key: str           # 'Q', 'A', 'Z', etc.
    original_pitch: int
    transposed_pitch: int
    track_index: int

@dataclass
class PlaybackChord:
    timestamp: float
    keys: List[str]
    notes: List[PlaybackNote]


class MidiEngine:
    def __init__(self, filepath: Optional[str] = None, target_instrument: str = 'genshin'):
        self.filepath: Optional[str] = filepath
        self.target_instrument: str = target_instrument
        self.filename: str = ""
        self.raw_notes: List[RawMidiNote] = []
        self.tracks: List[TrackInfo] = []
        self.duration_seconds: float = 0.0
        self.bpm: float = 120.0
        self.recommended_transpose: int = 0
        
        if filepath and os.path.exists(filepath):
            self.load_file(filepath, target_instrument=target_instrument)

    def load_file(self, filepath: str, target_instrument: str = 'genshin'):
        """Parse MIDI or TXT sheet file, extract metadata, tracks, and note events."""
        self.filepath = filepath
        self.target_instrument = target_instrument
        self.filename = os.path.basename(filepath)
        self.raw_notes.clear()
        self.tracks.clear()
        
        # Magic byte detection for binary MIDI files (MThd) vs text/JSON sheets
        is_binary_midi = False
        try:
            with open(filepath, 'rb') as f:
                if f.read(4) == b'MThd':
                    is_binary_midi = True
        except Exception:
            pass

        if not is_binary_midi and (filepath.lower().endswith(('.txt', '.json', '.skysheet')) or not filepath.lower().endswith(('.mid', '.midi'))):
            self._load_text_file(filepath, target_instrument=target_instrument)
            return

        try:
            mid = mido.MidiFile(filepath, clip=True)
        except Exception:
            mid = mido.MidiFile(filepath)
        
        ticks_per_beat = getattr(mid, 'ticks_per_beat', 480) or 480
        total_time = 0.0
        tempo = 500000  # Default 120 BPM (microseconds per beat)
        tempo_changes = []  # (abs_ticks, tempo)

        # Track metadata detection
        track_names = {}
        track_channels = {}
        track_note_counts = {}

        for trk_idx, track in enumerate(mid.tracks):
            track_name = f"Track {trk_idx + 1}"
            channel_used = 0
            note_cnt = 0
            melodic_notes = 0
            drum_notes = 0
            
            for msg in track:
                if msg.type == 'track_name':
                    track_name = msg.name.strip() or track_name
                elif msg.type in ('note_on', 'note_off'):
                    ch = getattr(msg, 'channel', 0)
                    channel_used = ch
                    if msg.type == 'note_on' and msg.velocity > 0:
                        note_cnt += 1
                        if ch == 9:
                            drum_notes += 1
                        else:
                            melodic_notes += 1
                elif msg.type == 'set_tempo':
                    tempo_changes.append(msg.tempo)

            track_names[trk_idx] = track_name
            track_channels[trk_idx] = channel_used
            track_note_counts[trk_idx] = note_cnt

            # Auto-enable any track that contains playable melodic notes
            # Only disable if empty or 100% pure drum track (channel 9)
            enabled = (melodic_notes > 0)
            
            self.tracks.append(TrackInfo(
                index=trk_idx,
                name=track_name,
                channel=channel_used,
                note_count=note_cnt,
                enabled=enabled
            ))

        # Failsafe: if no track was enabled (e.g. MIDI file where all notes are on channel 9 or percussion),
        # enable any track that has notes so it never produces total silence!
        if not any(t.enabled for t in self.tracks):
            for t in self.tracks:
                if t.note_count > 0:
                    t.enabled = True

        # Flatten MIDI messages with accurate seconds conversion and exact track_index
        messages_with_track = []
        for trk_idx, track in enumerate(mid.tracks):
            abs_tick = 0
            for msg in track:
                abs_tick += msg.time
                messages_with_track.append((abs_tick, trk_idx, msg))

        # Sort all messages by absolute tick, prioritizing set_tempo so tempo changes take effect before notes at the same tick
        messages_with_track.sort(key=lambda x: (x[0], 0 if x[2].type == 'set_tempo' else 1))

        current_tick = 0
        current_sec = 0.0
        tempo = 500000  # Default 120 BPM

        for abs_tick, trk_idx, msg in messages_with_track:
            delta_ticks = abs_tick - current_tick
            if delta_ticks > 0:
                current_sec += mido.tick2second(delta_ticks, ticks_per_beat, tempo)
                current_tick = abs_tick

            if msg.type == 'set_tempo':
                tempo = msg.tempo
                self.bpm = round(mido.tempo2bpm(tempo), 1)

            elif msg.type == 'note_on' and msg.velocity > 0:
                ch = getattr(msg, 'channel', 0)
                self.raw_notes.append(RawMidiNote(
                    start_time=current_sec,
                    duration=0.1,  # Genshin lyre is pluck-based (instant attack)
                    pitch=msg.note,
                    velocity=msg.velocity,
                    channel=ch,
                    track_index=trk_idx  # Exact Track Index
                ))

        self.duration_seconds = current_sec
        self.recommended_transpose = self.calculate_best_transpose(instrument=self.target_instrument)

    def calculate_best_transpose(self, instrument: str = 'genshin') -> int:
        """
        Analyze note pitch distribution to find the transpose semitone offset (-12 to +12)
        that produces the highest ratio of natural diatonic notes (C Major / A Minor)
        without breaking the melodic contour. Heavily penalizes octave folding downwards
        which inverts treble melody into lower octaves, and rewards keeping shift=0.
        """
        if not self.raw_notes:
            return 0

        # Filter out drum channel, unless all notes are channel 9
        melodic_notes = [n.pitch for n in self.raw_notes if n.channel != 9]
        if not melodic_notes:
            melodic_notes = [n.pitch for n in self.raw_notes]
        if not melodic_notes:
            return 0

        min_range, max_range = (60, 84) if instrument.startswith('sky') else (48, 83)

        best_shift = 0
        best_score = -1e9

        for shift in range(-12, 13):
            natural_count = 0
            in_range_count = 0
            folded_down_count = 0

            for pitch in melodic_notes:
                shifted = pitch + shift
                if (shifted % 12) in NATURAL_PITCH_CLASSES:
                    natural_count += 1
                if min_range <= shifted <= max_range:
                    in_range_count += 1
                elif shifted > max_range:
                    # Inversion penalty: notes exceeding max_range fold downwards, inverting treble melody
                    folded_down_count += 1

            # 1. Diatonic scale match (1000 pts per natural note)
            # 2. Inversion penalty (-30 pts per note folded downwards)
            # 3. In-range bonus (+2 pts)
            # 4. Small penalty for shifting away from original key (-3 pts per semitone)
            # 5. Bonus for shift=0 to keep the composer's original key (+50 pts)
            score = (
                natural_count * 1000
                - folded_down_count * 30
                + in_range_count * 2
                - abs(shift) * 3
                + (50 if shift == 0 else 0)
            )

            if score > best_score:
                best_score = score
                best_shift = shift

        return best_shift

    def _resolve_json_key(self, raw_key: Any, is_genshin: bool, is_sky: bool = False, is_sky_steam: bool = False) -> List[int]:
        """Convert a raw JSON key representation into target MIDI pitch(es)."""
        pitches: List[int] = []
        if raw_key is None:
            return pitches

        if isinstance(raw_key, int):
            if is_genshin:
                p = GENSHIN_INDEX_TO_NOTE.get(raw_key % 21, 60)
            elif raw_key in SKY_15_INDEX_TO_NOTE:
                p = SKY_15_INDEX_TO_NOTE[raw_key]
            else:
                p = SKY_INDEX_TO_NOTE.get(raw_key % 15, 60)
            pitches.append(p)
        elif isinstance(raw_key, str):
            key_clean = raw_key.strip()
            m = re.search(r'(\d+)?Key(\d+)', key_clean, re.IGNORECASE)
            if m:
                idx = int(m.group(2))
                if is_genshin:
                    p = GENSHIN_INDEX_TO_NOTE.get(idx % 21, 60)
                else:
                    p = SKY_INDEX_TO_NOTE.get(idx % 15, 60)
                pitches.append(p)
            elif key_clean.isdigit():
                idx = int(key_clean)
                if is_genshin:
                    p = GENSHIN_INDEX_TO_NOTE.get(idx % 21, 60)
                elif idx in SKY_15_INDEX_TO_NOTE:
                    p = SKY_15_INDEX_TO_NOTE[idx]
                else:
                    p = SKY_INDEX_TO_NOTE.get(idx % 15, 60)
                pitches.append(p)
            elif key_clean.upper() in SKY_ABC_TO_NOTE:
                pitches.append(SKY_ABC_TO_NOTE[key_clean.upper()])
            elif is_sky:
                # If target is Sky, prioritize Sky key mappings
                if is_sky_steam and key_clean.upper() in SKY_KEY_TO_NOTE_STEAM:
                    pitches.append(SKY_KEY_TO_NOTE_STEAM[key_clean.upper()])
                elif key_clean.upper() in SKY_KEY_TO_NOTE_QWERT:
                    pitches.append(SKY_KEY_TO_NOTE_QWERT[key_clean.upper()])
                elif key_clean.upper() in SKY_KEY_TO_NOTE_STEAM:
                    pitches.append(SKY_KEY_TO_NOTE_STEAM[key_clean.upper()])
                elif key_clean.upper() in GENSHIN_KEY_TO_NOTE:
                    pitches.append(GENSHIN_KEY_TO_NOTE[key_clean.upper()])
            else:
                if key_clean.upper() in GENSHIN_KEY_TO_NOTE:
                    pitches.append(GENSHIN_KEY_TO_NOTE[key_clean.upper()])
                elif key_clean.upper() in SKY_KEY_TO_NOTE_QWERT:
                    pitches.append(SKY_KEY_TO_NOTE_QWERT[key_clean.upper()])
        elif isinstance(raw_key, (list, tuple)):
            for sub in raw_key:
                pitches.extend(self._resolve_json_key(sub, is_genshin, is_sky=is_sky, is_sky_steam=is_sky_steam))
        return pitches

    def _parse_json_notes(self, notes_list: list, data: dict, target_instrument: str = 'genshin') -> bool:
        """Parse structured notes list from Sky Studio / Specy JSON with exact timestamp precision."""
        if not notes_list:
            return False

        target_is_sky = target_instrument.startswith('sky')
        is_sky_steam = (target_instrument == 'sky_steam')

        # Detect whether file is Genshin or Sky
        meta_str = (str(data.get('type', '')) + " " + str(data.get('name', '')) + " " + self.filename).lower()
        if "genshin" in meta_str:
            is_genshin = True
            is_sky = False
        elif "sky" in meta_str or "cotl" in meta_str or target_is_sky:
            is_genshin = False
            is_sky = True
        else:
            # Check key indices across the list
            is_genshin = False
            is_sky = True
            for item in notes_list:
                if isinstance(item, dict):
                    k = str(item.get('key', ''))
                    m = re.search(r'Key(\d+)', k, re.IGNORECASE)
                    if m and int(m.group(1)) > 14:
                        is_genshin = True
                        is_sky = False
                        break
                    elif k.upper() in ('Y', 'U', 'H', 'J', 'N', 'M'):
                        is_genshin = True
                        is_sky = False
                        break

        # Extract timestamps to determine scale (milliseconds vs seconds)
        raw_times = []
        for item in notes_list:
            if isinstance(item, dict):
                t = item.get('time')
                if t is None:
                    t = item.get('timestamp')
                if t is not None:
                    try:
                        raw_times.append(float(t))
                    except Exception:
                        pass

        max_t = max(raw_times) if raw_times else 0.0
        min_non_zero = min([t for t in raw_times if t > 0]) if any(t > 0 for t in raw_times) else 0.0
        # If max timestamp >= 500 or non-zero delta >= 10, the timestamps are milliseconds
        is_ms = (max_t >= 500.0 or min_non_zero >= 10.0)
        time_scale = (1.0 / 1000.0) if is_ms else 1.0

        found_any = False
        for item in notes_list:
            if not isinstance(item, dict):
                continue

            raw_time = item.get('time')
            if raw_time is None:
                raw_time = item.get('timestamp') or 0
            try:
                t_sec = float(raw_time) * time_scale
            except Exception:
                t_sec = 0.0

            raw_key = item.get('key')
            if raw_key is None:
                raw_key = item.get('note') if item.get('note') is not None else item.get('pitch')
            if raw_key is None:
                continue

            pitches = self._resolve_json_key(raw_key, is_genshin, is_sky=is_sky, is_sky_steam=is_sky_steam)
            for p in pitches:
                self.raw_notes.append(RawMidiNote(
                    start_time=t_sec,
                    duration=0.15,
                    pitch=p,
                    velocity=90,
                    channel=0,
                    track_index=0
                ))
                found_any = True

        return found_any

    def _parse_json_columns(self, data: dict, target_instrument: str = 'genshin') -> bool:
        """Parse Specy V2/V3 JSON sheets with column timelines."""
        columns = data.get('columns')
        if not isinstance(columns, list) or not columns:
            return False

        bpm = float(data.get('bpm', self.bpm or 120.0))
        self.bpm = bpm
        # Specy column timeline: quarter note = 4 columns (16th notes per column)
        column_step = (60.0 / bpm) * 0.25

        target_is_sky = target_instrument.startswith('sky')
        is_sky_steam = (target_instrument == 'sky_steam')

        meta_str = (str(data.get('type', '')) + " " + str(data.get('name', '')) + " " + self.filename).lower()
        if "genshin" in meta_str:
            is_genshin = True
            is_sky = False
        elif target_is_sky or "sky" in meta_str or "cotl" in meta_str:
            is_genshin = False
            is_sky = True
        else:
            is_genshin = False
            is_sky = True

        found_any = False
        for col_idx, col in enumerate(columns):
            t_sec = col_idx * column_step
            notes = []
            if isinstance(col, list):
                if len(col) >= 2 and isinstance(col[1], list):
                    notes = col[1]
                elif len(col) > 0 and isinstance(col[0], list):
                    notes = col[0]
                else:
                    notes = col
            elif isinstance(col, dict):
                notes = col.get('notes', [])

            for n in notes:
                raw_key = n.get('key') if isinstance(n, dict) else n
                pitches = self._resolve_json_key(raw_key, is_genshin, is_sky=is_sky, is_sky_steam=is_sky_steam)
                for p in pitches:
                    self.raw_notes.append(RawMidiNote(
                        start_time=t_sec,
                        duration=0.15,
                        pitch=p,
                        velocity=90,
                        channel=0,
                        track_index=0
                    ))
                    found_any = True

        return found_any

    @staticmethod
    def _extract_sheet_pitches(
        token: str,
        is_sky: bool = False,
        is_sky_15: bool = False,
        is_sky_steam: bool = False,
        sheet_format: Optional[str] = None
    ) -> List[int]:
        """Convert a sheet token (bracketed chord, letter, number, or note name) into MIDI pitches."""
        token = token.strip()
        if not token:
            return []

        # Remove outer brackets or parentheses if present
        if (token.startswith('[') and token.endswith(']')) or \
           (token.startswith('(') and token.endswith(')')) or \
           (token.startswith('{') and token.endswith('}')):
            inner = token[1:-1].strip()
        else:
            inner = token

        if not inner:
            return []

        if sheet_format is None:
            if is_sky_15:
                sheet_format = 'sky_15'
            elif is_sky_steam:
                sheet_format = 'sky_steam'
            elif is_sky:
                sheet_format = 'sky_qwert'
            else:
                sheet_format = 'genshin'

        pitches: List[int] = []

        # 1. Sky 1-15 numeric notation: numbers 1 to 15 (e.g. 1, 8, 10, 15, or chords like "1 3 5", "8 10 12")
        if sheet_format == 'sky_15' or is_sky_15:
            num_tokens = re.findall(r'\b(1[0-5]|[1-9])\b', inner)
            if num_tokens:
                for n_str in num_tokens:
                    val = int(n_str)
                    if val in SKY_15_INDEX_TO_NOTE:
                        pitches.append(SKY_15_INDEX_TO_NOTE[val])
                if pitches:
                    return pitches

        # 2. Sky ABC notation: A1-A5, B1-B5, C1-C5 (e.g. A1, A1A3A5, B1B3B5)
        sky_abc_matches = re.findall(r'[ABC][1-5]', inner, re.IGNORECASE)
        if sky_abc_matches and (len(''.join(sky_abc_matches)) >= len(inner.replace(' ', '')) * 0.7 or sheet_format == 'sky_abc'):
            for m in sky_abc_matches:
                k = m.upper()
                if k in SKY_ABC_TO_NOTE:
                    pitches.append(SKY_ABC_TO_NOTE[k])
            if pitches:
                return pitches

        # 3. Numbered notation (1 to 7) with octave modifiers (+1, -1, 1., .1, 1', ^1, 1_)
        num_map = {1: 60, 2: 62, 3: 64, 4: 65, 5: 67, 6: 69, 7: 71}
        has_numbered = re.search(r'[\+\-\'\.\^\_]?[1-7]', inner)
        if has_numbered and not re.search(r'[A-Za-z]', inner) and sheet_format != 'sky_15':
            for m in re.finditer(r'([\+\-\'\.\^\_]?)([1-7])([\+\-\'\.\^\_]*)', inner):
                prefix, digit_str, suffix = m.groups()
                digit = int(digit_str)
                base_p = num_map.get(digit, 60)
                if '+' in prefix or "'" in prefix or '^' in prefix or '+' in suffix or "'" in suffix or '^' in suffix:
                    base_p += 12
                elif '-' in prefix or '-' in suffix:
                    base_p -= 12
                elif ('.' in prefix or '.' in suffix) and not ('..' in prefix or '..' in suffix):
                    base_p -= 12
                pitches.append(base_p)
            if pitches:
                return pitches

        # 4. Explicit Piano note names WITH octave numbers (e.g. C4, D#5, Eb3, Do4, Re5)
        note_name_pattern = re.compile(r'([A-Ga-g]|do|re|mi|fa|sol|la|si|ti)([#b])?(\d)', re.IGNORECASE)
        matches = list(note_name_pattern.finditer(inner))
        if matches and len(''.join(m.group(0) for m in matches)) >= len(inner.replace(' ', '')) * 0.7:
            base_map = {
                'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11,
                'do': 0, 're': 2, 'mi': 4, 'fa': 5, 'sol': 7, 'la': 9, 'si': 11, 'ti': 11
            }
            for m in matches:
                name = m.group(1).lower()
                acc = m.group(2)
                octave = int(m.group(3))
                pitch_class = base_map.get(name, 0)
                if acc == '#':
                    pitch_class += 1
                elif acc == 'b':
                    pitch_class -= 1
                pitch = (octave + 1) * 12 + pitch_class
                if 21 <= pitch <= 108:
                    pitches.append(pitch)
            if pitches:
                return pitches

        # 5. Keyboard keys according to exact detected sheet format
        for ch in inner:
            up = ch.upper()
            if sheet_format == 'sky_steam':
                if up in SKY_KEY_TO_NOTE_STEAM:
                    pitches.append(SKY_KEY_TO_NOTE_STEAM[up])
                elif ch in (';', ',', '.'):
                    pitches.append(SKY_KEY_TO_NOTE_STEAM.get(ch, 60))
            elif sheet_format == 'sky_qwert':
                if up in SKY_KEY_TO_NOTE_QWERT:
                    pitches.append(SKY_KEY_TO_NOTE_QWERT[up])
            elif sheet_format == 'genshin':
                if up in GENSHIN_KEY_TO_NOTE:
                    pitches.append(GENSHIN_KEY_TO_NOTE[up])
            else:
                if is_sky_steam and (up in SKY_KEY_TO_NOTE_STEAM or ch in (';', ',', '.')):
                    pitches.append(SKY_KEY_TO_NOTE_STEAM.get(up if up in SKY_KEY_TO_NOTE_STEAM else ch, 60))
                elif is_sky and up in SKY_KEY_TO_NOTE_QWERT:
                    pitches.append(SKY_KEY_TO_NOTE_QWERT[up])
                elif up in GENSHIN_KEY_TO_NOTE:
                    pitches.append(GENSHIN_KEY_TO_NOTE[up])

        return pitches

    # Backwards compatibility alias
    _extract_pitches_from_token = _extract_sheet_pitches

    def _parse_plain_text_sheet(self, content: str, target_instrument: str = 'genshin'):
        """Parse human-written text sheets with beat step delays or explicit ms timings."""
        lines = content.splitlines()
        content_lower = content.lower()

        target_is_sky = target_instrument.startswith('sky')
        target_is_steam = (target_instrument == 'sky_steam')

        # Clean lines: remove comments, metadata declarations, and section markers before classification
        section_header_re = re.compile(
            r'^(?:\[|\()(?:verse|chorus|intro|outro|bridge|hook|pre-chorus|part|track|melody|chord|right hand|left hand|rh|lh|piano|lyre|guitar|interlude|section|break)[^\]\)]*(?:\]|\))$',
            re.IGNORECASE
        )

        body_lines = []
        for line in lines:
            l = line.strip()
            if not l or l.startswith(('//', '#', '--')):
                continue
            if not target_is_steam and l.startswith(';'):
                continue
            if re.match(r'^(?:bpm|tempo|speed|title|name|author|artist|instrument|octave|key|transposition|nhịp|tốc độ)\s*[:=]', l, re.IGNORECASE):
                continue
            if section_header_re.match(l):
                continue
            if not target_is_steam:
                l = re.split(r'//|#|;', l)[0].strip()
            else:
                l = re.split(r'//|#', l)[0].strip()
            if l:
                body_lines.append(l)

        music_body = ' '.join(body_lines)
        has_sky_keyword = (
            'sky' in self.filename.lower()
            or 'cotl' in self.filename.lower()
            or bool(re.search(r'instrument[\s:=]+sky', content_lower))
            or target_is_sky
        )
        has_genshin_keyword = (
            'genshin' in self.filename.lower()
            or bool(re.search(r'instrument[\s:=]+genshin', content_lower))
        )

        # Multi-pass sheet format classifier
        sky_abc_count = len(re.findall(r'\b[ABC][1-5]\b', music_body, re.IGNORECASE))
        has_sky_8_to_15 = bool(re.search(r'(?:\b|[\[\(])(?:[8-9]|1[0-5])(?:\b|[\]\)])', music_body))
        all_numbers = re.findall(r'\b\d+\b', music_body)
        is_only_numbers = len(all_numbers) >= 5 and not bool(re.search(r'[A-Za-z]', music_body))

        note_tokens = re.findall(r'\[[^\]]+\]|\([^\)]+\)|\b[A-Za-z]{1,2}\b', music_body)
        all_alpha = ''.join(c for tok in note_tokens for c in tok if c.isalpha()).upper()
        genshin_exclusive_chars = sum(1 for c in all_alpha if c in ('Y', 'U', 'H', 'J', 'N', 'M'))
        sky_qwert_keys = sum(1 for c in all_alpha if c in ('Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B'))
        steam_exclusive_chars = sum(1 for c in all_alpha if c in ('O', 'P', 'K', 'L'))
        has_steam_punct = bool(re.search(r'(?:\[[^\]]*[;,][^\]]*\])|(?:\b[;,]\b)', music_body))

        if sky_abc_count >= 3:
            sheet_format = 'sky_abc'
        elif has_sky_8_to_15 or (is_only_numbers and any(int(x) > 7 for x in all_numbers if x.isdigit())):
            sheet_format = 'sky_15'
        elif is_only_numbers and target_is_sky:
            sheet_format = 'sky_15'
        elif target_is_steam:
            sheet_format = 'sky_steam'
        elif target_is_sky:
            if steam_exclusive_chars >= 2 or has_steam_punct:
                sheet_format = 'sky_steam'
            else:
                sheet_format = 'sky_qwert'
        elif steam_exclusive_chars >= 2 or (steam_exclusive_chars >= 1 and has_steam_punct):
            sheet_format = 'sky_steam'
        elif has_sky_keyword and not has_genshin_keyword:
            sheet_format = 'sky_qwert'
        elif has_genshin_keyword:
            sheet_format = 'genshin'
        else:
            sheet_format = 'sky_steam' if target_is_steam else ('sky_qwert' if target_is_sky else 'genshin')

        is_sky = sheet_format.startswith('sky')
        is_sky_15 = (sheet_format == 'sky_15')
        is_sky_steam = (sheet_format == 'sky_steam')
        is_sky_abc = (sheet_format == 'sky_abc')

        # Precise beat duration: 1 beat (quarter note) = 60.0 / bpm
        beat_step = 60.0 / max(20.0, min(600.0, self.bpm))

        current_time = 0.0
        prev_line_had_notes = False

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            # Remove comments
            if line_str.startswith(('//', '#', '--')) or (sheet_format != 'sky_steam' and line_str.startswith(';')):
                bpm_m = re.search(r'(?:bpm|tempo|speed|nhịp|tốc độ)[\s:=]+(\d+(?:\.\d+)?)', line_str, re.IGNORECASE)
                if bpm_m:
                    try:
                        self.bpm = float(bpm_m.group(1))
                        beat_step = 60.0 / max(20.0, min(600.0, self.bpm))
                    except Exception:
                        pass
                continue

            # Skip standalone section headers like [Verse 1], [Chorus]
            if section_header_re.match(line_str):
                continue

            # Remove inline comments (protect ';' in Sky Steam)
            if sheet_format != 'sky_steam':
                line_str = re.split(r'//|#|;', line_str)[0].strip()
            else:
                line_str = re.split(r'//|#', line_str)[0].strip()
            if not line_str:
                continue

            # Skip metadata/header lines
            if re.match(r'^(?:bpm|tempo|speed|title|name|author|artist|instrument|octave|key|transposition|nhịp|tốc độ)\s*[:=]', line_str, re.IGNORECASE):
                bpm_m = re.search(r'(?:bpm|tempo|speed|nhịp|tốc độ)[\s:=]+(\d+(?:\.\d+)?)', line_str, re.IGNORECASE)
                if bpm_m:
                    try:
                        self.bpm = float(bpm_m.group(1))
                        beat_step = 60.0 / max(20.0, min(600.0, self.bpm))
                    except Exception:
                        pass
                continue

            # Skip lyrics/commentary lines with prevalent non-musical dictionary words (only for Genshin sheets)
            words = [w for w in re.split(r'\s+', line_str) if len(w) > 1 and not w.startswith(('[', '(', '{'))]
            if len(words) >= 3 and sheet_format == 'genshin':
                non_music_chars = sum(1 for c in line_str if c.upper() in ('O', 'P', 'K', 'L') or ord(c) > 127)
                if non_music_chars >= 4:
                    continue

            # Clean standalone measure bars '|' so they don't corrupt rhythm
            line_str = re.sub(r'(?<=\s)\|(?=\s)|(?:^\|\s*)|(?:\s*\|$)', ' ', line_str).strip()
            if not line_str:
                continue

            # Tokenize: chords in brackets or words/tokens
            pattern = re.compile(r'(\[[^\]]+\]|\([^\)]+\)|\{[^\}]+\}|[^\s\[\(\{\]\)\}]+)')
            tokens = pattern.findall(line_str)

            i = 0
            while i < len(tokens):
                tok = tokens[i].strip()
                i += 1
                if not tok:
                    continue

                # Check if next token is an explicit delay in ms or seconds
                delay_sec = None
                if i < len(tokens):
                    next_tok = tokens[i].strip()
                    ms_match = re.match(r'^(\d+(?:\.\d+)?)(ms|s)?$', next_tok, re.IGNORECASE)
                    if ms_match:
                        val = float(ms_match.group(1))
                        unit = (ms_match.group(2) or '').lower()
                        is_delay = False
                        if unit == 'ms':
                            delay_sec = val / 1000.0
                            is_delay = True
                        elif unit == 's':
                            delay_sec = val
                            is_delay = True
                        elif '.' in ms_match.group(1) and 0.05 <= val <= 10.0:
                            delay_sec = val
                            is_delay = True
                        elif val >= 20.0 and val <= 10000.0 and not (len(tokens) > 5 and all(t.isdigit() and int(t) <= 15 for t in tokens if t.isdigit())):
                            delay_sec = val / 1000.0
                            is_delay = True

                        if is_delay:
                            i += 1

                # Check inline delay like "Q:250", "Q/250", "Q(250)"
                if (':' in tok or '/' in tok) and not (tok.startswith('[') or tok.startswith('(')):
                    parts = re.split(r'[:/]', tok)
                    if len(parts) == 2:
                        val_str = parts[1].rstrip('ms').rstrip('s')
                        try:
                            val = float(val_str)
                            tok = parts[0]
                            delay_sec = val / 1000.0 if val >= 10.0 else val
                        except Exception:
                            pass

                # Check if token itself is an explicit standalone delay like "250ms"
                standalone_ms = re.match(r'^(\d+(?:\.\d+)?)ms$', tok, re.IGNORECASE)
                if standalone_ms:
                    current_time += float(standalone_ms.group(1)) / 1000.0
                    continue

                # Jianpu duration modifiers (underline for half/quarter note, dot for dotted note)
                step_mult = 1.0
                if not (tok.startswith('[') and tok.endswith(']')) and not (tok.startswith('(') and tok.endswith(')')):
                    if tok.endswith('__'):
                        step_mult = 0.25
                        tok = tok[:-2]
                    elif tok.endswith('_'):
                        step_mult = 0.5
                        tok = tok[:-1]
                    elif tok.endswith('.') and not tok.endswith('..') and len(tok) > 1 and tok[:-1].isdigit():
                        step_mult = 1.5
                        tok = tok[:-1]

                effective_step = (delay_sec if delay_sec is not None else beat_step) * step_mult

                # Rests / Sustains: '-', '_', '~', '.'
                if re.fullmatch(r'[-_~.]+', tok):
                    if sheet_format == 'sky_steam' and tok == '.':
                        pass  # In Sky Steam, '.' is Note 15 (C6)
                    else:
                        current_time += len(tok) * effective_step
                        continue

                # Measure / Section separators like "|" or "/"
                if tok in ('|', '/', '//', '||'):
                    continue

                # Skip inline section markers like [Chorus] or [Verse]
                if section_header_re.match(tok):
                    continue

                # Jianpu (numbered notation) 0 represents a 1-beat rest!
                if tok == '0':
                    current_time += effective_step
                    continue

                # Check if token has trailing dashes/rests like "Q---" or "[QET]--"
                extra_rest = 0.0
                trailing_dash_m = (
                    re.search(r'([-_~]+)$', tok) if sheet_format == 'sky_steam'
                    else re.search(r'([-_~.]+)$', tok)
                )
                if trailing_dash_m and not (tok.startswith('[') and tok.endswith(']')) and not (tok.startswith('(') and tok.endswith(')')):
                    dash_str = trailing_dash_m.group(1)
                    extra_rest = len(dash_str) * beat_step
                    tok = tok[:-len(dash_str)]
                    if not tok:
                        current_time += extra_rest
                        continue

                # Hyphen-connected sequential notes like Q-W-E, A1-A2-A3, 1-2-3, 8-10-12
                if '-' in tok and not (tok.startswith('[') and tok.endswith(']')) and not (tok.startswith('(') and tok.endswith(')')):
                    sub_parts = [p.strip() for p in tok.split('-') if p.strip()]
                    if len(sub_parts) > 1:
                        sub_pitches = [self._extract_sheet_pitches(p, sheet_format=sheet_format) for p in sub_parts]
                        if all(sp for sp in sub_pitches):
                            sub_step = effective_step / len(sub_parts)
                            for idx, sp in enumerate(sub_pitches):
                                for p in sp:
                                    self.raw_notes.append(RawMidiNote(
                                        start_time=current_time + idx * sub_step,
                                        duration=0.15,
                                        pitch=p,
                                        velocity=90,
                                        channel=0,
                                        track_index=0
                                    ))
                            current_time += effective_step + extra_rest
                            prev_line_had_notes = True
                            continue

                # If token is a chord in brackets like [D Z], [QET], or (1 3 5)
                if (tok.startswith('[') and tok.endswith(']')) or \
                   (tok.startswith('(') and tok.endswith(')')) or \
                   (tok.startswith('{') and tok.endswith('}')):
                    pitches = self._extract_sheet_pitches(tok, sheet_format=sheet_format)
                    for p in pitches:
                        self.raw_notes.append(RawMidiNote(
                            start_time=current_time,
                            duration=0.15,
                            pitch=p,
                            velocity=90,
                            channel=0,
                            track_index=0
                        ))
                    if pitches:
                        current_time += effective_step + extra_rest
                        prev_line_had_notes = True

                # If Sky ABC chord without brackets like "A1A3A5" or "B1B3B5"
                elif is_sky_abc and re.findall(r'[ABC][1-5]', tok, re.IGNORECASE):
                    pitches = self._extract_sheet_pitches(tok, sheet_format='sky_abc')
                    for p in pitches:
                        self.raw_notes.append(RawMidiNote(
                            start_time=current_time,
                            duration=0.15,
                            pitch=p,
                            velocity=90,
                            channel=0,
                            track_index=0
                        ))
                    if pitches:
                        current_time += effective_step + extra_rest
                        prev_line_had_notes = True

                # Sequential notes without spaces like "QW" or "QWERT"
                elif (
                    len(tok) > 1
                    and delay_sec is None
                    and not is_sky_abc
                    and not is_sky_15
                    and all(
                        (c.upper() in SKY_KEY_TO_NOTE_STEAM if sheet_format == 'sky_steam'
                         else c.upper() in SKY_KEY_TO_NOTE_QWERT if sheet_format == 'sky_qwert'
                         else c.upper() in GENSHIN_KEY_TO_NOTE)
                        for c in tok
                    )
                ):
                    sub_step = effective_step / len(tok)
                    for ch in tok:
                        pitches = self._extract_sheet_pitches(ch, sheet_format=sheet_format)
                        for p in pitches:
                            self.raw_notes.append(RawMidiNote(
                                start_time=current_time,
                                duration=0.15,
                                pitch=p,
                                velocity=90,
                                channel=0,
                                track_index=0
                            ))
                        current_time += sub_step
                    current_time += extra_rest
                    prev_line_had_notes = True
                else:
                    pitches = self._extract_sheet_pitches(tok, sheet_format=sheet_format)
                    for p in pitches:
                        self.raw_notes.append(RawMidiNote(
                            start_time=current_time,
                            duration=0.15,
                            pitch=p,
                            velocity=90,
                            channel=0,
                            track_index=0
                        ))
                    if pitches:
                        current_time += effective_step + extra_rest
                        prev_line_had_notes = True

        # Keep duration tracking current_time so final trailing sustains/rests are fully accounted for
        if self.raw_notes:
            max_note_end = max(n.start_time + n.duration for n in self.raw_notes)
            self.duration_seconds = max(current_time, max_note_end)

    def _load_text_file(self, filepath: str, target_instrument: str = 'genshin'):
        """Parse human-readable or structured TXT sheet music into RawMidiNotes."""
        content = ""
        for enc in ('utf-8', 'utf-8-sig', 'utf-16', 'utf-16-le', 'utf-16-be', 'gb18030', 'gbk', 'shift-jis', 'cp1252', 'cp1258', 'latin-1'):
            try:
                with open(filepath, 'r', encoding=enc) as f:
                    content = f.read()
                break
            except Exception:
                continue

        if not content:
            return

        # Strip markdown fences if present
        content = re.sub(r'^```(?:json|txt|midi)?\s*', '', content.strip(), flags=re.MULTILINE)
        content = re.sub(r'```\s*$', '', content.strip(), flags=re.MULTILINE)

        # Normalize full-width Asian punctuation and characters
        charmap = {
            '【': '[', '】': ']', '〔': '[', '〕': ']', '［': '[', '］': ']',
            '（': '(', '）': ')', '｛': '{', '｝': '}',
            '～': '~', '—': '-', '–': '-', '一': '-', '―': '-',
            '。': '.', '…': '...', '　': ' ', '│': '|', '丨': '|', '¦': '|'
        }
        for k, v in charmap.items():
            content = content.replace(k, v)

        self.bpm = 120.0

        # Check if content contains BPM/Tempo declaration
        bpm_match = re.search(r'(?:bpm|tempo|speed|nhịp|tốc độ)[\s:=]+(\d+(?:\.\d+)?)', content, re.IGNORECASE)
        if bpm_match:
            try:
                val = float(bpm_match.group(1))
                if 20 <= val <= 600:
                    self.bpm = val
            except Exception:
                pass

        # Try JSON parsing first with robust sanitizer (Sky Studio / Specy / Note Array)
        parsed_as_json = False
        trimmed = content.strip()
        
        # Clean potential JSON string
        def sanitize_json(raw: str) -> str:
            clean = raw.lstrip('\ufeff').strip()
            clean = re.sub(r'^```(?:json|txt)?\s*', '', clean, flags=re.MULTILINE)
            clean = re.sub(r'```\s*$', '', clean, flags=re.MULTILINE).strip()
            clean = re.sub(r'//[^\n\r]*', '', clean)
            clean = re.sub(r'/\*.*?\*/', '', clean, flags=re.DOTALL)
            clean = re.sub(r',\s*([\]}])', r'\1', clean).strip()
            # Extract outermost JSON object/array
            first_idx = -1
            f_curly = clean.find('{')
            f_sq = clean.find('[')
            if f_curly != -1 and f_sq != -1:
                first_idx = min(f_curly, f_sq)
            elif f_curly != -1:
                first_idx = f_curly
            elif f_sq != -1:
                first_idx = f_sq

            last_idx = max(clean.rfind('}'), clean.rfind(']'))
            if first_idx != -1 and last_idx > first_idx:
                return clean[first_idx:last_idx + 1].strip()
            return clean

        sanitized_json = sanitize_json(trimmed)
        if (sanitized_json.startswith('[') and sanitized_json.endswith(']')) or (sanitized_json.startswith('{') and sanitized_json.endswith('}')):
            try:
                data = json.loads(sanitized_json)
                if isinstance(data, dict):
                    if 'bpm' in data:
                        self.bpm = float(data.get('bpm', 120))
                    notes_list = data.get('songNotes') or data.get('notes') or data.get('score') or []
                    if notes_list:
                        parsed_as_json = self._parse_json_notes(notes_list, data, target_instrument=target_instrument)
                    elif 'columns' in data:
                        parsed_as_json = self._parse_json_columns(data, target_instrument=target_instrument)
                elif isinstance(data, list):
                    if len(data) > 0 and isinstance(data[0], dict):
                        if 'songNotes' in data[0]:
                            self.bpm = float(data[0].get('bpm', 120))
                            parsed_as_json = self._parse_json_notes(data[0].get('songNotes', []), data[0], target_instrument=target_instrument)
                        elif 'columns' in data[0]:
                            self.bpm = float(data[0].get('bpm', 120))
                            parsed_as_json = self._parse_json_columns(data[0], target_instrument=target_instrument)
                        else:
                            parsed_as_json = self._parse_json_notes(data, {}, target_instrument=target_instrument)
                    else:
                        parsed_as_json = self._parse_json_notes(data, {}, target_instrument=target_instrument)
            except Exception:
                parsed_as_json = False

        if not parsed_as_json:
            self._parse_plain_text_sheet(content, target_instrument=target_instrument)

        if self.raw_notes:
            self.raw_notes.sort(key=lambda n: n.start_time)
            max_time = max(n.start_time + n.duration for n in self.raw_notes)
            self.duration_seconds = max_time
            self.tracks.append(TrackInfo(
                index=0,
                name="Sheet Text Melody",
                channel=0,
                note_count=len(self.raw_notes),
                enabled=True
            ))
            # TXT sheet music is already transcribed in target instrument keys, default transpose to 0
            self.recommended_transpose = 0
        else:
            self.duration_seconds = 0.0
            self.recommended_transpose = 0


    def get_playable_chords(
        self,
        transpose_semitones: int = 0,
        handle_accidentals: str = 'nearest',  # 'nearest', 'drop'
        enabled_tracks: Optional[Set[int]] = None,
        chord_tolerance_sec: float = 0.028,
        speed_factor: float = 1.0,
        instrument: str = 'genshin'
    ) -> List[PlaybackChord]:
        """
        Process raw notes into sorted, time-aligned chords of playable keys.
        Supports:
        - 'genshin': 21 keys (C3 to B5, range 48 to 83)
        - 'sky' / 'sky_qwert': 15 keys (C4 to C6, range 60 to 84, QWERT/ASDFG/ZXCVB)
        - 'sky_steam': 15 keys (C4 to C6, range 60 to 84, YUIOP/HJKL;/BNM,.)
        """
        if not self.raw_notes:
            return []

        if instrument == 'sky_steam':
            note_map = SKY_NOTE_TO_KEY_STEAM
            min_pitch, max_pitch = 60, 84
        elif instrument in ('sky', 'sky_qwert'):
            note_map = SKY_NOTE_TO_KEY_QWERT
            min_pitch, max_pitch = 60, 84
        else:
            note_map = GENSHIN_NOTE_TO_KEY
            min_pitch, max_pitch = 48, 83

        # Check if all notes in raw_notes are channel 9 (percussion channel fallback)
        all_channel_9 = all(rn.channel == 9 for rn in self.raw_notes)

        # Failsafe: if enabled_tracks filters out everything, fallback to None so imported files always play!
        if enabled_tracks is not None:
            has_matching = any(rn.track_index in enabled_tracks for rn in self.raw_notes if (rn.channel != 9 or all_channel_9))
            if not has_matching:
                enabled_tracks = None

        speed_factor = max(0.1, min(4.0, speed_factor))
        notes_to_play: List[PlaybackNote] = []

        for rn in self.raw_notes:
            # Check track/channel filter
            if rn.channel == 9 and not all_channel_9:  # Mute drums unless file only has channel 9
                continue
                
            if enabled_tracks is not None and rn.track_index not in enabled_tracks:
                continue

            transposed_pitch = rn.pitch + transpose_semitones
            pitch_class = transposed_pitch % 12

            # Handle accidentals (sharps/flats not in C Major)
            if pitch_class not in NATURAL_PITCH_CLASSES:
                if handle_accidentals == 'drop':
                    continue
                else:
                    # Round to nearest natural pitch class
                    target_class = NEAREST_NATURAL_CLASS.get(pitch_class, pitch_class)
                    diff = target_class - pitch_class
                    transposed_pitch += diff
                    pitch_class = target_class

            # Fold octave into the instrument's natural playable range
            while transposed_pitch < min_pitch:
                transposed_pitch += 12
            while transposed_pitch > max_pitch:
                transposed_pitch -= 12

            # Map to target instrument key
            key = note_map.get(transposed_pitch)
            if key:
                notes_to_play.append(PlaybackNote(
                    timestamp=rn.start_time / speed_factor,
                    key=key,
                    original_pitch=rn.pitch,
                    transposed_pitch=transposed_pitch,
                    track_index=rn.track_index
                ))

        # Sort by timestamp
        notes_to_play.sort(key=lambda x: x.timestamp)

        # Build chord retaining simultaneous keys from the MIDI
        # Sky Cotl is capped to max 3 keys (1 root bass + 2 lead melody) to prevent muddy sound and key drops on specy.app
        # Genshin Lyre is capped to max 6 keys (spread across 3 octaves)
        max_keys = 3 if instrument.startswith('sky') else 6

        def build_chord(ts: float, keys_set: Set[str], notes_list: List[PlaybackNote]) -> PlaybackChord:
            # Sort keys by pitch from lowest bass to highest treble
            sorted_notes = sorted(notes_list, key=lambda n: n.transposed_pitch)
            ordered_keys = list(dict.fromkeys(n.key for n in sorted_notes if n.key in keys_set))
            if len(ordered_keys) > max_keys:
                if instrument.startswith('sky'):
                    ordered_keys = ordered_keys[:1] + ordered_keys[-2:]
                else:
                    ordered_keys = ordered_keys[:2] + ordered_keys[-4:]
            return PlaybackChord(timestamp=ts, keys=ordered_keys, notes=notes_list)

        # Group notes that occur at practically the same moment into chords
        chords: List[PlaybackChord] = []
        if not notes_to_play:
            return chords

        current_chord_time = notes_to_play[0].timestamp
        current_keys: Set[str] = set()
        current_notes: List[PlaybackNote] = []

        for p_note in notes_to_play:
            if abs(p_note.timestamp - current_chord_time) <= chord_tolerance_sec:
                # Same chord
                if p_note.key not in current_keys:
                    current_keys.add(p_note.key)
                    current_notes.append(p_note)
            else:
                # Save previous chord
                if current_keys:
                    chords.append(build_chord(current_chord_time, current_keys, current_notes))
                # Start new chord
                current_chord_time = p_note.timestamp
                current_keys = {p_note.key}
                current_notes = [p_note]

        # Flush final chord
        if current_keys:
            chords.append(build_chord(current_chord_time, current_keys, current_notes))

        return chords
