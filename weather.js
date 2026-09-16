/* weather.js — 🌦️ Clima + ciclo día/noche para GEAYI: Obby Xtreme 3D
   - Ciclo día/noche de ~180s, solo avanza en MODE==='play'
   - Cielo (scene.background), niebla (scene.fog) y luces (hemisphere/directional
     de initThree en world.js) se modulan sin romper la escena del menú
   - Lluvia desactivada (molestaba en pantalla) y nieve (mundos 2 Dulce Hielo,
     8 Montaña Nevada) con THREE.Points, buffers prealocados, sin asignar
     objetos por frame
   - API: updateWeather(dt) (el loop la llama), Weather.isNight(),
     Weather.timeOfDay() (0..1)
   Contrato: solo usa los globales THREE, scene, camera, Player, MODE, LEVEL,
   levelTime. No toca otros archivos. */
'use strict';

const Weather = {
  t: 0.15,              // hora del día 0..1 (empieza de mañana)
  nightFactor: 0,       // 0 = día, 1 = noche plena
  CYCLE: 180,           // segundos por ciclo completo
  _idx: -1,             // último idx de nivel capturado
  _group: null,         // último LEVEL.group capturado
  _dir: null,           // DirectionalLight de initThree
  _hemi: null,          // HemisphereLight de initThree
  _lightsResolved: false,
  _baseBg: null,        // color base del cielo del nivel (THREE.Color)
  _baseFog: null,       // color base de la niebla del nivel (THREE.Color)
  _emissives: [],       // [{ m: material, base: intensity }] para brillo nocturno
  _sun: null, _moon: null,   // esferas del sol y la luna
  _rain: null, _snow: null,  // sistemas de partículas
  _pTime: 0,            // acumulador para el vaivén de la nieve

  isNight() { return this.nightFactor > 0.5; },
  timeOfDay() { return this.t; },
};

// ---- colores y temporales prealocados (nada se crea por frame) ----
const _W = {
  tmp: null, tmp2: null, tmp3: null,
  WHITE: null, ORANGE: null, NIGHTBLUE: null, NIGHTSKY: null,
  init() {
    this.tmp = new THREE.Color(); this.tmp2 = new THREE.Color(); this.tmp3 = new THREE.Color();
    this.WHITE = new THREE.Color(0xffffff);
    this.ORANGE = new THREE.Color(0xff8c42);   // tinte atardecer/amanecer
    this.NIGHTBLUE = new THREE.Color(0x8fb0ff);
    this.NIGHTSKY = new THREE.Color(0x0a1030);
  },
};

// ---- mundos con clima ----
const RAIN_WORLDS = [];   // lluvia desactivada (molestaba en pantalla)
const SNOW_WORLDS = [2, 8];   // 2 Dulce Hielo, 8 Montaña Nevada

function _weatherKind(idx) {
  if (RAIN_WORLDS.indexOf(idx) !== -1) return 'rain';
  if (SNOW_WORLDS.indexOf(idx) !== -1) return 'snow';
  return null;
}

// ---- utilidades sin asignación ----
function _sstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function _circDist(a, b) { const d = Math.abs(a - b) % 1; return d > 0.5 ? 1 - d : d; }

function _resolveLights() {
  if (Weather._lightsResolved || typeof scene === 'undefined') return;
  scene.traverse(o => {
    if (o.isDirectionalLight && !Weather._dir) Weather._dir = o;
    else if (o.isHemisphereLight && !Weather._hemi) Weather._hemi = o;
  });
  Weather._lightsResolved = true;
}

// ---- captura base del nivel (cielo, niebla, emisivos) ----
function _captureLevel(lvl) {
  Weather._idx = lvl.idx;
  Weather._group = lvl.group;
  if (!Weather._baseBg) { Weather._baseBg = new THREE.Color(); Weather._baseFog = new THREE.Color(); }
  if (scene.background && scene.background.isColor) Weather._baseBg.copy(scene.background);
  if (scene.fog && scene.fog.color) Weather._baseFog.copy(scene.fog.color);
  // recolectar materiales emisivos del nivel para intensificarlos de noche
  Weather._emissives.length = 0;
  const seen = new Set();
  lvl.group.traverse(o => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null;
    if (!mats) return;
    for (const m of mats) {
      if (!m || !m.emissive || seen.has(m)) continue;
      seen.add(m);
      if (m.emissive.getHex() !== 0x000000 && typeof m.emissiveIntensity === 'number') {
        Weather._emissives.push({ m, base: m.emissiveIntensity });
      }
    }
  });
}

