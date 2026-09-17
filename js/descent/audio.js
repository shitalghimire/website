/* ═══════════════════════════════════════════════════════════════
   AUDIO — every sound in this game is synthesised at runtime.
   No audio files ship with the site.

   Two buses hang off a limiter so a big combo can never clip:
     music  — a step sequencer with layers that arm by intensity
     sfx    — one-shot voices

   The sequencer uses lookahead scheduling (schedule ~120ms of
   future notes every 25ms) rather than firing notes from timers.
   Timers drift; AudioContext time does not.
   ═══════════════════════════════════════════════════════════════ */

const PENT = [0, 3, 5, 7, 10];      /* minor pentatonic, in semitones */
const ROOT = 55;                     /* A1 */
const hz = (semi) => ROOT * Math.pow(2, semi / 12);

/* pattern banks — 16 steps per bar. 1 = hit, 2 = accent */
const KICK  = [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 1, 1, 0, 0, 0];
const SNARE = [0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 2, 0, 1, 0];
const HAT   = [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1];
const BASS  = [0, 0, 0, 3, 0, 0, 5, 0, 0, 0, 0, 3, 7, 0, 5, 3];
const ARP   = [0, 12, 15, 19, 15, 12, 19, 24, 15, 12, 10, 12, 15, 19, 22, 19];

