"""
core/library_manager.py
Manages song library, metadata indexing, search filtering, favorites persistence,
and custom MIDI file imports for Dodo Music.
"""

import os
import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Set
import mido

@dataclass
class SongItem:
    id: str
    title: str
    artist_or_game: str
    category: str       # 'Genshin Impact', 'Anime & OST', 'Classical', 'Pop / Meme', 'Custom'
    filepath: str
    duration_seconds: float
    bpm: float
    note_count: int
    is_favorite: bool = False
    is_custom: bool = False
    can_delete: bool = True

def get_app_dir():
    import sys
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_bundle_dir():
    import sys
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS
    return get_app_dir()

APP_DIR = get_app_dir()
BUNDLE_DIR = get_bundle_dir()

DEFAULT_DATA_DIR = os.path.join(APP_DIR, "data")
DEFAULT_SONGS_DIR = os.path.join(APP_DIR, "songs")
DEFAULT_IMPORTED_DIR = os.path.join(APP_DIR, "imported_songs")
FAVORITES_FILE = os.path.join(DEFAULT_DATA_DIR, "favorites.json")
LIBRARY_CACHE_FILE = os.path.join(DEFAULT_DATA_DIR, "library_cache.json")

class LibraryManager:
    def __init__(self, songs_dir: str = DEFAULT_SONGS_DIR, imported_dir: str = DEFAULT_IMPORTED_DIR):
        self.songs_dir = songs_dir
        self.imported_dir = imported_dir
        self.songs: List[SongItem] = []
        self.favorites: Set[str] = set()
        self._metadata_cache: Dict[str, dict] = {}
        
        os.makedirs(DEFAULT_DATA_DIR, exist_ok=True)
        os.makedirs(self.songs_dir, exist_ok=True)
        os.makedirs(self.imported_dir, exist_ok=True)

        self._load_cache()

        # Copy bundled songs ONLY on first initialization (if data/.initialized does not exist)
        # This guarantees that if user deletes any built-in song, it will NEVER be restored automatically!
        init_marker = os.path.join(DEFAULT_DATA_DIR, ".initialized")
        bundled_songs = os.path.join(BUNDLE_DIR, "songs")
        if not os.path.exists(init_marker):
            if os.path.exists(bundled_songs) and bundled_songs != self.songs_dir:
                import shutil
                for f in os.listdir(bundled_songs):
                    if f.lower().endswith(('.mid', '.midi', '.txt', '.json', '.skysheet')):
                        src = os.path.join(bundled_songs, f)
                        dst = os.path.join(self.songs_dir, f)
                        if not os.path.exists(dst):
                            try:
                                shutil.copyfile(src, dst)
                            except Exception:
                                pass
            try:
                with open(init_marker, 'w', encoding='utf-8') as f:
                    f.write("ready")
            except Exception:
                pass

        # Migrate any custom songs from songs_dir to imported_dir
        self._migrate_custom_songs()
        self.load_favorites()
        self.refresh_library()

    def _migrate_custom_songs(self):
        """Move non-sample MIDI and TXT files from songs/ to imported_songs/."""
        import shutil
        known_prefixes = ("genshin_", "anime_", "classic_", "meme_", "canon_", "mondstadt_", "venti_")
        if os.path.exists(self.songs_dir):
            for fname in os.listdir(self.songs_dir):
                if fname.lower().endswith(('.mid', '.midi', '.txt', '.json', '.skysheet')):
                    if not any(fname.lower().startswith(p) for p in known_prefixes):
                        src = os.path.join(self.songs_dir, fname)
                        dst = os.path.join(self.imported_dir, fname)
                        try:
                            shutil.move(src, dst)
                        except Exception:
                            pass

    def _load_cache(self):
        if os.path.exists(LIBRARY_CACHE_FILE):
            try:
                with open(LIBRARY_CACHE_FILE, 'r', encoding='utf-8') as f:
                    self._metadata_cache = json.load(f)
            except Exception:
                self._metadata_cache = {}

    def _save_cache(self):
        try:
            with open(LIBRARY_CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(self._metadata_cache, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

    def load_favorites(self):
        if os.path.exists(FAVORITES_FILE):
            try:
                with open(FAVORITES_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.favorites = set(data.get("favorites", []))
            except Exception:
                self.favorites = set()

    def save_favorites(self):
        try:
            with open(FAVORITES_FILE, 'w', encoding='utf-8') as f:
                json.dump({"favorites": list(self.favorites)}, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving favorites: {e}")

    def toggle_favorite(self, song_id: str) -> bool:
        if song_id in self.favorites:
            self.favorites.remove(song_id)
            is_fav = False
        else:
            self.favorites.add(song_id)
            is_fav = True
            
        for s in self.songs:
            if s.id == song_id:
                s.is_favorite = is_fav
                break
                
        self.save_favorites()
        return is_fav

    def refresh_library(self):
        """Scan both built-in songs and imported songs directories and index metadata."""
        self.songs.clear()

        # 1. Built-in songs
        if os.path.exists(self.songs_dir):
            for fname in os.listdir(self.songs_dir):
                if fname.lower().endswith(('.mid', '.midi', '.txt', '.json', '.skysheet')):
                    fpath = os.path.join(self.songs_dir, fname)
                    item = self._extract_song_info(fname, fpath, is_custom=False)
                    if item:
                        self.songs.append(item)

        # 2. Custom imported songs
        if os.path.exists(self.imported_dir):
            for fname in os.listdir(self.imported_dir):
                if fname.lower().endswith(('.mid', '.midi', '.txt', '.json', '.skysheet')):
                    fpath = os.path.join(self.imported_dir, fname)
                    item = self._extract_song_info(fname, fpath, is_custom=True)
                    if item:
                        self.songs.append(item)

        # Sort: Custom/Imported first, then Genshin songs, then by title
        self.songs.sort(key=lambda s: (not s.is_custom, s.category != 'Genshin Impact', s.title))
        self._save_cache()

    def delete_song(self, song_id: str) -> bool:
        """Permanently delete a song file and remove from library."""
        target = None
        for s in self.songs:
            if s.id == song_id:
                target = s
                break
        if not target:
            return False

        try:
            if os.path.exists(target.filepath):
                os.remove(target.filepath)
            if target.filepath in self._metadata_cache:
                del self._metadata_cache[target.filepath]
            if song_id in self.favorites:
                self.favorites.remove(song_id)
                self.save_favorites()
            self.refresh_library()
            return True
        except Exception as e:
            print(f"Error deleting song: {e}")
            return False

    def open_imported_folder(self) -> bool:
        """Open the imported_songs directory in Windows File Explorer."""
        try:
            os.makedirs(self.imported_dir, exist_ok=True)
            os.startfile(self.imported_dir)
            return True
        except Exception as e:
            print(f"Error opening imported folder: {e}")
            return False

    def _extract_song_info(self, filename: str, filepath: str, is_custom: bool = False) -> Optional[SongItem]:
        import unicodedata, re
        song_id = unicodedata.normalize('NFC', os.path.splitext(filename)[0]).strip()
        
        # Categorize by prefix or directory
        category = "Custom" if is_custom else "Classic"
        clean_title = unicodedata.normalize('NFC', song_id.replace("_", " "))
        for ext in ('.mid', '.midi', '.txt', '.json', '.skysheet'):
            if clean_title.lower().endswith(ext):
                clean_title = clean_title[:-len(ext)].strip()
        clean_title = re.sub(r'\[.*?\]|\(.*?\.(?:com|net|org)\)', '', clean_title).strip()
        artist = "Imported / Custom" if is_custom else "Various"

        # Known song metadata matching
        KNOWN_SONGS = {
            '7 years': ('7 Years - Lukas Graham', 'Lukas Graham', 'Pop / Meme'),
            'river flows in you': ('River Flows in You - Yiruma', 'Yiruma', 'Classical'),
            'call of silence(简化)': ('Call of Silence (Giản hóa)', 'Hiroyuki Sawano', 'Anime & OST'),
            'call of silence': ('Call of Silence', 'Hiroyuki Sawano (Attack on Titan)', 'Anime & OST'),
            'golden hour': ('JVKE - Golden Hour', 'JVKE', 'Pop / Meme'),
            'merry christmas mr. lawrence': ('Merry Christmas Mr. Lawrence', 'Ryuichi Sakamoto', 'Classical'),
            'nơi này có anh': ('Nơi này có anh', 'Sơn Tùng M-TP', 'Pop / Meme'),
            'quoc ca viet nam': ('Tiến Quân Ca (Quốc Ca Việt Nam)', 'Văn Cao', 'Classical'),
            'silvermoon hall': ('Silvermoon Hall (銀月の庭)', 'Genshin Impact / HoYo-MiX', 'Genshin Impact'),
            'thiên lý ơi': ('Thiên lý ơi', 'J97', 'Pop / Meme')
        }

        low_name = filename.lower()
        for k, (t_title, t_art, t_cat) in KNOWN_SONGS.items():
            if k in low_name:
                clean_title = t_title
                artist = t_art
                category = t_cat
                break

        if not is_custom:
            clean_name = filename.replace(".midi", "").replace(".mid", "").replace(".txt", "").replace(".json", "").replace(".skysheet", "")
            if filename.startswith("Genshin_"):
                category = "Genshin Impact"
                clean_title = clean_name.replace("Genshin_", "").replace("_", " ")
                artist = "miHoYo / Yu-Peng Chen"
            elif filename.startswith("Anime_"):
                category = "Anime & OST"
                clean_title = clean_name.replace("Anime_", "").replace("_", " ")
                artist = "Anime OST"
            elif filename.startswith("Classic_"):
                category = "Classical"
                clean_title = clean_name.replace("Classic_", "").replace("_", " ")
                artist = "Classical Masterpiece"
            elif filename.startswith("Meme_"):
                category = "Pop / Meme"
                clean_title = clean_name.replace("Meme_", "").replace("_", " ")
                artist = "Vicetone & Tony Igy"

        # Check metadata cache for instant sub-millisecond file loading
        try:
            mtime = os.path.getmtime(filepath)
            size = os.path.getsize(filepath)
            cached = self._metadata_cache.get(filepath)
            if cached and cached.get('mtime') == mtime and cached.get('size') == size:
                c_item = cached.get('item', {})
                return SongItem(
                    id=c_item.get('id', song_id),
                    title=c_item.get('title', clean_title),
                    artist_or_game=c_item.get('artist_or_game', artist),
                    category=c_item.get('category', category),
                    filepath=filepath,
                    duration_seconds=float(c_item.get('duration_seconds', 30.0)),
                    bpm=float(c_item.get('bpm', 120.0)),
                    note_count=int(c_item.get('note_count', 0)),
                    is_favorite=(song_id in self.favorites),
                    is_custom=is_custom,
                    can_delete=True
                )
        except Exception:
            mtime, size = 0.0, 0

        # Parse duration, bpm, and note count with MidiEngine
        duration = 30.0
        bpm = 120.0
        note_count = 0
        try:
            from core.midi_engine import MidiEngine
            eng = MidiEngine(filepath)
            duration = eng.duration_seconds or 30.0
            bpm = eng.bpm or 120.0
            note_count = len(eng.raw_notes)
        except Exception:
            try:
                try:
                    mid = mido.MidiFile(filepath, clip=True)
                except Exception:
                    mid = mido.MidiFile(filepath)
                duration = mid.length
                for track in mid.tracks:
                    for msg in track:
                        if msg.type == 'set_tempo':
                            bpm = round(mido.tempo2bpm(msg.tempo), 1)
                        elif msg.type == 'note_on' and msg.velocity > 0:
                            note_count += 1
            except Exception:
                duration = 30.0
                bpm = 120.0
                note_count = 50

        item = SongItem(
            id=song_id,
            title=clean_title,
            artist_or_game=artist,
            category=category,
            filepath=filepath,
            duration_seconds=duration,
            bpm=bpm,
            note_count=note_count,
            is_favorite=(song_id in self.favorites),
            is_custom=is_custom,
            can_delete=True
        )

        try:
            self._metadata_cache[filepath] = {
                'mtime': mtime,
                'size': size,
                'item': {
                    'id': item.id,
                    'title': item.title,
                    'artist_or_game': item.artist_or_game,
                    'category': item.category,
                    'duration_seconds': item.duration_seconds,
                    'bpm': item.bpm,
                    'note_count': item.note_count
                }
            }
        except Exception:
            pass

        return item

    def search_songs(self, query: str = "", category: str = "All") -> List[SongItem]:
        """Filter songs by text query and category."""
        results = []
        q = query.strip().lower()

        for s in self.songs:
            if category == "Favorites ❤️" and not s.is_favorite:
                continue
            elif category not in ("All", "Favorites ❤️") and s.category != category:
                continue

            if q:
                match = (
                    q in s.title.lower() or 
                    q in s.artist_or_game.lower() or 
                    q in s.category.lower()
                )
                if not match:
                    continue

            results.append(s)

        return results
