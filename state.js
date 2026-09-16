/* state.js — estado global del juego y guardado (listo para multijugador: aquí viviría el netcode) */
'use strict';

/* ---------------- utilidades ---------------- */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
function fmtTime(ms) {
  if (ms == null) return '—';
  const t = ms / 1000, m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t % 1) * 10);
  return m + ':' + String(s).padStart(2, '0') + '.' + d;
}
function shade(hex, amt) { // aclara/oscurece un color hex
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/* ---------------- guardado local ---------------- */
const SAVE_KEY = 'obbyXtreme3D_v1';
const DEFAULTS = { coins: 0, best: {}, unlocked: 1, hat: 'none', trail: 'none', body: '#ff5533', music: true, ownedHats: ['none'], ownedTrails: ['none'], familyChar: null, chute: false, fastMode: true /* 🚀 modo rápido activado por defecto para que no se pegue */, lots: {} /* 🪧 fase 2: lotes comprados: SAVE.lots[worldIdx][lotId] = {x,z,w,d,blocks:[]} */, creatorEarnings: 0 /* 🤖 agente GEAYI: monedas ganadas de visitas */, worlds: {} /* 🤖 agente GEAYI: mundos creados: SAVE.worlds[worldIdx:lotId] = {name, visits, lava, water} */, weapons: { owned: {}, equipped: null } /* 🔫 armas de juguete */, parental: { pin: null, weaponsLocked: true } /* 🔒 control parental */ };
let SAVE = loadSave();
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return Object.assign({}, DEFAULTS, JSON.parse(raw));
  } catch (e) {}
  return Object.assign({}, DEFAULTS);
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {}
}

/* ---------------- catálogo de tienda ---------------- */
const HATS = [
  { id: 'none',       name: 'Sin nada',   emoji: '🚫', price: 0   },
  { id: 'cap',        name: 'Gorra',      emoji: '🧢', price: 40  },
  { id: 'tophat',      name: 'Sombrero',   emoji: '🎩', price: 90  },
  { id: 'headphones', name: 'Audífonos',  emoji: '🎧', price: 120 },
  { id: 'crown',       name: 'Corona',     emoji: '👑', price: 200 },
];
const TRAILS = [
  { id: 'none',    name: 'Sin estela', emoji: '🚫', price: 0   },
  { id: 'sparkle', name: 'Destellos',  emoji: '✨', price: 60  },
  { id: 'fire',    name: 'Fuego',      emoji: '🔥', price: 120 },
  { id: 'rainbow', name: 'Arcoíris',   emoji: '🌈', price: 180 },
];
const BODY_COLORS = ['#ff5533', '#ff9d00', '#ffe95e', '#59d867', '#00c2a8', '#00a2ff', '#7b2fff', '#ff2fd6', '#ffffff', '#2b2f3a'];

/* =========================================================================
   
/* ---- estado de la partida ---- */
let LEVEL = { group: null };   // nivel actual
let MODE = 'menu';             // menu | levels | custom | play | pause | win
let levelTime = 0, coinsRun = 0, shakeT = 0, shakeMag = 0;
let respawn = { x: 0, y: 0, z: 0 };
let finished = false;
