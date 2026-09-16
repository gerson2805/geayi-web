/* audio.js — efectos procedurales y música con WebAudio */
'use strict';
const Audio2 = {
  ctx: null, musicTimer: null, musicStep: 0,
  init() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type, vol, when, slideTo) {
    if (!this.ctx) return;
    type = type || 'square'; vol = vol == null ? 0.18 : vol; when = when || 0;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, when) {
    if (!this.ctx) return;
    vol = vol == null ? 0.2 : vol; when = when || 0;
    const t = this.ctx.currentTime + when;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    s.connect(f); f.connect(g); g.connect(this.ctx.destination);
    s.start(t);
  },
  jump()  { if (!_gSfx()) return; this.tone(280, 0.16, 'triangle', 0.13, 0, 620); },
  coin()  { if (!_gSfx()) return; this.tone(988, 0.09, 'triangle', 0.11); this.tone(1319, 0.18, 'triangle', 0.11, 0.07); },
  check() { if (!_gSfx()) return; this.tone(523, 0.12, 'triangle', 0.2); this.tone(659, 0.12, 'triangle', 0.2, 0.1); this.tone(784, 0.22, 'triangle', 0.2, 0.2); },
  pad()   { if (!_gSfx()) return; this.tone(180, 0.25, 'sawtooth', 0.16, 0, 900); },
  fall()  { if (!_gSfx()) return; this.tone(320, 0.4, 'sawtooth', 0.16, 0, 70); this.noise(0.25, 0.25); },
  land()  { if (!_gSfx()) return; this.noise(0.08, 0.12); },
  click() { if (!uiOn()) return; this.tone(700, 0.05, 'triangle', 0.07); },
  /* FASE 3: sonidos educativos/amigables */
  power() { if (!_gSfx()) return; this.tone(440, 0.12, 'triangle', 0.14); this.tone(660, 0.12, 'triangle', 0.14, 0.1); this.tone(880, 0.2, 'triangle', 0.14, 0.2); },
  good()  { if (!_gSfx()) return; [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.16, i * 0.09)); },
  oops()  { if (!_gSfx()) return; this.tone(330, 0.15, 'sine', 0.13, 0, 260); },
  /* FASE 2: sonidos de vehículos y paracaídas */
  boost() { if (!_gSfx()) return; this.tone(200, 0.35, 'sawtooth', 0.16, 0, 880); this.noise(0.2, 0.12); },
  chute() { if (!_gSfx()) return; this.noise(0.45, 0.3); this.tone(500, 0.3, 'triangle', 0.1, 0.05, 900); },
  engineStart() {
    if (!_gSfx()) return;
    this.init();
    if (this._eng || !this.ctx) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 65; g.gain.value = 0.05;
      o.connect(g); g.connect(this.ctx.destination); o.start();
      this._eng = { o, g };
    } catch (e) { this._eng = null; }
  },
  engineSet(f) { // f: 0..1 intensidad
    if (this._eng && this.ctx) {
      try { this._eng.o.frequency.setTargetAtTime(55 + f * 110, this.ctx.currentTime, 0.12); } catch (e) {}
    }
  },
  engineStop() {
    if (this._eng) {
      try { this._eng.o.stop(); } catch (e) {}
      try { this._eng.o.disconnect(); this._eng.g.disconnect(); } catch (e) {}
      this._eng = null;
    }
  },
  buy()   { if (!_gSfx()) return; this.tone(784, 0.1, 'triangle', 0.13); this.tone(988, 0.1, 'triangle', 0.13, 0.08); this.tone(1175, 0.2, 'triangle', 0.13, 0.16); },
  deny()  { if (!_gSfx()) return; this.tone(200, 0.15, 'square', 0.14); this.tone(150, 0.2, 'square', 0.14, 0.1); },
  win() {
    if (!_gSfx()) return; const seq = [523, 659, 784, 1047, 784, 1047, 1319];
    seq.forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.15, i * 0.13));
    this.noise(0.8, 0.05, 0.2);
  },
  /* musiquita alegre en loop (ondas suaves: triangulo + seno, nada chillón) */
  startMusic() {
    if (!this.ctx || this.musicTimer || !SAVE.music) return;
    const bass = [131, 131, 175, 147, 131, 131, 196, 175]; // C C F D | C C G F (seno suave)
    const lead = [523, 659, 784, 659, 880, 784, 659, 587, 523, 659, 784, 880, 784, 659, 587, 523]; // melodía alegre
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (!SAVE.music) return;
      const s = this.musicStep % 16;
      this.tone(bass[Math.floor(s / 2)], 0.22, 'sine', 0.09);
      if (s % 2 === 0) this.tone(lead[s], 0.2, 'triangle', 0.05);
      if (s % 8 === 4) this.tone(lead[s] * 2, 0.12, 'sine', 0.02); // destello suave
      this.musicStep++;
    }, 225);
  },
  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
};
/* Preferencias del menú AJUSTES: cada sonido se apaga por separado */
function sfxOn() { try { if (typeof SAVE !== 'undefined' && SAVE.sfx === false) return false; } catch (e) {} return true; }
function uiOn() { try { if (typeof SAVE !== 'undefined' && SAVE.ui === false) return false; } catch (e) {} return true; }
function notifsOn() { try { if (typeof SAVE !== 'undefined' && SAVE.notifs === false) return false; } catch (e) {} return true; }
function _gSfx() { return sfxOn(); }
function updateMusicBtns() {
  const t = SAVE.music ? '🎵 Música: ON' : '🎵 Música: OFF';
  const hm = $('hud-music');
  if (hm) { hm.textContent = SAVE.music ? '🎵' : '🔇'; hm.style.opacity = SAVE.music ? 1 : 0.5; }
}
function toggleMusic() {
  Audio2.init();
  SAVE.music = !SAVE.music; persist();
  if (SAVE.music) Audio2.startMusic(); else Audio2.stopMusic();
  updateMusicBtns();
}
