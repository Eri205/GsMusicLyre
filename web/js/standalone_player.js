/**
 * web/js/standalone_player.js
 * Standalone Web Audio Player & Client-side MIDI/Sheet Parser for GsMusicLyre Mobile & PWA.
 * Enables 100% offline playback on phones, tablets, and browsers without Python backend.
 */

class StandaloneWebPlayer {
  constructor(synthesizer) {
    this.synth = synthesizer;
    this.currentSong = null;
    this.chords = [];
    this.duration = 0;
    this.currentTime = 0;
    this.speed = 1.0;
    this.transpose = 0;
    this.instrument = 'genshin';
    this.state = 'STOPPED'; // 'STOPPED', 'PLAYING', 'PAUSED'

    this.timerId = null;
    this.lastTickTime = 0;
    this.currentIndex = 0;

    // Callbacks
    this.onProgress = null; // (currentSec, totalSec, chordKeys) => void
    this.onStateChange = null; // (stateStr) => void
    this.onFinished = null; // () => void
  }

  loadSong(songItem, autoPlay = false) {
    this.stop();
    this.currentSong = songItem;
    this.duration = songItem.duration_seconds || 60;
    this.chords = (songItem.chords || []).slice().sort((a, b) => a[0] - b[0]);
    this.currentTime = 0;
    this.currentIndex = 0;

    if (autoPlay) {
      this.play(0);
    }

    return {
      duration: this.duration,
      recommended_transpose: songItem.recommended_transpose || 0
    };
  }

  play(startTime = null) {
    if (!this.currentSong || this.chords.length === 0) return;

    if (this.state === 'PAUSED' && startTime === null) {
      return this.resume();
    }

    this.stopPlaybackTimer();

    if (startTime !== null) {
      this.currentTime = Math.max(0, Math.min(this.duration, parseFloat(startTime)));
    } else if (this.currentTime >= this.duration) {
      this.currentTime = 0;
    }

    // Find starting chord index based on currentTime
    const effectiveTarget = this.currentTime;
    this.currentIndex = 0;
    for (let i = 0; i < this.chords.length; i++) {
      if (this.chords[i][0] >= effectiveTarget) {
        this.currentIndex = i;
        break;
      }
    }

    this.state = 'PLAYING';
    if (this.onStateChange) this.onStateChange('PLAYING');

    this.lastTickTime = performance.now();
    this.startPlaybackLoop();
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.stopPlaybackTimer();
    if (this.onStateChange) this.onStateChange('PAUSED');
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.lastTickTime = performance.now();
    this.startPlaybackLoop();
    if (this.onStateChange) this.onStateChange('PLAYING');
  }

  stop() {
    this.state = 'STOPPED';
    this.stopPlaybackTimer();
    this.currentTime = 0;
    this.currentIndex = 0;
    if (this.onStateChange) this.onStateChange('STOPPED');
    if (this.onProgress) this.onProgress(0, this.duration, []);
  }

  seek(seconds) {
    const target = Math.max(0, Math.min(this.duration, parseFloat(seconds)));
    this.currentTime = target;

    // Reposition chord index
    this.currentIndex = this.chords.length;
    for (let i = 0; i < this.chords.length; i++) {
      if (this.chords[i][0] >= target) {
        this.currentIndex = i;
        break;
      }
    }

    if (this.onProgress) {
      this.onProgress(this.currentTime, this.duration, []);
    }
  }

  setSpeed(speedVal) {
    this.speed = Math.max(0.2, Math.min(3.0, parseFloat(speedVal) || 1.0));
  }

  setTranspose(semitones) {
    this.transpose = parseInt(semitones, 10) || 0;
  }

  setInstrument(inst) {
    this.instrument = inst;
  }