// ---- sol y luna (esferas simples que orbitan sobre el jugador) ----
function _ensureSunMoon() {
  if (Weather._sun) return;
  const sunG = new THREE.SphereGeometry(3.2, 12, 12);
  Weather._sun = new THREE.Mesh(sunG, new THREE.MeshBasicMaterial({ color: 0xffd76a, fog: false }));
  const moonG = new THREE.SphereGeometry(2.3, 12, 12);
  Weather._moon = new THREE.Mesh(moonG, new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false }));
  Weather._sun.visible = Weather._moon.visible = false;
  scene.add(Weather._sun); scene.add(Weather._moon);
}

// ---- sistemas de partículas (lluvia / nieve) ----
const _P_COUNT = 120, _P_BOX = 30, _P_H = 20;

function _makePoints(color, opacity) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(_P_COUNT * 3);
  const phase = new Float32Array(_P_COUNT); // fase para el vaivén (nieve)
  for (let i = 0; i < _P_COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * _P_BOX;
    pos[i * 3 + 1] = Math.random() * _P_H;
    pos[i * 3 + 2] = (Math.random() - 0.5) * _P_BOX;
    phase[i] = Math.random() * Math.PI * 2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size: 0.15, transparent: true, opacity,
    depthWrite: false, sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.visible = false;
  pts.frustumCulled = false; // se mueve con el jugador; evitar culling erróneo
  scene.add(pts);
  return { pts, pos, phase, geo };
}

function _ensureParticles() {
  if (Weather._rain) return;
  Weather._rain = _makePoints(0x9fc8ff, 0.55);
  Weather._snow = _makePoints(0xffffff, 0.85);
}

function _updateParticles(sys, dt, kind, py) {
  const pos = sys.pos, ph = sys.phase;
  if (kind === 'rain') {
    const vy = 26 * dt, vx = 1.5 * dt; // lluvia rápida con leve viento
    for (let i = 0; i < _P_COUNT; i++) {
      const j = i * 3;
      pos[j + 1] -= vy;
      pos[j] += vx;
      if (pos[j + 1] < 0) {
        pos[j + 1] = _P_H;
        pos[j] = (Math.random() - 0.5) * _P_BOX;
        pos[j + 2] = (Math.random() - 0.5) * _P_BOX;
      }
      if (pos[j] > _P_BOX / 2) pos[j] -= _P_BOX;
    }
  } else { // snow: caída lenta con vaivén
    Weather._pTime += dt;
    const t = Weather._pTime, vy = 2.2 * dt;
    for (let i = 0; i < _P_COUNT; i++) {
      const j = i * 3;
      pos[j + 1] -= vy;
      pos[j] += Math.sin(t * 1.8 + ph[i]) * dt * 1.4;
      pos[j + 2] += Math.cos(t * 1.4 + ph[i]) * dt * 0.9;
      if (pos[j + 1] < 0) {
        pos[j + 1] = _P_H;
        pos[j] = (Math.random() - 0.5) * _P_BOX;
        pos[j + 2] = (Math.random() - 0.5) * _P_BOX;
      }
      if (pos[j] > _P_BOX / 2) pos[j] -= _P_BOX; else if (pos[j] < -_P_BOX / 2) pos[j] += _P_BOX;
      if (pos[j + 2] > _P_BOX / 2) pos[j + 2] -= _P_BOX; else if (pos[j + 2] < -_P_BOX / 2) pos[j + 2] += _P_BOX;
    }
  }
  sys.geo.attributes.position.needsUpdate = true;
}

