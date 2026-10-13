/**
 * Zero-latency Web Audio API Lyre Synthesizer
 * Generates organic harp / bell harmonics with envelope shaping
 */

// Note to MIDI mappings for Genshin 21-key Lyre:
// Low: Z(C3), X(D3), C(E3), V(F3), B(G3), N(A3), M(B3)
// Mid: A(C4), S(D4), D(E4), F(F4), G(G4), H(A4), J(B4)
// High: Q(C5), W(D5), E(E5), R(F5), T(G5), Y(A5), U(B5)
const KEY_TO_SEMITONE: Record<string, number> = {
  Z: 48, X: 50, C: 52, V: 53, B: 55, N: 57, M: 59,
  A: 60, S: 62, D: 64, F: 65, G: 67, H: 69, J: 71,
  Q: 72, W: 74, E: 76, R: 77, T: 79, Y: 81, U: 83,
};

// Sky: Children of the Light (15 keys) mappings
const SKY_QWERT_TO_SEMITONE: Record<string, number> = {
  Q: 60, W: 62, E: 64, R: 65, T: 67,
  A: 69, S: 71, D: 72, F: 74, G: 76,
  Z: 77, X: 79, C: 81, V: 83, B: 84,
};

const SKY_STEAM_TO_SEMITONE: Record<string, number> = {
  Y: 60, U: 62, I: 64, O: 65, P: 67,
  H: 69, J: 71, K: 72, L: 74, ';': 76,
  N: 77, M: 79, ',': 81, '.': 83, '/': 84,
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class WebLyreSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  constructor() {
    // Lazy initialized on first user interaction to conform to browser autoplay policy
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public playKey(key: string, transpose: number = 0, instrument: 'genshin' | 'sky' | 'sky_steam' | 'vintage' = 'genshin') {
    const upperKey = key.toUpperCase();
    let baseMidi: number | undefined;
    if (instrument === 'sky') {
      baseMidi = SKY_QWERT_TO_SEMITONE[upperKey] ?? KEY_TO_SEMITONE[upperKey];
    } else if (instrument === 'sky_steam') {
      baseMidi = SKY_STEAM_TO_SEMITONE[key] ?? SKY_STEAM_TO_SEMITONE[upperKey] ?? KEY_TO_SEMITONE[upperKey];
    } else {
      baseMidi = KEY_TO_SEMITONE[upperKey];
    }
    if (baseMidi === undefined) return;

    this.playFrequency(midiToFreq(baseMidi + transpose), instrument);
  }

  public playFrequency(freq: number, instrument: 'genshin' | 'sky' | 'vintage' = 'genshin') {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Dual oscillator acoustic pluck emulation
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    if (instrument === 'sky') {
      // Bell-like pure sine with upper shimmer
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2.01, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3.5, now);
    } else if (instrument === 'vintage') {
      // Zither wooden resonance
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 1.5, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 2.2, now);
    } else {
      // Genshin Lyre: Crisp nylon harp attack with warm decay
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2.004, now); // subtle detune resonance
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(12000, freq * 4.5), now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.2), now + 1.2);
    }

    // Envelope shaping: Instant tactical attack (2ms), quick decay, natural ring-out
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.65);
    osc2.stop(now + 1.65);
  }
}

export const lyreSynth = new WebLyreSynth();