export class Audio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    this.musicOn = true;

    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.noise = null;

    /* sequencer */
    this.step = 0;
    this.nextTime = 0;
    this.bpm = 128;
    this.intensity = 0;
    this.timer = 0;
    this.playing = false;
  }

  /* must be called from a real user gesture */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();

    /* limiter, so stacked voices stay civil */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 6;
    comp.ratio.value = 12;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;        /* faded in by setIntensity */
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.85;

    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(comp);
    comp.connect(ctx.destination);

    /* one shared noise buffer, looped by the voices that need it */
    const n = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    this.ready = true;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  setMusicEnabled(on) {
    this.musicOn = on;
    if (this.musicBus) {
      this.musicBus.gain.setTargetAtTime(this._musicGain(), this.ctx.currentTime, 0.2);
    }
  }

  _musicGain() {
    return this.musicOn ? 0.16 + this.intensity * 0.20 : 0;
  }

  /* ---------- voice helpers ---------- */
  _env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  _tone(bus, t, freq, dur, type, peak, endFreq) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (endFreq && endFreq !== freq) {
      o.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t + dur);
    }
    o.connect(g);
    g.connect(bus);
    this._env(g, t, Math.min(0.006, dur * 0.2), dur, peak);
    o.start(t);
    o.stop(t + dur + 0.04);
  }

  _noiseBurst(bus, t, dur, peak, filterType, f0, f1, q) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = filterType || 'bandpass';
    bp.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) bp.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    bp.Q.value = q == null ? 1.2 : q;
    const g = ctx.createGain();
    s.connect(bp);
    bp.connect(g);
    g.connect(bus);
    this._env(g, t, 0.002, dur, peak);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.04);
  }

  /* ═══════════════ SFX ═══════════════ */
  shot() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const f = 620 + Math.random() * 120;
    this._tone(this.sfxBus, t, f, 0.075, 'square', 0.16, f * 0.35);
    this._noiseBurst(this.sfxBus, t, 0.045, 0.10, 'highpass', 2600, 1400, 0.7);
  }

  dryFire() {
    if (!this.ready || this.muted) return;
    this._noiseBurst(this.sfxBus, this.ctx.currentTime, 0.05, 0.05, 'bandpass', 900, 500, 3);
  }

  kill(combo) {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    this._noiseBurst(this.sfxBus, t, 0.13, 0.20, 'bandpass', 1700, 320, 1.1);
    /* tonal ping climbs the pentatonic ladder as the combo grows */
    const i = Math.min(combo, 24);
    const semi = PENT[i % PENT.length] + 12 * (3 + Math.floor(i / PENT.length));
    this._tone(this.sfxBus, t, hz(semi), 0.16, 'triangle', 0.17);
    this._tone(this.sfxBus, t + 0.005, hz(semi + 12), 0.10, 'sine', 0.08);
  }

  stomp() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(this.sfxBus, t, 170, 0.16, 'sine', 0.30, 46);
    this._noiseBurst(this.sfxBus, t, 0.09, 0.16, 'lowpass', 1400, 300, 0.8);
  }

  gem(n) {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const semi = PENT[(n || 0) % PENT.length] + 60;
    this._tone(this.sfxBus, t, hz(semi), 0.10, 'sine', 0.13);
    this._tone(this.sfxBus, t + 0.03, hz(semi + 7), 0.09, 'sine', 0.07);
  }

  land(force) {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const p = Math.min(0.10 + force * 0.22, 0.34);
    this._tone(this.sfxBus, t, 120, 0.13, 'sine', p, 42);
    this._noiseBurst(this.sfxBus, t, 0.07, p * 0.5, 'lowpass', 900, 220, 0.8);
  }

  hurt() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(this.sfxBus, t, 320, 0.30, 'sawtooth', 0.22, 60);
    this._noiseBurst(this.sfxBus, t, 0.22, 0.16, 'bandpass', 800, 180, 0.9);
  }

  shield() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(this.sfxBus, t, 900, 0.22, 'triangle', 0.16, 1800);
    this._noiseBurst(this.sfxBus, t, 0.14, 0.08, 'highpass', 3000, 5000, 0.6);
  }

  /* the reward flourish when a combo is banked */
  bank(combo) {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    const n = Math.min(3 + Math.floor(combo / 3), 6);
    for (let i = 0; i < n; i++) {
      const semi = PENT[i % PENT.length] + 12 * (4 + Math.floor(i / PENT.length));
      this._tone(this.sfxBus, t + i * 0.045, hz(semi), 0.13, 'triangle', 0.12);
    }
  }

  perk() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    [0, 4, 7, 12].forEach((s, i) => {
      this._tone(this.sfxBus, t + i * 0.06, hz(s + 48), 0.28, 'triangle', 0.14);
    });
  }

  zone() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    this._noiseBurst(this.sfxBus, t, 0.7, 0.10, 'bandpass', 400, 4200, 2.5);
    this._tone(this.sfxBus, t, hz(36), 0.7, 'sine', 0.16, hz(48));
  }

  death() {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime;
    this._tone(this.sfxBus, t, 440, 1.1, 'sawtooth', 0.26, 40);
    this._tone(this.sfxBus, t + 0.05, 220, 1.0, 'square', 0.14, 30);
    this._noiseBurst(this.sfxBus, t, 0.8, 0.14, 'lowpass', 1800, 120, 0.7);
  }

  ui() {
    if (!this.ready || this.muted) return;
    this._tone(this.sfxBus, this.ctx.currentTime, 1100, 0.04, 'square', 0.07, 1500);
  }

  /* ═══════════════ MUSIC ═══════════════ */
  startMusic() {
    if (!this.ready || this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    const pump = () => {
      if (!this.playing) return;
      this._schedule();
      this.timer = setTimeout(pump, 25);
    };
    pump();
  }

  stopMusic() {
    this.playing = false;
    clearTimeout(this.timer);
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
  }

  /* the game calls this every frame; drives layers and tempo */
  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
    if (!this.ready) return;
    this.bpm = 124 + this.intensity * 26;
    this.musicBus.gain.setTargetAtTime(this._musicGain(), this.ctx.currentTime, 0.4);
  }

  _schedule() {
    const ctx = this.ctx;
    const spb = 60 / this.bpm / 4;        /* seconds per 16th */
    while (this.nextTime < ctx.currentTime + 0.12) {
      this._playStep(this.step, this.nextTime);
      this.nextTime += spb;
      this.step = (this.step + 1) % 16;
    }
  }

  _playStep(s, t) {
    if (!this.musicOn) return;
    const bus = this.musicBus;
    const I = this.intensity;

    /* kick — always there */
    if (KICK[s]) {
      const p = KICK[s] === 2 ? 0.55 : 0.36;
      this._tone(bus, t, 132, 0.15, 'sine', p, 40);
      this._noiseBurst(bus, t, 0.03, p * 0.25, 'lowpass', 700, 200, 0.7);
    }

    /* hats — open up as it gets faster */
    if (HAT[s] && I > 0.04) {
      this._noiseBurst(bus, t, 0.026 + I * 0.02, 0.05 + I * 0.05, 'highpass', 7000, 6000, 0.6);
    }

    /* bass — the spine of the track */
    if (BASS[s]) {
      const f = hz(BASS[s] + 12);
      this._tone(bus, t, f, 0.19, 'sawtooth', 0.18 + I * 0.10, f * 0.98);
    }

    /* snare — layer two */
    if (I > 0.28 && SNARE[s]) {
      const p = (SNARE[s] === 2 ? 0.17 : 0.10) * (0.6 + I * 0.6);
      this._noiseBurst(bus, t, 0.10, p, 'bandpass', 1900, 900, 0.9);
      this._tone(bus, t, 190, 0.07, 'triangle', p * 0.5, 150);
    }

    /* arpeggio — layer three, the part that makes it feel fast */
    if (I > 0.5) {
      this._tone(bus, t, hz(ARP[s] + 36), 0.085, 'square', 0.055 + (I - 0.5) * 0.09);
    }

    /* octave stab on the bar — top of the curve */
    if (I > 0.78 && (s === 0 || s === 8)) {
      this._tone(bus, t, hz(12), 0.34, 'sawtooth', 0.14);
      this._tone(bus, t, hz(24), 0.34, 'square', 0.06);
    }
  }
}