  startPlaybackLoop() {
    const tick = () => {
      if (this.state !== 'PLAYING') return;

      const now = performance.now();
      const dt = (now - this.lastTickTime) / 1000.0;
      this.lastTickTime = now;

      // Advance virtual song time using speed factor
      this.currentTime += dt * this.speed;

      // Check if finished
      if (this.currentTime >= this.duration) {
        this.currentTime = this.duration;
        this.stop();
        if (this.onFinished) this.onFinished();
        return;
      }

      // Trigger all chords whose timestamp has been reached
      let activeKeys = [];
      while (this.currentIndex < this.chords.length) {
        const chord = this.chords[this.currentIndex];
        const chordTime = chord[0];
        const chordKeys = chord[1];

        if (chordTime <= this.currentTime) {
          if (chordKeys && chordKeys.length > 0) {
            chordKeys.forEach((keyChar) => {
              this.synth.playKey(keyChar);
            });
            activeKeys = activeKeys.concat(chordKeys);
          }
          this.currentIndex++;
        } else {
          break;
        }
      }

      // Dispatch UI update
      if (this.onProgress) {
        this.onProgress(this.currentTime, this.duration, activeKeys);
      }

      this.timerId = requestAnimationFrame(tick);
    };

    this.timerId = requestAnimationFrame(tick);
  }

  stopPlaybackTimer() {
    if (this.timerId) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
  }
}

