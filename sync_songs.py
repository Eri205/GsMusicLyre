"""
sync_songs.py
Universal Song Library Synchronizer for GsMusicLyre.
Processes all songs in imported_songs/ using MidiEngine,
applies calibrated tempo and anti-drop chord generation,
and synchronizes web/data/builtin_songs.json, web/js/builtin_songs.js,
and android/app/src/main/assets/songs/builtin_songs.json.
"""

import os
import json
import unicodedata
from core.midi_engine import MidiEngine

def sanitize_title(fname):
    name = fname
    for ext in ['.mid.mid', '.midi', '.mid', '.txt', '.json', '.skysheet']:
        if name.lower().endswith(ext):
            name = name[:-len(ext)]
            break
    name = unicodedata.normalize('NFC', name).strip()
    return name

metadata = {
    '7 Years - Lukas Graham - Pianoitall.mid.mid': {
        'title': '7 Years - Lukas Graham',
        'artist_or_game': 'Lukas Graham',
        'category': 'Pop / Meme',
        'speed_calibrate': 1.05, # Calibrate 120 -> 126 BPM for crisp acoustic response
    },
    'Call_of_Silence.mid': {
        'title': 'Call of Silence',
        'artist_or_game': 'Hiroyuki Sawano (Attack on Titan)',
        'category': 'Anime & OST',
        'speed_calibrate': 1.0,
    },
    'call of silence(简化)适合钢琴瀑布流.mid': {
        'title': 'Call of Silence (Giản hóa)',
        'artist_or_game': 'Hiroyuki Sawano',
        'category': 'Anime & OST',
        'speed_calibrate': 1.0,
    },
    'JVKE - golden hour.mid': {
        'title': 'JVKE - Golden Hour',
        'artist_or_game': 'JVKE',
        'category': 'Pop / Meme',
        'speed_calibrate': 1.0,
    },
    'Merry Christmas Mr. Lawrence.mid': {
        'title': 'Merry Christmas Mr. Lawrence',
        'artist_or_game': 'Ryuichi Sakamoto',
        'category': 'Classical',
        'speed_calibrate': 1.0,
    },
    'Nơi này có anh.mid': {
        'title': 'Nơi này có anh',
        'artist_or_game': 'Sơn Tùng M-TP',
        'category': 'Pop / Meme',
        'speed_calibrate': 1.0,
    },
    'QUOC CA VIET NAM (Vietnam\'s National Anthem).mid': {
        'title': 'Tiến Quân Ca (Quốc Ca Việt Nam)',
        'artist_or_game': 'Văn Cao',
        'category': 'Classical',
        'speed_calibrate': 1.0,
    },
    'River Flows in You - Yiruma [MIDICollection.net] (1).mid.mid': {
        'title': 'River Flows in You - Yiruma',
        'artist_or_game': 'Yiruma',
        'category': 'Classical',
        'speed_calibrate': 1.20, # Calibrate 60 -> 72 BPM (natural flowing pace, no lag)
    },
    'Silvermoon Hall 銀月の庭.mid': {
        'title': 'Silvermoon Hall (銀月の庭)',
        'artist_or_game': 'Genshin Impact / HoYo-MiX',
        'category': 'Genshin Impact',
        'speed_calibrate': 1.0,
    },
    'Thiên lý ơi.mid': {
        'title': 'Thiên lý ơi',
        'artist_or_game': 'J97',
        'category': 'Pop / Meme',
        'speed_calibrate': 1.0,
    }
}

def sync():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    imported_dir = os.path.join(base_dir, 'imported_songs')
    
    song_list = []
    for fname in sorted(os.listdir(imported_dir)):
        fpath = os.path.join(imported_dir, fname)
        if not os.path.isfile(fpath):
            continue
        
        meta = metadata.get(fname, {
            'title': sanitize_title(fname),
            'artist_or_game': 'Custom',
            'category': 'Custom',
            'speed_calibrate': 1.0
        })
        
        eng = MidiEngine(fpath, target_instrument='genshin')
        speed = meta.get('speed_calibrate', 1.0)
        chords = eng.get_playable_chords(
            transpose_semitones=eng.recommended_transpose,
            speed_factor=speed,
            chord_tolerance_sec=0.016
        )
        
        dur = round((eng.duration_seconds / speed) * 10) / 10
        bpm = round(eng.bpm * speed, 1)
        
        chords_data = [[round(c.timestamp, 3), c.keys] for c in chords]
        events_data = [{'time': round(c.timestamp, 3), 'notes': c.keys} for c in chords]
        
        song_obj = {
            'id': sanitize_title(fname),
            'title': meta['title'],
            'artist_or_game': meta['artist_or_game'],
            'category': meta['category'],
            'bpm': bpm,
            'duration_seconds': dur,
            'duration': dur,
            'note_count': sum(len(c.keys) for c in chords),
            'recommended_transpose': eng.recommended_transpose,
            'chords': chords_data,
            'events': events_data
        }
        song_list.append(song_obj)
        print(f"Processed: {meta['title']:35s} | BPM: {bpm:5.1f} | Dur: {dur:5.1f}s | Chords: {len(chords):4d} | Keys: {song_obj['note_count']:4d}")

    # Write web/data/builtin_songs.json
    web_data = os.path.join(base_dir, 'web', 'data')
    os.makedirs(web_data, exist_ok=True)
    with open(os.path.join(web_data, 'builtin_songs.json'), 'w', encoding='utf-8') as f:
        json.dump(song_list, f, ensure_ascii=False, indent=2)

    # Write web/js/builtin_songs.js
    web_js = os.path.join(base_dir, 'web', 'js')
    os.makedirs(web_js, exist_ok=True)
    with open(os.path.join(web_js, 'builtin_songs.js'), 'w', encoding='utf-8') as f:
        f.write('// Auto-generated synchronized song library for GsMusicLyre\n')
        f.write('window.BUILTIN_SONGS = ')
        json.dump(song_list, f, ensure_ascii=False)
        f.write(';\n')

    # Write android/app/src/main/assets/songs/builtin_songs.json
    android_assets = os.path.join(base_dir, 'android', 'app', 'src', 'main', 'assets', 'songs')
    os.makedirs(android_assets, exist_ok=True)
    with open(os.path.join(android_assets, 'builtin_songs.json'), 'w', encoding='utf-8') as f:
        json.dump(song_list, f, ensure_ascii=False, indent=2)

    print("\n[SUCCESS] Successfully synchronized all 10 songs into Web and Android assets!")

if __name__ == '__main__':
    sync()
