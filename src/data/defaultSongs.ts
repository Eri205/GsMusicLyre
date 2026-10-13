import { Song } from '../types';

export const INITIAL_SONGS: Song[] = [
  {
    id: 'silvermoon_hall',
    title: 'Silvermoon Hall (Windblume Ballad)',
    artist_or_game: 'Genshin Impact',
    category: 'Genshin Impact',
    bpm: 82,
    duration_seconds: 142,
    note_count: 512,
    recommended_transpose: 0,
    difficulty: 'Intermediate',
    accuracy: 88,
    is_favorite: true,
    chords: [
      [0.0, ['Q']], [0.5, ['E']], [1.0, ['T', 'A']], [1.5, ['E']],
      [2.0, ['Q', 'Z']], [2.5, ['J']], [3.0, ['H', 'D']], [3.5, ['G']],
      [4.0, ['A', 'C']], [4.5, ['S']], [5.0, ['D', 'V']], [5.5, ['G']],
      [6.0, ['H', 'B']], [6.5, ['J']], [7.0, ['Q', 'N']], [7.5, ['W']],
      [8.0, ['E', 'M']], [8.5, ['R']], [9.0, ['T', 'Q']], [9.5, ['Y']],
      [10.0, ['U', 'E']], [10.5, ['T']], [11.0, ['Q', 'A', 'Z']], [11.5, ['W']],
      [12.0, ['E', 'S', 'X']], [13.0, ['T', 'D', 'C']], [14.0, ['Y', 'F', 'V']]
    ]
  },
  {
    id: 'call_of_silence',
    title: 'Call of Silence (Attack on Titan)',
    artist_or_game: 'Anime & OST',
    category: 'Anime & OST',
    bpm: 65,
    duration_seconds: 166,
    note_count: 866,
    recommended_transpose: 0,
    difficulty: 'Expert',
    accuracy: 94,
    is_favorite: true,
    chords: [
      [0.968, ['N']], [1.452, ['A']], [1.935, ['V', 'N', 'A', 'D']],
      [2.903, ['Q', 'W', 'T']], [3.871, ['B', 'M', 'J']], [4.839, ['M']],
      [5.323, ['A']], [5.806, ['C', 'B', 'N', 'S']], [6.774, ['A', 'G', 'W', 'T']],
      [7.742, ['H', 'Y']], [8.71, ['B', 'N']], [9.194, ['A']],
      [9.677, ['Z', 'V', 'N', 'S']], [10.645, ['G', 'W']], [11.613, ['B', 'M']]
    ]
  },
  {
    id: 'golden_hour',
    title: 'JVKE - Golden Hour',
    artist_or_game: 'Pop / Meme',
    category: 'Pop / Meme',
    bpm: 94,
    duration_seconds: 206,
    note_count: 2609,
    recommended_transpose: -4,
    difficulty: 'Master',
    accuracy: 76,
    is_favorite: false,
    chords: [
      [0.0, ['F', 'W']], [0.16, ['H', 'E']], [0.319, ['Q', 'T']],
      [0.479, ['H', 'Y']], [0.638, ['Q', 'T']], [0.798, ['H', 'E']],
      [0.957, ['F', 'W']], [1.117, ['H', 'E']], [1.277, ['Q', 'T']],
      [1.436, ['H', 'Y']], [1.596, ['Q', 'T']], [1.755, ['H', 'E']]
    ]
  },
  {
    id: 'dawn_winery',
    title: 'Dawn Winery Theme (C Major Native)',
    artist_or_game: 'Genshin Impact',
    category: 'Genshin Impact',
    bpm: 90,
    duration_seconds: 118,
    note_count: 420,
    recommended_transpose: 0,
    difficulty: 'Beginner',
    accuracy: 99,
    is_favorite: true,
    chords: [
      [0.0, ['D', 'Z']], [0.5, ['G']], [1.0, ['H', 'X']], [1.5, ['J']],
      [2.0, ['Q', 'C']], [2.5, ['W']], [3.0, ['E', 'V']], [3.5, ['R']],
      [4.0, ['T', 'B']], [4.5, ['E']], [5.0, ['W', 'N']], [5.5, ['Q']]
    ]
  },
  {
    id: 'dragonspine_snow',
    title: 'Moonlike Smile (Dragonspine Peak)',
    artist_or_game: 'Genshin Impact',
    category: 'Genshin Impact',
    bpm: 72,
    duration_seconds: 154,
    note_count: 630,
    recommended_transpose: 0,
    difficulty: 'Intermediate',
    accuracy: 85,
    is_favorite: false,
    chords: [
      [0.0, ['A', 'Z']], [0.8, ['D']], [1.6, ['G', 'X']], [2.4, ['J']],
      [3.2, ['Q', 'C']], [4.0, ['E', 'V']], [4.8, ['W', 'B']], [5.6, ['Q', 'N']]
    ]
  },
  {
    id: 'kamisato_ayaka',
    title: 'Shirasagi Himegimi (Ayaka Fan Dance)',
    artist_or_game: 'Genshin Impact',
    category: 'Genshin Impact',
    bpm: 78,
    duration_seconds: 135,
    note_count: 488,
    recommended_transpose: 0,
    difficulty: 'Intermediate',
    accuracy: 91,
    is_favorite: true,
    chords: [
      [0.0, ['Z', 'A', 'Q']], [0.6, ['W']], [1.2, ['E']], [1.8, ['R']],
      [2.4, ['T', 'S', 'X']], [3.0, ['E']], [3.6, ['W']], [4.2, ['Q']]
    ]
  },
  {
    id: 'sky_flight_theme',
    title: 'Flight of Eden (Valley of Triumph)',
    artist_or_game: 'Sky: Children of the Light',
    category: 'Sky: CotL',
    bpm: 104,
    duration_seconds: 140,
    note_count: 590,
    recommended_transpose: 2,
    difficulty: 'Intermediate',
    accuracy: 82,
    is_favorite: false,
    chords: [
      [0.0, ['A', 'D']], [0.4, ['G']], [0.8, ['J']], [1.2, ['Q']],
      [1.6, ['W', 'S']], [2.0, ['E']], [2.4, ['R']], [2.8, ['T', 'D']]
    ]
  },
  {
    id: 'canon_in_d',
    title: 'Pachelbel Canon in D (Arpeggio Lyre)',
    artist_or_game: 'Classical',
    category: 'Classical',
    bpm: 68,
    duration_seconds: 180,
    note_count: 940,
    recommended_transpose: -2,
    difficulty: 'Intermediate',
    accuracy: 96,
    is_favorite: true,
    chords: [
      [0.0, ['Z', 'A', 'Q']], [0.5, ['E']], [1.0, ['T']], [1.5, ['U']],
      [2.0, ['X', 'S', 'W']], [2.5, ['R']], [3.0, ['Y']], [3.5, ['I']]
    ]
  },
  {
    id: 'gurenge_demon_slayer',
    title: 'Gurenge (Demon Slayer Opening)',
    artist_or_game: 'Anime & OST',
    category: 'Anime & OST',
    bpm: 135,
    duration_seconds: 178,
    note_count: 1420,
    recommended_transpose: 1,
    difficulty: 'Master',
    accuracy: 73,
    is_favorite: false,
    chords: [
      [0.0, ['Q', 'T']], [0.22, ['W', 'Y']], [0.44, ['E', 'U']], [0.66, ['R']],
      [0.88, ['T', 'Q']], [1.1, ['Y', 'W']], [1.32, ['U', 'E']], [1.54, ['T']]
    ]
  },
  {
    id: 'river_flows_in_you',
    title: 'River Flows In You (Yiruma)',
    artist_or_game: 'Classical',
    category: 'Classical',
    bpm: 76,
    duration_seconds: 160,
    note_count: 720,
    recommended_transpose: 0,
    difficulty: 'Beginner',
    accuracy: 98,
    is_favorite: true,
    chords: [
      [0.0, ['A', 'Q']], [0.4, ['W']], [0.8, ['E']], [1.2, ['W']],
      [1.6, ['Q']], [2.0, ['J']], [2.4, ['H']], [2.8, ['G']]
    ]
  }
];