/* ================= updateWeather(dt) — llamar cada frame desde el loop ================= */
function updateWeather(dt) {
  // Fuera de juego: ocultar todo y NO tocar cielo/luces (no romper el menú)
  if (typeof MODE === 'undefined' || MODE !== 'play' ||
      typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx == null) {
    if (Weather._sun) { Weather._sun.visible = false; Weather._moon.visible = false; }
    if (Weather._rain) { Weather._rain.pts.visible = false; Weather._snow.pts.visible = false; }
    return;
  }
  if (typeof THREE === 'undefined' || typeof scene === 'undefined') return;
  if (!_W.tmp) _W.init();
  _resolveLights();
  _ensureSunMoon();
  _ensureParticles();

  // El ciclo solo avanza jugando
  Weather.t = (Weather.t + dt / Weather.CYCLE) % 1;
  const t = Weather.t;

  // Nivel nuevo o reiniciado: recapturar colores base y emisivos
  if (LEVEL.idx !== Weather._idx || LEVEL.group !== Weather._group) _captureLevel(LEVEL);

  // Factores del ciclo: noche, atardecer, amanecer (0..1, sin asignación)
  const nf = _sstep(0.44, 0.54, t) * (1 - _sstep(0.86, 0.96, t));
  Weather.nightFactor = nf;
  const dusk = Math.max(0, 1 - _circDist(t, 0.475) / 0.09);
  const dawn = Math.max(0, 1 - _circDist(t, 0.955) / 0.09);
  const tint = Math.min(1, dusk + dawn) * 0.45;
  const light = 1 - 0.82 * nf;

  // Cielo: base del nivel oscurecida de noche + tinte naranja al atardecer/amanecer
  if (scene.background && scene.background.isColor) {
    _W.tmp.copy(Weather._baseBg).multiplyScalar(light);
    _W.tmp.lerp(_W.ORANGE, tint);
    scene.background.copy(_W.tmp);
  }
  // Niebla a juego
  if (scene.fog && scene.fog.color) {
    _W.tmp2.copy(Weather._baseFog).multiplyScalar(Math.min(1, light + 0.08));
    _W.tmp2.lerp(_W.ORANGE, tint * 0.6);
    scene.fog.color.copy(_W.tmp2);
  }

  // Luces de initThree(): intensidad y color según la hora
  if (Weather._dir) {
    Weather._dir.intensity = 0.12 + 0.78 * (1 - nf);
    _W.tmp3.copy(_W.WHITE).lerp(_W.ORANGE, tint);
    _W.tmp3.lerp(_W.NIGHTBLUE, nf * 0.7);
    Weather._dir.color.copy(_W.tmp3);
  }
  if (Weather._hemi) Weather._hemi.intensity = 0.25 + 0.5 * (1 - nf);

  // Emisivos del nivel (farolas, neones): brillan más de noche
  const boost = 1 + nf * 2;
  const em = Weather._emissives;
  for (let i = 0; i < em.length; i++) em[i].m.emissiveIntensity = em[i].base * boost;

  // Posición del jugador (fallback a la cámara si Player aún no existe)
  const px = (typeof Player !== 'undefined' && Player.pos) ? Player.pos.x : camera.position.x;
  const py = (typeof Player !== 'undefined' && Player.pos) ? Player.pos.y : camera.position.y;
  const pz = (typeof Player !== 'undefined' && Player.pos) ? Player.pos.z : camera.position.z;

  // Sol y luna orbitando sobre el jugador
  const ang = (t - 0.25) * Math.PI * 2; // t=0.25 → mediodía
  const sx = Math.cos(ang), sy = Math.sin(ang);
  Weather._sun.position.set(px + sx * 46, py + sy * 42 + 6, pz - 30);
  Weather._moon.position.set(px - sx * 46, py - sy * 42 + 6, pz - 30);
  Weather._sun.visible = sy > -0.12;
  Weather._moon.visible = sy < 0.12;

  // Clima del mundo actual, centrado en el jugador
  const kind = _weatherKind(LEVEL.idx);
  const rain = Weather._rain, snow = Weather._snow;
  rain.pts.visible = kind === 'rain';
  snow.pts.visible = kind === 'snow';
  if (kind === 'rain') {
    rain.pts.position.set(px, py - 4, pz);
    _updateParticles(rain, dt, 'rain', py);
  } else if (kind === 'snow') {
    snow.pts.position.set(px, py - 4, pz);
    _updateParticles(snow, dt, 'snow', py);
  }
}