// ------------------------------------------------------------------
// Lightweight In-Browser MIDI & Text Sheet Parser
// ------------------------------------------------------------------
class ClientSheetParser {
  static parseTextSheet(text, title = 'Custom Sheet') {
    const trimmedRaw = text.trim();

    // 1. Check if JSON (Sky Studio / Specy sheet format)
    if (trimmedRaw.startsWith('{') || trimmedRaw.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmedRaw);
        const obj = Array.isArray(parsed) ? parsed[0] : parsed;
        if (obj && (obj.songNotes || obj.notes)) {
          const notesArr = obj.songNotes || obj.notes;
          const bpm = obj.bpm || 120;
          const chordsMap = new Map();
          const skyKeyMap = ["Q", "W", "E", "R", "T", "A", "S", "D", "F", "G", "Z", "X", "C", "V", "B"];

          for (const item of notesArr) {
            const tMs = item.time || 0;
            const tSec = Math.round((tMs / 1000.0) * 1000) / 1000;
            let key = String(item.key || '');
            const m = key.match(/Key(\d+)/i);
            if (m) {
              const idx = parseInt(m[1], 10);
              key = skyKeyMap[idx % 15] || "Q";
            } else if (key.match(/^[ABC][1-5]$/i)) {
              key = key.toUpperCase();
            } else if (key.match(/^\d+$/)) {
              const num = parseInt(key, 10);
              key = skyKeyMap[(num - 1) % 15] || "Q";
            }
            if (!chordsMap.has(tSec)) chordsMap.set(tSec, []);
            chordsMap.get(tSec).push(key);
          }
          const chords = Array.from(chordsMap.entries()).sort((a, b) => a[0] - b[0]);
          const duration = chords.length > 0 ? chords[chords.length - 1][0] + 1.2 : 10.0;
          return {
            id: (obj.name || title).replace(/\.[^/.]+$/, ''),
            title: (obj.name || title).replace(/\.[^/.]+$/, ''),
            artist_or_game: 'Sky Studio',
            category: 'Sky COTL',
            bpm: Math.round(bpm),
            duration_seconds: Math.round(duration * 10) / 10,
            note_count: chords.reduce((acc, c) => acc + c[1].length, 0),
            recommended_transpose: 0,
            chords: chords
          };
        }
      } catch (e) {
        // Fall back to text parsing
      }
    }

    // 2. Parse Plain Text / ABC / Jianpu / Macro sheet
    const lines = text.split('\n');
    let bpm = 120;
    let cleanLines = [];

    // Parse header lines if any
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.toLowerCase().startsWith('bpm:') || line.toLowerCase().startsWith('tempo:')) {
        const parsedBpm = parseFloat(line.split(':')[1]);
        if (!isNaN(parsedBpm) && parsedBpm > 20) bpm = parsedBpm;
      } else if (!line.startsWith('#') && !line.startsWith('//')) {
        cleanLines.push(line);
      }
    }

    const fullContent = cleanLines.join(' ');
    // Match chords [QET] or [A1 A3 B1], Sky ABC tokens (A1..C5), numbers 1..15, single letters, or -
    const tokens = fullContent.match(/\[[^\]]+\]|[A-C][1-5]|\b(?:1[0-5]|[1-9])\b|[A-Za-z]|-|\s+/g) || [];
    const chords = [];
    const secondsPerBeat = 60.0 / bpm;
    const stepDuration = secondsPerBeat / 2.0; // standard 8th note spacing
    let curTime = 0.0;
    const skyNumToKey = ["Q", "W", "E", "R", "T", "A", "S", "D", "F", "G", "Z", "X", "C", "V", "B"];

    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed) {
        curTime += stepDuration;
        continue;
      }
      if (trimmed === '-') {
        curTime += stepDuration;
        continue;
      }

      let keys = [];
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const inner = trimmed.slice(1, -1).trim();
        const subTokens = inner.split(/\s+/);
        if (subTokens.length > 1) {
          keys = subTokens.map(s => s.toUpperCase());
        } else {
          keys = inner.toUpperCase().split('');
        }
      } else if (trimmed.match(/^[A-C][1-5]$/i)) {
        keys = [trimmed.toUpperCase()];
      } else if (trimmed.match(/^\d+$/)) {
        const n = parseInt(trimmed, 10);
        keys = [skyNumToKey[(n - 1) % 15] || "Q"];
      } else {
        keys = trimmed.toUpperCase().split('');
      }

      if (keys.length > 0) {
        chords.push([Math.round(curTime * 1000) / 1000, keys]);
      }
      curTime += stepDuration;
    }

    const duration = Math.max(2.0, curTime);
    return {
      id: title.replace(/\.[^/.]+$/, ''),
      title: title.replace(/\.[^/.]+$/, ''),
      artist_or_game: 'Custom Sheet',
      category: 'Custom',
      bpm: Math.round(bpm),
      duration_seconds: Math.round(duration * 10) / 10,
      note_count: chords.reduce((acc, c) => acc + c[1].length, 0),
      recommended_transpose: 0,
      chords: chords
    };
  }

  static parseMidiBuffer(arrayBuffer, filename = 'Imported_MIDI') {
    const data = new DataView(arrayBuffer);
    let offset = 0;

    function readStr(len) {
      let str = '';
      for (let i = 0; i < len; i++) {
        str += String.fromCharCode(data.getUint8(offset++));
      }
      return str;
    }

    // Verify 'MThd'
    if (readStr(4) !== 'MThd') {
      throw new Error('Not a valid MIDI file header');
    }

    offset += 4; // skip length 6
    const format = data.getUint16(offset); offset += 2;
    const numTracks = data.getUint16(offset); offset += 2;
    const timeDivision = data.getUint16(offset); offset += 2;
    const isDivisionInTicks = (timeDivision & 0x8000) === 0;
    const ticksPerBeat = isDivisionInTicks ? timeDivision : 480;

    // Natural diatonic pitch classes in C Major / A Minor
    const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);
    const NEAREST_NATURAL_CLASS = { 1: 0, 3: 2, 6: 5, 8: 7, 10: 9 };

    // Mapping MIDI pitch -> Genshin key (48: C3 to 83: B5)
    const MIDI_TO_GENSHIN = {
      48: 'Z', 50: 'X', 52: 'C', 53: 'V', 55: 'B', 57: 'N', 59: 'M',
      60: 'A', 62: 'S', 64: 'D', 65: 'F', 67: 'G', 69: 'H', 71: 'J',
      72: 'Q', 74: 'W', 76: 'E', 77: 'R', 79: 'T', 81: 'Y', 83: 'U'
    };

    const allEvents = []; // { ticks, type, data }

    for (let t = 0; t < numTracks; t++) {
      if (offset >= data.byteLength) break;
      const chunkType = readStr(4);
      const chunkLen = data.getUint32(offset); offset += 4;
      if (chunkType !== 'MTrk') {
        offset += chunkLen;
        continue;
      }

      const trackEnd = offset + chunkLen;
      let trackTicks = 0;
      let runningStatus = 0;

      while (offset < trackEnd) {
        // Read variable-length delta time
        let delta = 0;
        let byte = 0;
        do {
          byte = data.getUint8(offset++);
          delta = (delta << 7) | (byte & 0x7f);
        } while (byte & 0x80);

        trackTicks += delta;

        let statusByte = data.getUint8(offset);
        if (statusByte >= 0x80) {
          offset++;
          runningStatus = statusByte;
        } else {
          statusByte = runningStatus;
        }

        const eventType = statusByte >> 4;
        const channel = statusByte & 0x0F;

        if (eventType === 0x9) {
          // Note On
          const note = data.getUint8(offset++);
          const velocity = data.getUint8(offset++);
          if (velocity > 0) {
            allEvents.push({ ticks: trackTicks, type: 'note_on', note: note, velocity: velocity, channel: channel, track: t });
          }
        } else if (eventType === 0x8) {
          // Note Off
          offset += 2;
        } else if (eventType === 0xA || eventType === 0xB || eventType === 0xE) {
          offset += 2;
        } else if (eventType === 0xC || eventType === 0xD) {
          offset += 1;
        } else if (statusByte === 0xFF) {
          // Meta Event
          const metaType = data.getUint8(offset++);
          let metaLen = 0;
          let mByte = 0;
          do {
            mByte = data.getUint8(offset++);
            metaLen = (metaLen << 7) | (mByte & 0x7f);
          } while (mByte & 0x80);

          if (metaType === 0x51 && metaLen === 3) {
            // Set Tempo
            const tempoVal = (data.getUint8(offset) << 16) | (data.getUint8(offset + 1) << 8) | data.getUint8(offset + 2);
            allEvents.push({ ticks: trackTicks, type: 'set_tempo', tempo: tempoVal });
          }
          offset += metaLen;
        } else if (statusByte === 0xF0 || statusByte === 0xF7) {
          // SysEx
          let sysLen = 0;
          let sByte = 0;
          do {
            sByte = data.getUint8(offset++);
            sysLen = (sysLen << 7) | (sByte & 0x7f);
          } while (sByte & 0x80);
          offset += sysLen;
        }
      }
    }

    // Sort all events by ticks, prioritizing tempo changes
    allEvents.sort((a, b) => {
      if (a.ticks !== b.ticks) return a.ticks - b.ticks;
      return a.type === 'set_tempo' ? -1 : 1;
    });

    // Dynamic Tempo timeline to seconds conversion
    let curTicks = 0;
    let curSec = 0.0;
    let tempoMicros = 500000; // default 120 bpm
    let dominantBpm = 120.0;
    let bpmRecorded = false;
    const rawNotes = [];

    for (const ev of allEvents) {
      const delta = ev.ticks - curTicks;
      if (delta > 0) {
        curSec += (delta * tempoMicros) / (ticksPerBeat * 1000000.0);
        curTicks = ev.ticks;
      }

      if (ev.type === 'set_tempo') {
        tempoMicros = ev.tempo;
        const curBpm = Math.round((60000000.0 / tempoMicros) * 10) / 10;
        if (!bpmRecorded) {
          dominantBpm = curBpm;
          bpmRecorded = true;
        }
      } else if (ev.type === 'note_on') {
        rawNotes.push({
          time: curSec,
          pitch: ev.note,
          velocity: ev.velocity,
          channel: ev.channel
        });
      }
    }

    // Filter out drum channel (channel 9) unless only channel 9 exists
    const hasMelodic = rawNotes.some(n => n.channel !== 9);
    const melodicNotes = hasMelodic ? rawNotes.filter(n => n.channel !== 9) : rawNotes;

    // Calculate Best Transpose (-12 to +12)
    let bestShift = 0;
    let bestScore = -1e9;
    for (let shift = -12; shift <= 12; shift++) {
      let naturalCount = 0;
      let inRangeCount = 0;
      let foldedDownCount = 0;

      for (const n of melodicNotes) {
        const shifted = n.pitch + shift;
        if (NATURAL_PITCH_CLASSES.has(((shifted % 12) + 12) % 12)) {
          naturalCount++;
        }
        if (shifted >= 48 && shifted <= 83) {
          inRangeCount++;
        } else if (shifted > 83) {
          foldedDownCount++;
        }
      }

      const score = (naturalCount * 1000) - (foldedDownCount * 30) + (inRangeCount * 2) - (Math.abs(shift) * 3) + (shift === 0 ? 50 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestShift = shift;
      }
    }

    // Process Playable Notes with nearest accidental mapping and octave folding
    const playableNotes = [];
    for (const n of melodicNotes) {
      let p = n.pitch + bestShift;
      let pc = ((p % 12) + 12) % 12;

      if (!NATURAL_PITCH_CLASSES.has(pc)) {
        const targetClass = NEAREST_NATURAL_CLASS[pc] !== undefined ? NEAREST_NATURAL_CLASS[pc] : pc;
        p += targetClass - pc;
      }

      while (p < 48) p += 12;
      while (p > 83) p -= 12;

      const key = MIDI_TO_GENSHIN[p];
      if (key) {
        playableNotes.push({
          timestamp: n.time,
          key: key,
          pitch: p
        });
      }
    }

    playableNotes.sort((a, b) => a.timestamp - b.timestamp);

    // Build chords without swallowing notes (16ms tolerance + micro-stagger for rapid repeats)
    const chords = [];
    if (playableNotes.length > 0) {
      let curChordTime = playableNotes[0].timestamp;
      let curKeys = [];
      let curNotes = [];

      function commitChord(ts, kList, nList) {
        const sorted = nList.slice().sort((a, b) => a.pitch - b.pitch);
        const ordered = Array.from(new Set(sorted.map(x => x.key).filter(k => kList.includes(k))));
        const finalKeys = ordered.length > 6 ? ordered.slice(0, 2).concat(ordered.slice(-4)) : ordered;
        chords.push([Math.round(ts * 1000) / 1000, finalKeys]);
      }

      for (const pn of playableNotes) {
        const dt = pn.timestamp - curChordTime;
        if (dt <= 0.016 && !curKeys.includes(pn.key)) {
          curKeys.push(pn.key);
          curNotes.push(pn);
        } else if (dt <= 0.016 && curKeys.includes(pn.key) && dt >= 0.005) {
          if (curKeys.length > 0) commitChord(curChordTime, curKeys, curNotes);
          curChordTime = Math.max(pn.timestamp, curChordTime + 0.022);
          curKeys = [pn.key];
          curNotes = [pn];
        } else if (dt > 0.016) {
          if (curKeys.length > 0) commitChord(curChordTime, curKeys, curNotes);
          curChordTime = pn.timestamp;
          curKeys = [pn.key];
          curNotes = [pn];
        }
      }

      if (curKeys.length > 0) {
        commitChord(curChordTime, curKeys, curNotes);
      }
    }

    const duration = chords.length > 0 ? chords[chords.length - 1][0] + 1.2 : 30.0;
    const title = filename.replace(/\.[^/.]+$/, '');

    return {
      id: title,
      title: title,
      artist_or_game: 'Mobile Imported',
      category: 'Custom',
      bpm: Math.round(dominantBpm) || 120,
      duration_seconds: Math.round(duration * 10) / 10,
      note_count: playableNotes.length,
      recommended_transpose: bestShift,
      chords: chords,
      events: chords.map(c => ({ time: c[0], notes: c[1] }))
    };
  }
}

// Export to window for global access
window.StandaloneWebPlayer = StandaloneWebPlayer;
window.ClientSheetParser = ClientSheetParser;
